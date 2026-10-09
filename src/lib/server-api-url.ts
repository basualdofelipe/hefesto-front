// Server-only resolver of the backend base URL (route handlers, server
// components, server actions). The browser keeps using api-client.ts, which
// talks to the public URL. No node: imports: auth.ts pulls this into the
// middleware bundle.

export class ApiUrlNotConfiguredError extends Error {
  constructor() {
    super(
      'Backend API URL is not configured (API_INTERNAL_URL or the public API URL)',
    );
    this.name = 'ApiUrlNotConfiguredError';
  }
}

/**
 * Read at call time, never at module load. The internal URL is a runtime value
 * of the standalone server (e.g. the back over the Docker network); the public
 * URL is inlined by next build, so it must stay a literal member access.
 */
export function getServerApiUrl(): string {
  const internalUrl = process.env.API_INTERNAL_URL?.trim();
  if (internalUrl) return internalUrl;

  const publicUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (publicUrl) return publicUrl;

  throw new ApiUrlNotConfiguredError();
}
