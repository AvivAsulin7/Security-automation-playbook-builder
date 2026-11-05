import type { User } from '../types';

export type ApiErrorDetail = { field: string; message: string };

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: ApiErrorDetail[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Normalizes anything thrown by a request into an ApiError with a user-facing message. */
export function toApiError(error: unknown): ApiError {
  return error instanceof ApiError
    ? error
    : new ApiError(0, 'UNKNOWN_ERROR', 'Something went wrong. Please try again.');
}

/** Maps server validation details onto form fields; nested paths like `actions.0` map to `actions`. */
export function fieldErrorsFrom<K extends string>(
  error: ApiError,
  fields: readonly K[],
): Partial<Record<K, string>> {
  const errors: Partial<Record<K, string>> = {};
  for (const { field, message } of error.details) {
    const key = field.split('.')[0] as K;
    if (fields.includes(key)) errors[key] ??= message;
  }
  return errors;
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  /** Send the stored bearer token (default). Login/register pass `false`. */
  auth?: boolean;
};

type ErrorBody = { error?: { code?: string; message?: string; details?: ApiErrorDetail[] } };

// localStorage can throw (private mode, blocked storage); treat that as "no session".
function storageItem(key: string) {
  return {
    read(): string | null {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    write(value: string): void {
      try {
        localStorage.setItem(key, value);
      } catch {
        // Storage unavailable; the session lasts for this page load only.
      }
    },
    remove(): void {
      try {
        localStorage.removeItem(key);
      } catch {
        // Nothing to clear.
      }
    },
  };
}

const tokenItem = storageItem('playbook-builder.token');
const userItem = storageItem('playbook-builder.user');

export const tokenStorage = {
  get: tokenItem.read,
  set: tokenItem.write,
  clear: tokenItem.remove,
};

// Stored alongside the token so the signed-in email survives a page refresh.
export const userStorage = {
  get(): User | null {
    try {
      const value: unknown = JSON.parse(userItem.read() ?? 'null');
      if (value && typeof value === 'object' && 'id' in value && 'email' in value) {
        const { id, email } = value;
        if (typeof id === 'string' && typeof email === 'string') return { id, email };
      }
    } catch {
      // Corrupt data: treat as signed out.
    }
    return null;
  },
  set: (user: User): void => userItem.write(JSON.stringify(user)),
  clear: userItem.remove,
};

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

function apiBaseUrl(): string {
  const url = import.meta.env.VITE_API_URL;
  if (!url) throw new Error('VITE_API_URL is not set; copy client/.env.example to client/.env');
  return url;
}

async function readJson<T>(response: Response): Promise<T | undefined> {
  try {
    return (await response.json()) as T;
  } catch {
    return undefined;
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = options.auth === false ? null : tokenStorage.get();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  // Resolved outside the try so a missing VITE_API_URL is reported as a setup error, not a network error.
  const url = `${apiBaseUrl()}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError(0, 'NETWORK_ERROR', 'Unable to reach the server. Please try again.');
  }

  if (!response.ok) {
    const error = (await readJson<ErrorBody>(response))?.error;
    // A 401 without a token (e.g. wrong login credentials) is a normal error, not a session expiry.
    if (response.status === 401 && token) onUnauthorized?.();
    throw new ApiError(
      response.status,
      error?.code ?? 'UNKNOWN_ERROR',
      error?.message ?? 'Something went wrong. Please try again.',
      error?.details ?? [],
    );
  }

  if (response.status === 204) return undefined as T;

  const data = await readJson<T>(response);
  if (data === undefined) {
    throw new ApiError(response.status, 'INVALID_RESPONSE', 'The server returned an invalid response.');
  }
  return data;
}
