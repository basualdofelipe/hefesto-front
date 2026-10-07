import { fireEvent, render, screen, waitFor } from '@testing-library/react';

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

import { toast } from 'sonner';
import { apiClientFetch } from '@/lib/api-client';
import { ShippingSection } from '../ShippingSection';
import type { TnShippingConfig } from '../types';

const mockApiClientFetch = apiClientFetch as jest.MockedFunction<
  typeof apiClientFetch
>;

const CHARGED_LABEL = 'Envío cobrado al cliente';
const COST_LABEL = 'Costo real del envío (con IVA)';

const shippingFixture: TnShippingConfig = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  defaultShippingCost: 7315,
  defaultShippingCharged: 7315,
  isActive: true,
  createdAt: '2026-09-18T00:00:00.000Z',
};

describe('ShippingSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiClientFetch.mockResolvedValue(undefined);
  });

  it('pre-fills both inputs from config.shipping', () => {
    render(<ShippingSection shipping={shippingFixture} />);

    expect(screen.getByLabelText(CHARGED_LABEL)).toHaveValue(7315);
    expect(screen.getByLabelText(COST_LABEL)).toHaveValue(7315);
    expect(screen.getByLabelText(CHARGED_LABEL)).toHaveDisplayValue('7315.00');
    expect(screen.getByLabelText(COST_LABEL)).toHaveDisplayValue('7315.00');
  });

  it('shows 0.00 in both inputs when config.shipping is null', () => {
    render(<ShippingSection shipping={null} />);

    expect(screen.getByLabelText(CHARGED_LABEL)).toHaveDisplayValue('0.00');
    expect(screen.getByLabelText(COST_LABEL)).toHaveDisplayValue('0.00');
  });

  it('PUTs /api/tiendanube-config/shipping with both numbers and toasts success', async () => {
    render(<ShippingSection shipping={shippingFixture} />);

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledTimes(1);
    });
    expect(mockApiClientFetch).toHaveBeenCalledTimes(1);
    expect(mockApiClientFetch).toHaveBeenCalledWith(
      '/api/tiendanube-config/shipping',
      'fake-token',
      {
        method: 'PUT',
        body: JSON.stringify({
          defaultShippingCharged: 7315,
          defaultShippingCost: 7315,
        }),
      },
    );
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('rejects a negative cost locally: toast.error and no request', async () => {
    render(<ShippingSection shipping={shippingFixture} />);

    fireEvent.change(screen.getByLabelText(COST_LABEL), {
      target: { value: '-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledTimes(1);
    });
    expect(mockApiClientFetch).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('rejects a value above the DTO bound (1.000.000.000) locally', async () => {
    render(<ShippingSection shipping={shippingFixture} />);

    fireEvent.change(screen.getByLabelText(CHARGED_LABEL), {
      target: { value: '1000000001' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledTimes(1);
    });
    expect(mockApiClientFetch).not.toHaveBeenCalled();
  });
});
