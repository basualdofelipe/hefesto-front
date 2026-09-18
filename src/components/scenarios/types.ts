import type { Product } from '../products/types';
import type { TnPlan } from '../tiendanube-config/types';

export interface ScenarioUser {
  id: string;
  name: string | null;
  email: string;
}

export interface ScenarioOverride {
  id: string;
  product: Product;
  overridePrice: string; // decimal from backend
  createdAt: string;
}

export interface Scenario {
  id: string;
  name: string;
  isPublic: boolean;
  gatewaySlug: string | null;
  paymentMethod: string | null;
  withdrawalDays: number | null;
  installments: number | null;
  plan: TnPlan | null;
  user: ScenarioUser;
  overrides: ScenarioOverride[];
  createdAt: string;
  updatedAt: string;
}

export interface ScenarioProductResult {
  productId: string;
  productName: string;
  productType: string;
  cost: number;
  realPrice: number | null;
  overridePrice: number | null;
  effectivePrice: number | null;
  simResult: ScenarioCalcResult | null;
  realResult: ScenarioCalcResult | null;
  isActive: boolean;
}

// Subset of CalcResult fields needed for scenario display
export interface ScenarioCalcResult {
  realProfit: number;
  marginPercent: number;
  gatewayFee: number;
  financingCost: number;
  iibbWithholding: number;
  cpt: number;
  ivaNet: number;
  netReceived: number;
  productCostWithIva: number;
}

export interface ScenarioCalcResponse {
  scenarioId: string;
  scenarioName: string;
  gatewaySlug: string;
  planSlug: string | null;
  paymentMethod: string;
  withdrawalDays: number;
  installments: number;
  results: ScenarioProductResult[];
}

export interface CreateScenarioPayload {
  name: string;
  gatewaySlug?: string;
  paymentMethod?: string;
  withdrawalDays?: number;
  installments?: number;
  planId?: string;
  isPublic?: boolean;
}

export interface OverrideItem {
  productId: string;
  overridePrice: number;
}

// Props interface for GatewayPlanSelector
export interface GatewayPlanConfig {
  gatewaySlug: string;
  paymentMethod: string;
  withdrawalDays: number;
  installments: number;
  planId: string;
}
