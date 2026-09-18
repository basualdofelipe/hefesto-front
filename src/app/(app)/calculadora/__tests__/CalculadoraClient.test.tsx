import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockUseSession = jest.fn(() => ({
  data: {
    user: {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'demo@hefesto.com',
      permissions: { canUseCalculator: true },
    },
    accessToken: 'fake-token',
  },
  status: 'authenticated' as const,
}));

jest.mock('next-auth/react', () => ({
  useSession: (): unknown => mockUseSession(),
}));

jest.mock('next/navigation', () => ({
  useRouter: (): { refresh: jest.Mock } => ({ refresh: jest.fn() }),
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('@/components/calculator/GatewaySelectors', () => ({
  GatewaySelectors: ({
    onConfigChange,
  }: {
    onConfigChange: (c: unknown) => void;
  }) => (
    <button
      onClick={() =>
        onConfigChange({
          gatewaySlug: 'pago_nube',
          paymentMethod: 'tarjeta_debito_credito',
          withdrawalDays: 7,
          installments: 1,
          planSlug: 'esencial',
        })
      }
    >
      Set Gateway
    </button>
  ),
}));

const PRODUCT_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const PRODUCT_NO_COST_UUID = 'd4e5f6a7-b8c9-4012-8def-234567890123';

const productFixture = {
  id: PRODUCT_UUID,
  skuCode: 'T.N.F.C.S',
  currentPrice: 100,
  isActive: true,
  cost: 60,
};

jest.mock('@/components/calculator/ProductSelector', () => ({
  ProductSelector: ({
    onProductSelect,
  }: {
    onProductSelect: (p: unknown) => void;
  }) => (
    <>
      <button onClick={() => onProductSelect(productFixture)}>
        Select Product
      </button>
      <button
        onClick={() =>
          onProductSelect({
            ...productFixture,
            id: PRODUCT_NO_COST_UUID,
            cost: null,
          })
        }
      >
        Select Product Without Cost
      </button>
    </>
  ),
}));

jest.mock('@/components/calculator/ModeToggle', () => ({
  ModeToggle: ({ onModeChange }: { onModeChange: (m: string) => void }) => (
    <>
      <button onClick={() => onModeChange('inverse')}>Toggle Mode</button>
      <button onClick={() => onModeChange('forward')}>Toggle Forward</button>
    </>
  ),
}));

jest.mock('@/components/calculator/DesglosePanel', () => ({
  DesglosePanel: () => <div data-testid='desglose'>Desglose Panel</div>,
}));

import { toast } from 'sonner';
import { CalculadoraClient } from '../CalculadoraClient';

const GATEWAY_UUID = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
const PLAN_UUID = 'c3d4e5f6-a7b8-9012-cdef-123456789012';
const SHIPPING_UUID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const mockProducts = [
  {
    ...productFixture,
    name: { name: 'Test' },
    type: { name: 'Tipo' },
    finish: { name: 'Lisa' },
    color: { name: 'Marrón' },
    size: { name: 'S' },
  },
];

const mockConfig = {
  gateways: [
    { id: GATEWAY_UUID, slug: 'pago_nube', label: 'Pago Nube', isActive: true },
  ],
  rates: [],
  installments: [],
  taxConfig: null,
  plans: [{ id: PLAN_UUID, slug: 'esencial', label: 'Esencial' }],
  shipping: {
    id: SHIPPING_UUID,
    defaultShippingCost: 7315,
    defaultShippingCharged: 7315,
    isActive: true,
    createdAt: '2026-09-18T00:00:00Z',
  },
};

const HINT_NO_COST = 'Definí el costo del producto primero';

function renderClient(config: unknown = mockConfig): void {
  render(
    <CalculadoraClient
      products={mockProducts as never}
      config={config as never}
    />,
  );
}

function fetchCalls(): Array<{ url: string; body: Record<string, unknown> }> {
  return (global.fetch as jest.Mock).mock.calls.map(
    ([url, init]: [string, RequestInit]) => ({
      url,
      body: JSON.parse(init.body as string) as Record<string, unknown>,
    }),
  );
}

describe('CalculadoraClient', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-length': '100' }),
        json: () =>
          Promise.resolve({
            data: {
              realProfit: 30,
              marginPercent: 0.3,
              requiredSellingPrice: 130,
              shippingCost: 7315,
            },
          }),
      }),
    ) as jest.Mock;
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '11111111-1111-4111-8111-111111111111',
          email: 'demo@hefesto.com',
          permissions: { canUseCalculator: true },
        },
        accessToken: 'fake-token',
      },
      status: 'authenticated' as const,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('shipping preload (R2)', () => {
    it('pre-fills both shipping inputs from config.shipping', () => {
      renderClient();

      expect(screen.getByLabelText('Envío cobrado al cliente')).toHaveValue(
        7315,
      );
      expect(
        screen.getByLabelText('Costo real del envío (con IVA)'),
      ).toHaveValue(7315);
    });

    it('shows 0 in both shipping inputs when config.shipping is null', () => {
      renderClient({ ...mockConfig, shipping: null });

      expect(screen.getByLabelText('Envío cobrado al cliente')).toHaveValue(0);
      expect(
        screen.getByLabelText('Costo real del envío (con IVA)'),
      ).toHaveValue(0);
    });
  });

  it('forward mode: POSTs /api/calculator/forward with the English body and renders DesglosePanel', async () => {
    const user = userEvent.setup({ delay: null });
    renderClient();

    await user.click(screen.getByText('Select Product'));
    await user.click(screen.getByText('Set Gateway'));
    await user.type(screen.getByLabelText('Precio de venta'), '130');

    jest.runAllTimers();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    const [call] = fetchCalls();
    expect(call.url).toMatch(/\/api\/calculator\/forward$/);
    expect(call.body).toEqual({
      productId: PRODUCT_UUID,
      sellingPrice: 130,
      shippingCharged: 7315,
      shippingCost: 7315,
      gatewaySlug: 'pago_nube',
      paymentMethod: 'tarjeta_debito_credito',
      withdrawalDays: 7,
      installments: 1,
      planSlug: 'esencial',
    });

    await waitFor(() => {
      expect(screen.getByTestId('desglose')).toBeInTheDocument();
    });
  });

  it('shipping override is per calculation: next body carries the edited cost and the config is never written', async () => {
    const user = userEvent.setup({ delay: null });
    renderClient();

    await user.click(screen.getByText('Select Product'));
    await user.click(screen.getByText('Set Gateway'));
    await user.type(screen.getByLabelText('Precio de venta'), '130');
    jest.runAllTimers();
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    fireEvent.change(screen.getByLabelText('Costo real del envío (con IVA)'), {
      target: { value: '5000' },
    });
    jest.runAllTimers();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    const calls = fetchCalls();
    expect(calls[1].url).toMatch(/\/api\/calculator\/forward$/);
    expect(calls[1].body).toMatchObject({
      shippingCharged: 7315,
      shippingCost: 5000,
    });
    // Prohibition 3: the override never becomes the default
    expect(calls.some((c) => c.url.includes('/api/tiendanube-config'))).toBe(
      false,
    );
  });

  describe('inverse mode (R7)', () => {
    it('a target profit of 0 (break-even) POSTs /api/calculator/inverse with targetProfit 0', async () => {
      const user = userEvent.setup({ delay: null });
      renderClient();

      await user.click(screen.getByText('Select Product'));
      await user.click(screen.getByText('Set Gateway'));
      await user.click(screen.getByText('Toggle Mode'));
      await user.type(screen.getByLabelText('Ganancia deseada'), '0');

      jest.runAllTimers();

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      const [call] = fetchCalls();
      expect(call.url).toMatch(/\/api\/calculator\/inverse$/);
      expect(call.body).toMatchObject({
        productId: PRODUCT_UUID,
        targetProfit: 0,
        shippingCharged: 7315,
        shippingCost: 7315,
      });
      expect(call.body).not.toHaveProperty('sellingPrice');
    });

    it('a negative target profit fires no request', async () => {
      const user = userEvent.setup({ delay: null });
      renderClient();

      await user.click(screen.getByText('Select Product'));
      await user.click(screen.getByText('Set Gateway'));
      await user.click(screen.getByText('Toggle Mode'));
      fireEvent.change(screen.getByLabelText('Ganancia deseada'), {
        target: { value: '-5' },
      });

      jest.runAllTimers();

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  it('product without cost: no request, no toast, a single hint; gating is per product', async () => {
    const user = userEvent.setup({ delay: null });
    renderClient();

    await user.click(screen.getByText('Select Product Without Cost'));
    await user.click(screen.getByText('Set Gateway'));
    await user.type(screen.getByLabelText('Precio de venta'), '130');
    jest.runAllTimers();

    expect(global.fetch).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(screen.getAllByText(HINT_NO_COST)).toHaveLength(1);

    // Inverse mode is gated the same way
    await user.click(screen.getByText('Toggle Mode'));
    await user.type(screen.getByLabelText('Ganancia deseada'), '50');
    jest.runAllTimers();

    expect(global.fetch).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(screen.getAllByText(HINT_NO_COST)).toHaveLength(1);

    // Selecting a product with cost afterwards calculates normally
    await user.click(screen.getByText('Toggle Forward'));
    await user.click(screen.getByText('Select Product'));
    jest.runAllTimers();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    const [call] = fetchCalls();
    expect(call.url).toMatch(/\/api\/calculator\/forward$/);
    expect(call.body).toMatchObject({
      productId: PRODUCT_UUID,
      sellingPrice: 130,
    });
    expect(screen.queryByText(HINT_NO_COST)).not.toBeInTheDocument();
  });

  it('debounce: rapid input changes trigger only one fetch', async () => {
    const user = userEvent.setup({ delay: null });
    renderClient();

    await user.click(screen.getByText('Select Product'));
    await user.click(screen.getByText('Set Gateway'));

    (global.fetch as jest.Mock).mockClear();

    await user.type(screen.getByLabelText('Precio de venta'), '999');

    jest.runAllTimers();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
