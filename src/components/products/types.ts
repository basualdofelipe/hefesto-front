export interface CatalogItem {
  id: string;
  name: string;
  skuCode: number;
}

export interface ProductDimension {
  id: string;
  name: string;
  skuCode: number;
}

export interface Product {
  id: string;
  skuCode: string;
  type: ProductDimension;
  name: ProductDimension;
  finish: ProductDimension;
  color: ProductDimension;
  size: ProductDimension;
  isActive: boolean;
  currentPrice: number | null;
  lastPriceUpdate: string | null;
  createdAt: string;
  cost: number | null;
  costBreakdown: CostBreakdownItem[] | null;
  costWarnings: string[];
}

export interface BomItem {
  id: string;
  supply: {
    id: string;
    name: string;
    unitType: 'm2' | 'unidad' | 'metro' | 'kg';
    isActive: boolean;
    type: { name: string };
  };
  quantity: string;
  isActive: boolean;
}

export interface CostBreakdownItem {
  supplyId: string;
  supplyName: string;
  supplyType: string;
  quantity: number;
  unitType: string;
  unitPrice: number | null;
  lineCost: number | null;
  isSupplyActive: boolean;
}

export interface PriceRecord {
  id: string;
  price: string;
  createdAt: string;
}

export function getProductDisplayName(product: Product): string {
  const parts = [
    product.type.name,
    product.name.name,
    product.finish.name,
    product.color.name,
  ];
  if (product.size.name !== 'Talle Unico') parts.push(product.size.name);
  return parts.join(' ');
}

export function formatSellingPrice(price: number | null): string {
  if (price === null) return '\u2014';
  // The API sends decimal columns as strings ("150000.00"); without Number()
  // toLocaleString is String's and returns it unformatted.
  return `$${Number(price).toLocaleString('es-AR')}`;
}

export function formatCost(cost: number | null): string {
  if (cost === null) return '\u2014';
  return `$${cost.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatMargin(
  cost: number | null,
  price: number | null,
): { amount: string; percent: string } {
  if (cost === null || price === null) {
    return { amount: '\u2014', percent: '\u2014' };
  }
  const margin = price - cost;
  const amount = `$${margin.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  const percent = cost > 0 ? `${Math.round((margin / cost) * 100)}%` : '\u2014';
  return { amount, percent };
}
