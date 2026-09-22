import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockUseSession = jest.fn(() => ({
  data: {
    user: {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'admin@hefesto.com',
      permissions: { canManageUsers: true },
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

jest.mock('@/components/scenarios/ProductOverrideTable', () => ({
  ProductOverrideTable: ({
    onOverrideChange,
  }: {
    onOverrideChange: (id: string, v: number | null) => void;
  }) => (
    <button
      onClick={() =>
        onOverrideChange('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 150)
      }
    >
      Set Override
    </button>
  ),
}));

jest.mock('@/components/scenarios/GatewayPlanSelector', () => ({
  GatewayPlanSelector: () => <div data-testid='gateway-selector' />,
}));

jest.mock('@/components/scenarios/MarginSummary', () => ({
  MarginSummary: ({ results }: { results: unknown[] | null }) => (
    <div data-testid='margin-summary'>{results?.length ?? 0} results</div>
  ),
}));

jest.mock('@/components/scenarios/BulkOverrideDialog', () => ({
  BulkOverrideDialog: () => <div data-testid='bulk-dialog' />,
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({
    checked,
    onCheckedChange,
  }: {
    checked: boolean;
    onCheckedChange: () => void;
  }) => (
    <button role='switch' aria-checked={checked} onClick={onCheckedChange}>
      toggle
    </button>
  ),
}));

jest.mock('next/link', () => {
  const Link = ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }): React.ReactElement => <a href={href}>{children as React.ReactElement}</a>;
  Link.displayName = 'Link';
  return Link;
});

import { ScenarioEditorClient } from '../ScenarioEditorClient';

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const PRODUCT_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const GATEWAY_UUID = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
const PLAN_UUID = 'c3d4e5f6-a7b8-9012-cdef-123456789012';
const SCENARIO_UUID = 'd4e5f6a7-b8c9-0123-defa-234567890123';

const mockScenario = {
  id: SCENARIO_UUID,
  name: 'Test Scenario',
  user: { id: OWNER_ID },
  isPublic: false,
  gatewaySlug: 'pago_nube',
  paymentMethod: 'tarjeta_debito_credito',
  withdrawalDays: 1,
  installments: 1,
  plan: { id: PLAN_UUID, slug: 'esencial' },
  overrides: [],
};

const mockProducts = [
  {
    id: PRODUCT_UUID,
    skuCode: 'T.N.F.C.S',
    currentPrice: 100,
    isActive: true,
    type: { id: 'type-uuid', name: 'Tipo' },
    name: { name: 'Test' },
    finish: { name: 'Lisa' },
    color: { name: 'Marrón' },
    size: { name: 'S' },
    cost: 60,
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
};

describe('ScenarioEditorClient', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-length': '100' }),
        json: () =>
          Promise.resolve({
            data: {
              results: [
                {
                  product: { id: PRODUCT_UUID, skuCode: 'T.N.F.C.S' },
                  overridePrice: '150',
                  simResult: { marginPercent: 30, realProfit: 45 },
                  realResult: { marginPercent: 20, realProfit: 30 },
                },
              ],
            },
          }),
      }),
    ) as jest.Mock;
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: OWNER_ID,
          email: 'admin@hefesto.com',
          permissions: { canManageUsers: true },
        },
        accessToken: 'fake-token',
      },
      status: 'authenticated' as const,
    });
  });

  it('shows Guardar button for the scenario owner', () => {
    render(
      <ScenarioEditorClient
        scenario={mockScenario as never}
        products={mockProducts as never}
        config={mockConfig as never}
      />,
    );

    expect(
      screen.getByRole('button', { name: /Guardar y calcular/i }),
    ).toBeInTheDocument();
  });

  it('does not show Guardar button for non-owner', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '99999999-9999-4999-8999-999999999999',
          email: 'other@hefesto.com',
          permissions: { canManageUsers: false },
        },
        accessToken: 'fake-token',
      },
      status: 'authenticated' as const,
    });

    render(
      <ScenarioEditorClient
        scenario={mockScenario as never}
        products={mockProducts as never}
        config={mockConfig as never}
      />,
    );

    expect(
      screen.queryByRole('button', { name: /Guardar y calcular/i }),
    ).not.toBeInTheDocument();
  });

  it('override entry: triggering an override makes the override state available (renders the ProductOverrideTable)', () => {
    render(
      <ScenarioEditorClient
        scenario={mockScenario as never}
        products={mockProducts as never}
        config={mockConfig as never}
      />,
    );

    // The "Set Override" button is rendered by the mocked ProductOverrideTable
    const overrideBtn = screen.getByRole('button', { name: /Set Override/i });
    expect(overrideBtn).toBeInTheDocument();

    // Clicking it fires the onOverrideChange callback — state update is internal
    // We verify the component doesn't crash and re-renders cleanly
    fireEvent.click(overrideBtn);

    // After override, Guardar button is still present (owner is still logged in)
    expect(
      screen.getByRole('button', { name: /Guardar y calcular/i }),
    ).toBeInTheDocument();
  });

  it('override entry + save: after clicking Guardar, calls PUT overrides and renders MarginSummary with results', async () => {
    render(
      <ScenarioEditorClient
        scenario={mockScenario as never}
        products={mockProducts as never}
        config={mockConfig as never}
      />,
    );

    // Set an override
    fireEvent.click(screen.getByRole('button', { name: /Set Override/i }));

    // Save and calculate
    fireEvent.click(
      screen.getByRole('button', { name: /Guardar y calcular/i }),
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/scenarios/${SCENARIO_UUID}/overrides`),
        expect.objectContaining({ method: 'PUT' }),
      );
    });

    // After calculation, MarginSummary renders with results
    await waitFor(() => {
      expect(screen.getByTestId('margin-summary')).toBeInTheDocument();
      expect(screen.getByTestId('margin-summary')).toHaveTextContent(
        '1 results',
      );
    });
  });
});
