import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';

const mockUseSession = jest.fn(() => ({
  data: {
    user: {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'admin@hefesto.com',
      permissions: { canManageConfig: true },
    },
    accessToken: 'fake-token',
  },
  status: 'authenticated' as const,
}));

jest.mock('next-auth/react', () => ({
  useSession: (): unknown => mockUseSession(),
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('@/lib/api-client', () => ({
  apiClientFetch: jest.fn(),
}));

import { apiClientFetch } from '@/lib/api-client';
import { GatewaySection } from '../GatewaySection';
import type { TnGatewayRate, TnPaymentGateway, TnPlan } from '../types';

const mockApiClientFetch = apiClientFetch as jest.MockedFunction<
  typeof apiClientFetch
>;

const ESENCIAL_ID = 'e5e5e5e5-e5e5-4e5e-8e5e-e5e5e5e5e5e5';
const ESCALA_ID = 'c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1';
const PN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const MP_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const ESENCIAL: TnPlan = {
  id: ESENCIAL_ID,
  slug: 'esencial',
  label: 'Esencial',
  cptPagoNube: 0,
  cptOtherGateways: 2,
  onlyPagoNube: false,
  isActive: true,
};

const ESCALA: TnPlan = {
  id: ESCALA_ID,
  slug: 'escala',
  label: 'Escala',
  cptPagoNube: 0,
  cptOtherGateways: 0.7,
  onlyPagoNube: false,
  isActive: true,
};

const PAGO_NUBE: TnPaymentGateway = {
  id: PN_ID,
  slug: 'pago_nube',
  label: 'Pago Nube',
  isActive: true,
};

const MERCADO_PAGO: TnPaymentGateway = {
  id: MP_ID,
  slug: 'mercado_pago',
  label: 'Mercado Pago',
  isActive: true,
};

function makeRate(
  gateway: TnPaymentGateway,
  id: string,
  paymentMethod: string,
  withdrawalDays: number,
  ratePercent: number,
  planId: string | null,
): TnGatewayRate {
  return {
    id,
    gateway,
    paymentMethod,
    withdrawalDays,
    ratePercent,
    planId,
    isActive: true,
    createdAt: '2026-09-18T00:00:00.000Z',
  };
}

const TARJETA = 'tarjeta_debito_credito';
const BILLETERA = 'billetera_virtual';

// Runtime ordering from getAll(): the competing plan row comes first so a
// "first row wins" regression cannot pass by coincidence.
const pnRates: TnGatewayRate[] = [
  makeRate(PAGO_NUBE, 'rate-tarjeta-escala', TARJETA, 14, 2.99, ESCALA_ID),
  makeRate(PAGO_NUBE, 'rate-tarjeta-esencial', TARJETA, 14, 3.49, ESENCIAL_ID),
  makeRate(PAGO_NUBE, 'rate-tarjeta-null', TARJETA, 14, 3.49, null),
  makeRate(PAGO_NUBE, 'rate-billetera-null', BILLETERA, 14, 3.49, null),
];

const mpRates: TnGatewayRate[] = [
  makeRate(MERCADO_PAGO, 'rate-mp-tarjeta-null', TARJETA, 14, 6.29, null),
];

function bodyRows(): HTMLElement[] {
  const [, ...rows] = screen.getAllByRole('row');
  return rows;
}

function rowByMethod(label: string): HTMLElement {
  const row = screen.getByText(label).closest('tr');
  if (!row) {
    throw new Error(`No row found for ${label}`);
  }
  return row;
}

describe('GatewaySection per-plan rows (R5, D-07)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiClientFetch.mockResolvedValue(undefined);
  });

  it('renders one row per (method, days) with the selected plan rate and a plan badge', () => {
    render(
      <GatewaySection
        gateway={PAGO_NUBE}
        rates={pnRates}
        selectedPlan={ESENCIAL}
      />,
    );

    expect(bodyRows()).toHaveLength(2);

    const tarjetaRow = rowByMethod('Tarjeta deb/cred');
    expect(within(tarjetaRow).getByRole('spinbutton')).toHaveDisplayValue(
      '3.49',
    );
    expect(within(tarjetaRow).getByText('Plan Esencial')).toBeInTheDocument();

    const billeteraRow = rowByMethod('Billetera Virtual');
    expect(within(billeteraRow).getByRole('spinbutton')).toHaveDisplayValue(
      '3.49',
    );
    expect(
      within(billeteraRow).getByText('Todos los planes'),
    ).toBeInTheDocument();
  });

  it('switching the selected plan shows that plan rate and badge', () => {
    const { rerender } = render(
      <GatewaySection
        gateway={PAGO_NUBE}
        rates={pnRates}
        selectedPlan={ESENCIAL}
      />,
    );

    rerender(
      <GatewaySection
        gateway={PAGO_NUBE}
        rates={pnRates}
        selectedPlan={ESCALA}
      />,
    );

    expect(bodyRows()).toHaveLength(2);
    const tarjetaRow = rowByMethod('Tarjeta deb/cred');
    expect(within(tarjetaRow).getByRole('spinbutton')).toHaveDisplayValue(
      '2.99',
    );
    expect(within(tarjetaRow).getByText('Plan Escala')).toBeInTheDocument();
    // billetera has no Escala-specific row: the shared row stays visible
    expect(
      within(rowByMethod('Billetera Virtual')).getByText('Todos los planes'),
    ).toBeInTheDocument();
  });

  it('a shared row on a plan-scoped gateway says Guardar forks it for the selected plan (WR-03)', () => {
    render(
      <GatewaySection
        gateway={PAGO_NUBE}
        rates={pnRates}
        selectedPlan={ESCALA}
      />,
    );

    // billetera only has the shared row: the badge stays, the hint says what save does
    const billeteraRow = rowByMethod('Billetera Virtual');
    expect(
      within(billeteraRow).getByText('Todos los planes'),
    ).toBeInTheDocument();
    expect(
      within(billeteraRow).getByText('Guardar → solo Plan Escala'),
    ).toBeInTheDocument();

    // tarjeta shows the Escala-specific row: no fork hint
    const tarjetaRow = rowByMethod('Tarjeta deb/cred');
    expect(within(tarjetaRow).queryByText(/Guardar →/)).not.toBeInTheDocument();
  });

  it('a shared row on a gateway without plan rates shows no fork hint (D-06)', () => {
    render(
      <GatewaySection
        gateway={MERCADO_PAGO}
        rates={mpRates}
        selectedPlan={ESENCIAL}
      />,
    );

    expect(screen.getByText('Todos los planes')).toBeInTheDocument();
    expect(screen.queryByText(/Guardar →/)).not.toBeInTheDocument();
  });

  it('saving a Pago Nube rate sends planId = selected plan id (D-06)', async () => {
    render(
      <GatewaySection
        gateway={PAGO_NUBE}
        rates={pnRates}
        selectedPlan={ESCALA}
      />,
    );

    const tarjetaRow = rowByMethod('Tarjeta deb/cred');
    fireEvent.click(
      within(tarjetaRow).getByRole('button', { name: 'Guardar' }),
    );

    await waitFor(() => {
      expect(mockApiClientFetch).toHaveBeenCalledTimes(1);
    });
    const [url, token, options] = mockApiClientFetch.mock.calls[0];
    expect(url).toBe(`/api/tiendanube-config/gateway-rates/${PN_ID}`);
    expect(token).toBe('fake-token');
    expect(options?.method).toBe('PUT');
    expect(JSON.parse(String(options?.body))).toEqual({
      paymentMethod: TARJETA,
      withdrawalDays: 14,
      ratePercent: 2.99,
      planId: ESCALA_ID,
    });
  });

  it('saving a Mercado Pago rate sends no planId key (D-06)', async () => {
    render(
      <GatewaySection
        gateway={MERCADO_PAGO}
        rates={mpRates}
        selectedPlan={ESENCIAL}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(mockApiClientFetch).toHaveBeenCalledTimes(1);
    });
    const [url, , options] = mockApiClientFetch.mock.calls[0];
    expect(url).toBe(`/api/tiendanube-config/gateway-rates/${MP_ID}`);
    const body = JSON.parse(String(options?.body)) as Record<string, unknown>;
    expect(body).toEqual({
      paymentMethod: TARJETA,
      withdrawalDays: 14,
      ratePercent: 6.29,
    });
    expect('planId' in body).toBe(false);
  });
});
