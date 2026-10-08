import { screen } from '@testing-library/react';

import type { Product, ProductDimension } from '../types';

let dimensionSeq = 0;
let productSeq = 0;

function nextUuid(seq: number): string {
  return `00000000-0000-4000-8000-${seq.toString().padStart(12, '0')}`;
}

/** A catalog value with a fresh v4-shaped id. Reuse the same object for products that share it. */
export function makeDimension(name: string, skuCode = 1): ProductDimension {
  dimensionSeq += 1;
  return { id: nextUuid(dimensionSeq), name, skuCode };
}

export interface ProductDimensions {
  type: ProductDimension;
  name: ProductDimension;
  finish: ProductDimension;
  color: ProductDimension;
  size: ProductDimension;
}

export function makeProduct(dimensions: ProductDimensions): Product {
  productSeq += 1;
  return {
    id: nextUuid(1_000_000 + productSeq),
    skuCode: `SKU-${productSeq}`,
    ...dimensions,
    isActive: true,
    currentPrice: null,
    lastPriceUpdate: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    cost: null,
    costBreakdown: null,
    costWarnings: [],
  };
}

/**
 * Elements whose own text equals one of `candidates`, in document order.
 * Used to assert render order without depending on markup structure.
 */
export function renderedTexts(candidates: readonly string[]): string[] {
  return screen
    .getAllByText((content) => candidates.includes(content))
    .map((element) => element.textContent ?? '');
}
