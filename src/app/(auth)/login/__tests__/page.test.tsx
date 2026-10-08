// jest.mock MUST appear before component imports (hoisted but explicit placement is safer)
jest.mock('@/auth', () => ({
  auth: jest.fn().mockResolvedValue(null),
  signIn: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
}));

import { render, screen } from '@testing-library/react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import LoginPage from '../page';

// NextAuth's `auth` is an overloaded callable (handler + middleware), so
// jest.MockedFunction collapses its param to `never`. Cast to a plain mock.
const mockAuth = auth as unknown as jest.Mock;
const mockRedirect = redirect as unknown as jest.Mock;

const DEMO_FLAG = 'NEXT_PUBLIC_DEMO_LOGIN_ENABLED';

async function renderLoginPage(): Promise<void> {
  render(await LoginPage({ searchParams: Promise.resolve({}) }));
}

describe('Login page', () => {
  const original = process.env[DEMO_FLAG];

  beforeEach(() => {
    mockAuth.mockResolvedValue(null);
    mockRedirect.mockClear();
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env[DEMO_FLAG];
    } else {
      process.env[DEMO_FLAG] = original;
    }
  });

  it('shows only the demo entry in demo mode', async () => {
    process.env[DEMO_FLAG] = 'true';

    await renderLoginPage();

    expect(
      screen.getByRole('button', { name: 'Entrar como demo' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Ingresar con Google')).not.toBeInTheDocument();
    expect(screen.queryByText('o', { exact: true })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('shows only the Google entry outside demo mode', async () => {
    process.env[DEMO_FLAG] = 'false';

    await renderLoginPage();

    expect(
      screen.getByRole('button', { name: 'Ingresar con Google' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Entrar como demo')).not.toBeInTheDocument();
  });

  it('redirects home when the session already has a backend token', async () => {
    mockAuth.mockResolvedValue({ accessToken: 'session-token' });

    await renderLoginPage();

    expect(mockRedirect).toHaveBeenCalledWith('/');
  });
});
