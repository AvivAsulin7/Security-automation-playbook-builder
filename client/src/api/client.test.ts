import { describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest, fieldErrorsFrom, setUnauthorizedHandler, tokenStorage } from './client';

function mockFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const unauthorizedBody = { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } };

describe('fieldErrorsFrom', () => {
  it('maps details to the requested fields, collapsing nested paths and keeping the first message', () => {
    const error = new ApiError(400, 'VALIDATION_ERROR', 'Invalid request', [
      { field: 'actions.0', message: 'Invalid option' },
      { field: 'actions', message: 'Second message' },
      { field: 'name', message: 'Name is required' },
      { field: 'other', message: 'Ignored' },
    ]);

    expect(fieldErrorsFrom(error, ['name', 'actions'] as const)).toEqual({
      actions: 'Invalid option',
      name: 'Name is required',
    });
  });
});

describe('apiRequest', () => {
  it('does not send the stored token when auth is false, and a 401 does not trigger logout', async () => {
    tokenStorage.set('other-tab-token');
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    const fetchMock = mockFetch(jsonResponse(401, unauthorizedBody));

    await expect(
      apiRequest('/auth/login', { method: 'POST', body: { email: 'a@b.co', password: 'x' }, auth: false }),
    ).rejects.toMatchObject({ status: 401 });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(tokenStorage.get()).toBe('other-tab-token');
  });

  it('sends a JSON body with the bearer token to the configured API URL', async () => {
    tokenStorage.set('token-123');
    const fetchMock = mockFetch(jsonResponse(200, { ok: true }));

    const result = await apiRequest<{ ok: boolean }>('/playbooks', {
      method: 'POST',
      body: { name: 'x' },
    });

    expect(result).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://api.test/playbooks');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ name: 'x' }));
    expect(init.headers).toEqual({
      Authorization: 'Bearer token-123',
      'Content-Type': 'application/json',
    });
  });

  it('omits the Authorization header when there is no token', async () => {
    const fetchMock = mockFetch(jsonResponse(200, {}));

    await apiRequest('/playbooks');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toEqual({});
  });

  it('returns undefined for 204 responses', async () => {
    mockFetch(new Response(null, { status: 204 }));

    await expect(apiRequest('/playbooks/1', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('throws ApiError with the contract code, message and details', async () => {
    mockFetch(
      jsonResponse(400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request',
          details: [{ field: 'name', message: 'Required' }],
        },
      }),
    );

    const error = await apiRequest('/playbooks').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid request',
      details: [{ field: 'name', message: 'Required' }],
    });
  });

  it('calls the unauthorized handler on 401 when a token was sent', async () => {
    tokenStorage.set('expired-token');
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    mockFetch(jsonResponse(401, unauthorizedBody));

    await expect(apiRequest('/playbooks')).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it('does not call the unauthorized handler on 401 without a token (failed login)', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    mockFetch(jsonResponse(401, unauthorizedBody));

    await expect(
      apiRequest('/auth/login', { method: 'POST', body: { email: 'a@b.c', password: 'x' } }),
    ).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('maps network failures to a NETWORK_ERROR ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(apiRequest('/playbooks')).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    });
  });

  it('rethrows aborts instead of reporting a network error', async () => {
    const controller = new AbortController();
    controller.abort();
    const abortError = new DOMException('Aborted', 'AbortError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));

    await expect(apiRequest('/playbooks', { signal: controller.signal })).rejects.toBe(abortError);
  });

  it('uses a generic message when the error body is not JSON', async () => {
    mockFetch(new Response('Bad gateway', { status: 502 }));

    await expect(apiRequest('/playbooks')).rejects.toMatchObject({
      status: 502,
      code: 'UNKNOWN_ERROR',
    });
  });

  it('reports a missing VITE_API_URL as a setup error, not a network error', async () => {
    vi.stubEnv('VITE_API_URL', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRequest('/playbooks')).rejects.toThrow('VITE_API_URL is not set');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws INVALID_RESPONSE when a success body is not JSON', async () => {
    mockFetch(new Response('not json', { status: 200 }));

    await expect(apiRequest('/playbooks')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
});
