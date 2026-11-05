import { useState } from 'react';
import { toApiError, type ApiError } from '../api/client';

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

/** Wraps a user-triggered request (login, create, delete, simulate) with pending and error state. */
export function useAsyncAction<Args extends unknown[], T>(action: (...args: Args) => Promise<T>) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function run(...args: Args): Promise<ActionResult<T>> {
    setIsPending(true);
    setError(null);
    try {
      return { ok: true, data: await action(...args) };
    } catch (caught) {
      const apiError = toApiError(caught);
      setError(apiError);
      return { ok: false, error: apiError };
    } finally {
      setIsPending(false);
    }
  }

  return { run, isPending, error, clearError: () => setError(null) };
}
