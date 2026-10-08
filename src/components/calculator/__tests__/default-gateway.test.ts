import { pickDefaultGatewaySlug } from '@/components/calculator/default-gateway';

describe('pickDefaultGatewaySlug', () => {
  it('picks Pago Nube when it is active, even if it is not first', () => {
    expect(
      pickDefaultGatewaySlug([{ slug: 'mercado_pago' }, { slug: 'pago_nube' }]),
    ).toBe('pago_nube');
  });

  it('falls back to the first active gateway when Pago Nube is not active', () => {
    expect(
      pickDefaultGatewaySlug([{ slug: 'mercado_pago' }, { slug: 'modo' }]),
    ).toBe('mercado_pago');
  });

  it('returns an empty slug when there are no active gateways', () => {
    expect(pickDefaultGatewaySlug([])).toBe('');
  });
});
