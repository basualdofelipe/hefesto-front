'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function apiClientFetch<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      // JWT expired — redirect to login for re-authentication
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Sesion expirada');
    }

    if (res.status === 403) {
      throw new Error('No tenes permisos para realizar esta accion');
    }

    const error = await res
      .json()
      .catch(() => ({ message: `Error ${res.status}` }));
    throw new Error(error.message ?? `API error: ${res.status}`);
  }

  // 204 No Content (or any response without a body) has no JSON to parse.
  // Without this guard, res.json() throws SyntaxError on empty body and the
  // caller sees a misleading "Unexpected end of JSON input" toast even
  // though the request succeeded server-side (typical for DELETE endpoints
  // annotated with @HttpCode(204) in the Nest backend).
  const contentLength = res.headers.get('content-length');
  if (res.status === 204 || contentLength === '0') {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}
