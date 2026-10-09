import { auth } from '@/auth';
import { getServerApiUrl } from '@/lib/server-api-url';

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const session = await auth();

  if (!session?.accessToken) {
    throw new Error('No authenticated session');
  }

  const res = await fetch(`${getServerApiUrl()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}
