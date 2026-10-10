import type { ApiResult } from './alert';

export function jsonRequest(method: string, body?: unknown): RequestInit {
  const init: RequestInit = { method };

  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }

  return init;
}

/**
 * Performs a fetch and returns the parsed JSON body.
 * Throws the parsed body (not an Error) when the response is not ok or
 * `success === false`, so callers can pass it straight to `showAlert`.
 *
 * @param tolerant when true, a non-JSON body is treated as an empty object.
 */
export async function requestJson<T extends ApiResult = ApiResult>(
  url: string,
  init: RequestInit = {},
  tolerant = false
): Promise<T> {
  const response = await fetch(url, init);
  const result = (tolerant ? await response.json().catch(() => ({})) : await response.json()) as T;

  if (!response.ok || result.success === false) {
    throw result;
  }

  return result;
}
