import type { Provider } from 'next-auth/providers';

/**
 * Picks the Auth.js providers for the current mode. In demo mode Google is
 * dropped, so the demo instance needs no Google credentials (Auth.js reads
 * AUTH_GOOGLE_* only for providers in the list) and offers no login path the
 * back refuses anyway (R8, R9).
 *
 * Lives outside auth.ts because Jest cannot import auth.ts (NextAuth v5 is
 * ESM-only); the Provider import is type-only and erased at compile time.
 */
export function selectAuthProviders(
  demoMode: boolean,
  providers: { google: Provider; credentials: Provider },
): Provider[] {
  return demoMode
    ? [providers.credentials]
    : [providers.google, providers.credentials];
}
