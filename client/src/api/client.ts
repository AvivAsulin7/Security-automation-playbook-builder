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

type RequestOptions = {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
};

type ErrorBody = { error?: { code?: string; message?: string; details?: ApiErrorDetail[] } };

const TOKEN_KEY = 'playbook-builder.token';

// localStorage can throw (private mode, blocked storage); treat that as "no token".
export const tokenStorage = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Storage unavailable; the session lasts for this page load only.
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Nothing to clear.
    }
  },
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
  const token = tokenStorage.get();
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
