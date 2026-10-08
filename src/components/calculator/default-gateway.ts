import { TN_GATEWAY_PAGO_NUBE } from '@/constants/tiendanube';

/**
 * Gateway the calculator starts on (D-21): Pago Nube when it is among the
 * active gateways, otherwise the first active one, otherwise '' (nothing
 * selected). Only the calculator default; the back keeps its own gateway order.
 */
export function pickDefaultGatewaySlug(
  activeGateways: readonly { slug: string }[],
): string {
  const pagoNube = activeGateways.find(
    (gateway) => gateway.slug === TN_GATEWAY_PAGO_NUBE,
  );
  return pagoNube?.slug ?? activeGateways[0]?.slug ?? '';
}
