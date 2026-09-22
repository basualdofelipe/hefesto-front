export interface TnPaymentGateway {
  id: string;
  slug: string;
  label: string;
  isActive: boolean;
}

export interface TnGatewayRate {
  id: string;
  gateway: TnPaymentGateway;
  paymentMethod: string;
  withdrawalDays: number;
  ratePercent: number;
  // null = shared row that applies to every plan (Phase 14, D-06)
  planId: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface TnInstallmentRate {
  id: string;
  installments: number;
  ratePercent: number;
  isActive: boolean;
  createdAt: string;
}

export interface TnTaxConfig {
  id: string;
  ivaRate: number;
  iibbRate: number;
  isActive: boolean;
  createdAt: string;
}

export interface TnShippingConfig {
  id: string;
  defaultShippingCost: number;
  defaultShippingCharged: number;
  isActive: boolean;
  createdAt: string;
}

export interface TnPlan {
  id: string;
  slug: string;
  label: string;
  cptPagoNube: number;
  cptOtherGateways: number;
  onlyPagoNube: boolean;
  isActive: boolean;
}

export interface TiendanubeConfigAll {
  gateways: TnPaymentGateway[];
  rates: TnGatewayRate[];
  installments: TnInstallmentRate[];
  taxConfig: TnTaxConfig;
  plans: TnPlan[];
  shipping: TnShippingConfig | null;
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  tarjeta_debito_credito: 'Tarjeta deb/cred',
  billetera_virtual: 'Billetera Virtual',
  transferencia: 'Transferencia',
  todos_los_medios: 'Todos los medios',
  tarjeta_credito: 'Tarjeta credito',
  tarjeta_debito: 'Tarjeta debito',
};
