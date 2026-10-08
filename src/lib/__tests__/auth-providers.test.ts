import type { Provider } from 'next-auth/providers';
import { selectAuthProviders } from '@/lib/auth-providers';
import { isDemoMode } from '@/constants/demo';

// Only identity matters to the selection, so the stubs carry an id and nothing
// else. The real providers would pull the NextAuth v5 ESM chain into Jest.
function stubProvider(id: string): Provider {
  return { id } as unknown as Provider;
}

const DEMO_FLAG = 'NEXT_PUBLIC_DEMO_LOGIN_ENABLED';

describe('selectAuthProviders', () => {
  const google = stubProvider('google-stub');
  const credentials = stubProvider('credentials-stub');

  it('drops Google in demo mode', () => {
    const result = selectAuthProviders(true, { google, credentials });

    expect(result).toEqual([credentials]);
    expect(result).not.toContain(google);
  });

  it('keeps Google first and Credentials second outside demo mode', () => {
    const result = selectAuthProviders(false, { google, credentials });

    expect(result).toEqual([google, credentials]);
  });
});

describe('isDemoMode', () => {
  const original = process.env[DEMO_FLAG];

  afterEach(() => {
    if (original === undefined) {
      delete process.env[DEMO_FLAG];
    } else {
      process.env[DEMO_FLAG] = original;
    }
  });

  it("is true when the flag is 'true'", () => {
    process.env[DEMO_FLAG] = 'true';

    expect(isDemoMode()).toBe(true);
  });

  it("is false when the flag is 'false'", () => {
    process.env[DEMO_FLAG] = 'false';

    expect(isDemoMode()).toBe(false);
  });

  it('is false when the flag is unset', () => {
    delete process.env[DEMO_FLAG];

    expect(isDemoMode()).toBe(false);
  });
});
