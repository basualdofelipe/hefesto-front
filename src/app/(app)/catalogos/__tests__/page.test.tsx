// jest.mock MUST appear before component imports (hoisted but explicit placement is safer)
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  apiFetch: jest.fn(),
}));

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: { accessToken: 'test-token' } }),
}));

jest.mock('@/lib/api-client', () => ({
  apiClientFetch: jest.fn(),
}));

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { auth } from '@/auth';
import { apiFetch } from '@/lib/api';
import { apiClientFetch } from '@/lib/api-client';
import CatalogosPage from '../page';

// NextAuth's `auth` is an overloaded callable (handler + middleware), so
// jest.MockedFunction collapses its param to `never`. Cast to a plain mock.
const mockAuth = auth as unknown as jest.Mock;
const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;
const mockApiClientFetch = apiClientFetch as jest.MockedFunction<
  typeof apiClientFetch
>;

interface CatalogItem {
  id: string;
  name: string;
}

const DIMENSION_KEYS = [
  'product-types',
  'product-names',
  'product-finishes',
  'product-colors',
  'product-sizes',
  'supply-types',
  'expense-categories',
];

const CREATED: CatalogItem = {
  id: 'f0e1d2c3-b4a5-4697-8869-5a4b3c2d1e0f',
  name: 'Nuevo tipo',
};

/** Two items per dimension, each with its own v4 UUID. */
function itemsFor(dimension: string): CatalogItem[] {
  const index = DIMENSION_KEYS.indexOf(dimension);
  return [1, 2].map((n) => ({
    id: `${index}${n}000000-0000-4000-8000-00000000000${n}`,
    name: `${dimension} ${n}`,
  }));
}

beforeEach(() => {
  mockAuth.mockResolvedValue({
    accessToken: 'test-token',
    user: { permissions: { canEditProducts: true } },
  });
  mockApiFetch.mockReset();
  mockApiFetch.mockImplementation(<T,>(path: string): Promise<T> => {
    const dimension = path.replace('/api/catalogs/', '');
    return Promise.resolve({ data: itemsFor(dimension) } as T);
  });
  mockApiClientFetch.mockReset();
  mockApiClientFetch.mockImplementation(
    <T,>(
      path: string,
      _token: string,
      options: RequestInit = {},
    ): Promise<T> => {
      if (path === '/api/catalogs/product-types' && options.method === 'POST') {
        return Promise.resolve({ data: CREATED } as T);
      }
      return Promise.reject(new Error(`Unexpected request ${path}`));
    },
  );
});

/**
 * The selected panel. jsdom applies no Tailwind, so the force-mounted
 * inactive panels stay in the accessibility tree; pick by data-state.
 */
function activePanel(): HTMLElement {
  const active = screen
    .getAllByRole('tabpanel', { hidden: true })
    .filter((panel) => panel.getAttribute('data-state') === 'active');
  expect(active).toHaveLength(1);
  return active[0];
}

describe('Catalogos page', () => {
  it('keeps all 7 tab panels mounted, with the inactive ones hidden', async () => {
    render(await CatalogosPage());

    const panels = screen.getAllByRole('tabpanel', { hidden: true });
    expect(panels).toHaveLength(7);

    const inactive = panels.filter(
      (panel) => panel.getAttribute('data-state') === 'inactive',
    );
    expect(inactive).toHaveLength(6);
    // With forceMount Radix never sets `hidden`; this class hides them.
    for (const panel of inactive) {
      expect(panel).toHaveClass('data-[state=inactive]:hidden');
    }
  });

  it('keeps a tab state when switching to another tab and back', async () => {
    const user = userEvent.setup();
    render(await CatalogosPage());

    await user.click(
      within(activePanel()).getByRole('button', { name: 'Agregar' }),
    );
    await user.type(
      within(activePanel()).getByPlaceholderText('Nombre del item...'),
      'Nuevo tipo{Enter}',
    );
    expect(
      await within(activePanel()).findByText('Nuevo tipo'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Talles' }));
    expect(
      within(activePanel()).getByText('product-sizes 1'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Tipos' }));

    expect(within(activePanel()).getByText('Nuevo tipo')).toBeInTheDocument();
  });
});
