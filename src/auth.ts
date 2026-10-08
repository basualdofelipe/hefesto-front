import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import type { Permissions } from '@/types/permissions';
import { NO_PERMISSIONS } from '@/types/permissions';
import { isDemoMode } from '@/constants/demo';
import { selectAuthProviders } from '@/lib/auth-providers';

interface BackendAuthResponse {
  data: {
    accessToken: string;
    user: {
      id: string;
      email: string;
      permissions: Permissions;
      name: string | null;
      pictureUrl: string | null;
    };
  };
}

const credentials = Credentials({
  credentials: { email: { type: 'text' } },
  async authorize(credentials): Promise<{
    backendToken: string;
    permissions: Permissions;
    userId: string;
    email: string;
  } | null> {
    if (!credentials?.email) return null;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/demo-login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: credentials.email }),
        },
      );
      if (!res.ok) return null;
      const body = (await res.json()) as BackendAuthResponse;
      return {
        backendToken: body.data.accessToken,
        permissions: body.data.user.permissions,
        userId: String(body.data.user.id),
        email: body.data.user.email,
      };
    } catch {
      return null;
    }
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: selectAuthProviders(isDemoMode(), { google: Google, credentials }),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    signIn({ account }): boolean {
      if (account?.provider === 'google') return true;
      if (account?.provider === 'credentials') return true;
      return false;
    },
    async jwt({ token, account, user }): Promise<typeof token> {
      if (account?.provider === 'google') {
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken: account.id_token }),
            },
          );
          if (res.ok) {
            const body = (await res.json()) as BackendAuthResponse;
            token.backendToken = body.data.accessToken;
            token.permissions = body.data.user.permissions;
            token.userId = String(body.data.user.id);
          }
        } catch {
          // Backend unreachable — token won't have backendToken
          // middleware.ts will redirect to /acceso-denegado on next navigation
        }
      }

      if (account?.provider === 'credentials') {
        const u = user as {
          backendToken: string;
          permissions: Permissions;
          userId: string;
        };
        token.backendToken = u.backendToken;
        token.permissions = u.permissions;
        token.userId = u.userId;
      }

      // Stale JWT detection: old tokens have token.role (string), not token.permissions
      // Old-format token detected — clear stale data to force re-authentication
      if (
        (token as Record<string, unknown>)['role'] !== undefined &&
        token.permissions === undefined
      ) {
        delete (token as Record<string, unknown>)['role'];
        // Clear the backend token too, which will trigger re-auth via the signIn flow
        token.backendToken = undefined;
      }

      return token;
    },
    session({ session, token }): typeof session {
      session.accessToken = (token.backendToken as string) ?? '';
      session.user.permissions =
        (token.permissions as Permissions) ?? NO_PERMISSIONS;
      session.user.id = (token.userId as string) ?? '';
      return session;
    },
  },
});
