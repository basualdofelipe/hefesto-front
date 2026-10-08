import { render, screen } from '@testing-library/react';

import type { GatewayConfig } from '@/components/calculator/GatewaySelectors';
import { GatewaySelectors } from '@/components/calculator/GatewaySelectors';
import type {
  TiendanubeConfigAll,
  TnGatewayRate,
  TnPaymentGateway,
} from '@/components/tiendanube-config/types';

const MERCADO_PAGO_ID = '0b9f6c1e-3d2a-4f5b-8c7d-1e2f3a4b5c6d';
const PAGO_NUBE_ID = '7a1b2c3d-4e5f-4a6b-9c8d-0e1f2a3b4c5d';
const PAGO_NUBE_RATE_ID = 'c2d3e4f5-a6b7-4c8d-9e0f-1a2b3c4d5e6f';
const MERCADO_PAGO_RATE_ID = 'd3e4f5a6-b7c8-4d9e-8f0a-2b3c4d5e6f7a';
const INSTALLMENT_ID = 'e4f5a6b7-c8d9-4e0f-9a1b-3c4d5e6f7a8b';
const TAX_ID = 'f5a6b7c8-d9e0-4f1a-8b2c-4d5e6f7a8b9c';
const PLAN_ID = 'a6b7c8d9-e0f1-4a2b-9c3d-5e6f7a8b9c0d';
const CREATED_AT = '2026-10-08T00:00:00.000Z';

function gateway(
  id: string,
  slug: string,
  label: string,
  isActive: boolean,
): TnPaymentGateway {
  return { id, slug, label, isActive };
}

function rate(id: string, gw: TnPaymentGateway): TnGatewayRate {
  return {
    id,
    gateway: gw,
    paymentMethod: 'tarjeta_debito_credito',
    withdrawalDays: 7,
    ratePercent: 3.49,
    planId: null,
    isActive: true,
    createdAt: CREATED_AT,
  };
}

function buildConfig(gateways: TnPaymentGateway[]): TiendanubeConfigAll {
  const rateIds: Record<string, string> = {
    [PAGO_NUBE_ID]: PAGO_NUBE_RATE_ID,
    [MERCADO_PAGO_ID]: MERCADO_PAGO_RATE_ID,
  };
  return {
    gateways,
    // One active rate per gateway, so any selected gateway has a method.
    rates: gateways.map((gw) => rate(rateIds[gw.id], gw)),
    installments: [
      {
        id: INSTALLMENT_ID,
        installments: 1,
        ratePercent: 0,
        isActive: true,
        createdAt: CREATED_AT,
      },
    ],
    taxConfig: {
      id: TAX_ID,
      ivaRate: 21,
      iibbRate: 3.5,
      isActive: true,
      createdAt: CREATED_AT,
    },
    plans: [
      {
        id: PLAN_ID,
        slug: 'esencial',
        label: 'Esencial',
        cptPagoNube: 0,
        cptOtherGateways: 2,
        onlyPagoNube: false,
        isActive: true,
      },
    ],
    shipping: null,
  };
}

function renderSelectors(config: TiendanubeConfigAll): GatewayConfig[] {
  const emitted: GatewayConfig[] = [];
  render(
    <GatewaySelectors
      config={config}
      onConfigChange={(next: GatewayConfig): void => {
        emitted.push(next);
      }}
    />,
  );
  return emitted;
}

/** The gateway Select is the first combobox the component renders. */
function gatewayTrigger(): HTMLElement {
  return screen.getAllByRole('combobox')[0];
}

describe('GatewaySelectors default gateway (R11)', () => {
  it('starts on Pago Nube when it is active but not first', () => {
    const emitted = renderSelectors(
      buildConfig([
        gateway(MERCADO_PAGO_ID, 'mercado_pago', 'Mercado Pago', true),
        gateway(PAGO_NUBE_ID, 'pago_nube', 'Pago Nube', true),
      ]),
    );

    expect(emitted.at(-1)?.gatewaySlug).toBe('pago_nube');
    expect(gatewayTrigger()).toHaveTextContent('Pago Nube');
  });

  it('starts on the first active gateway when Pago Nube is inactive', () => {
    const emitted = renderSelectors(
      buildConfig([
        gateway(MERCADO_PAGO_ID, 'mercado_pago', 'Mercado Pago', true),
        gateway(PAGO_NUBE_ID, 'pago_nube', 'Pago Nube', false),
      ]),
    );

    expect(emitted.at(-1)?.gatewaySlug).toBe('mercado_pago');
    expect(gatewayTrigger()).toHaveTextContent('Mercado Pago');
  });

  it('selects nothing and emits no config when no gateway is active', () => {
    const emitted = renderSelectors(
      buildConfig([
        gateway(MERCADO_PAGO_ID, 'mercado_pago', 'Mercado Pago', false),
        gateway(PAGO_NUBE_ID, 'pago_nube', 'Pago Nube', false),
      ]),
    );

    expect(gatewayTrigger()).toHaveTextContent('Selecciona pasarela');
    expect(emitted).toEqual([]);
  });
});
