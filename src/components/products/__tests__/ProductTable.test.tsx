import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('@/hooks/usePermissions', () => ({
  usePermissions: (): { canEditProducts: boolean } => ({
    canEditProducts: false,
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: (): { refresh: jest.Mock } => ({ refresh: jest.fn() }),
}));

jest.mock('next-auth/react', () => ({
  useSession: (): { data: null; status: 'unauthenticated' } => ({
    data: null,
    status: 'unauthenticated',
  }),
}));

jest.mock('@/lib/api-client', () => ({
  apiClientFetch: jest.fn(),
}));

import { ProductTable } from '../ProductTable';
import type { Product, ProductDimension } from '../types';
import {
  makeDimension,
  makeProduct,
  renderedTexts,
} from '../__fixtures__/products';

function renderTable(products: Product[]): void {
  render(
    <ProductTable
      initialProducts={products}
      types={[]}
      names={[]}
      finishes={[]}
      colors={[]}
      sizes={[]}
      supplies={[]}
      canEdit={false}
    />,
  );
}

function productOf(type: ProductDimension, name: ProductDimension): Product {
  return makeProduct({
    type,
    name,
    finish: makeDimension('Lisa'),
    color: makeDimension('Negro'),
    size: makeDimension('Unico'),
  });
}

describe('ProductTable', () => {
  it('renders type groups in the order the API returned them (not alphabetical)', () => {
    const mochila = makeDimension('Mochila');
    const billetera = makeDimension('Billetera');
    const cinturon = makeDimension('Cinturon');

    renderTable([
      productOf(mochila, makeDimension('Orion')),
      productOf(billetera, makeDimension('Apolo')),
      productOf(mochila, makeDimension('Hermes')),
      productOf(cinturon, makeDimension('Hefesto')),
    ]);

    expect(renderedTexts(['Mochila', 'Billetera', 'Cinturon'])).toEqual([
      'Mochila',
      'Billetera',
      'Cinturon',
    ]);
  });

  it('keeps a numeric-looking type name in its arrival position', () => {
    renderTable([
      productOf(makeDimension('Mochila'), makeDimension('Orion')),
      productOf(makeDimension('2024'), makeDimension('Apolo')),
      productOf(makeDimension('Billetera'), makeDimension('Hefesto')),
    ]);

    expect(renderedTexts(['Mochila', '2024', 'Billetera'])).toEqual([
      'Mochila',
      '2024',
      'Billetera',
    ]);
  });

  it('search narrows the groups and keeps the relative order of the rest', () => {
    renderTable([
      productOf(makeDimension('Mochila'), makeDimension('Orion')),
      productOf(makeDimension('Cinturon'), makeDimension('Apolo')),
      productOf(makeDimension('Billetera'), makeDimension('Orion')),
    ]);

    fireEvent.change(screen.getByPlaceholderText('Buscar producto o SKU...'), {
      target: { value: 'orion' },
    });

    expect(renderedTexts(['Mochila', 'Cinturon', 'Billetera'])).toEqual([
      'Mochila',
      'Billetera',
    ]);
  });
});
