import { fireEvent, render, screen, within } from '@testing-library/react';

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

import { ProductNameGroup } from '../ProductNameGroup';
import type { Product, ProductDimension } from '../types';
import {
  makeDimension,
  makeProduct,
  renderedTexts,
} from '../__fixtures__/products';

const SIZES_IN_CATALOG_ORDER = ['XS', 'S', 'M', 'L', 'XL'];

function buildProducts(): Product[] {
  const cinturon = makeDimension('Cinturon');
  const hefesto = makeDimension('Hefesto');
  const marron = makeDimension('Marron');
  const saffiano = makeDimension('Saffiano');
  const lisa = makeDimension('Lisa');
  const grabada = makeDimension('Grabada');

  function variant(finish: ProductDimension, sizeName: string): Product {
    return makeProduct({
      type: cinturon,
      name: hefesto,
      finish,
      color: marron,
      size: makeDimension(sizeName),
    });
  }

  return [
    variant(saffiano, 'M'),
    ...SIZES_IN_CATALOG_ORDER.map((size) => variant(lisa, size)),
    variant(grabada, 'M'),
  ];
}

function renderGroup(): void {
  render(
    <ProductNameGroup
      productName='Hefesto'
      products={buildProducts()}
      supplies={[]}
      types={[]}
      names={[]}
      finishes={[]}
      colors={[]}
      sizes={[]}
      canEdit={false}
    />,
  );
  fireEvent.click(screen.getByText('Hefesto'));
}

describe('ProductNameGroup', () => {
  it('renders finish groups in the order the API returned them (not alphabetical)', () => {
    renderGroup();

    expect(renderedTexts(['Saffiano', 'Lisa', 'Grabada'])).toEqual([
      'Saffiano',
      'Lisa',
      'Grabada',
    ]);
  });

  it('renders the variants of a finish in arrival order (XS, S, M, L, XL)', () => {
    renderGroup();
    fireEvent.click(screen.getByText('Lisa'));

    const [, ...variantRows] = within(screen.getByRole('table')).getAllByRole(
      'row',
    );
    const sizeCells = variantRows.map(
      (row) => within(row).getAllByRole('cell')[2].textContent,
    );

    expect(sizeCells).toEqual(SIZES_IN_CATALOG_ORDER);
  });
});
