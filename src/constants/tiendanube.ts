export const TN_PLAN_ESENCIAL = 'esencial' as const;
export const TN_GATEWAY_PAGO_NUBE = 'pago_nube' as const;
export const TN_PAYMENT_TARJETA = 'tarjeta_debito_credito' as const;

/**
 * Gateways whose fee varies by Tiendanube plan (D-06). Mirrors the backend
 * constant in hefesto-back/src/constants/tiendanube.ts. Promote to a
 * `rates_vary_by_plan` flag on tn_payment_gateways if a second gateway ever varies.
 */
export const TN_GATEWAYS_WITH_PLAN_RATES: readonly string[] = [
  TN_GATEWAY_PAGO_NUBE,
];
