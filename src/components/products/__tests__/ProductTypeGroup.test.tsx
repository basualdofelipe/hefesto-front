import { render } from '@testing-library/react';

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

import { ProductTypeGroup } from '../ProductTypeGroup';
import type { Product, ProductDimension } from '../types';
import {
  makeDimension,
  makeProduct,
  renderedTexts,
} from '../__fixtures__/products';

describe('ProductTypeGroup', () => {
  it('renders name groups in the order the API returned them (not alphabetical)', () => {
    const billetera = makeDimension('Billetera');
    const orion = makeDimension('Orion');
    const apolo = makeDimension('Apolo');
    const hefesto = makeDimension('Hefesto');

    function productNamed(name: ProductDimension): Product {
      return makeProduct({
        type: billetera,
        name,
        finish: makeDimension('Lisa'),
        color: makeDimension('Negro'),
        size: makeDimension('Unico'),
      });
    }

    const products = [
      productNamed(orion),
      productNamed(apolo),
      productNamed(orion),
      productNamed(hefesto),
    ];

    render(
      <ProductTypeGroup
        typeName='Billetera'
        products={products}
        supplies={[]}
        types={[]}
        names={[]}
        finishes={[]}
        colors={[]}
        sizes={[]}
        canEdit={false}
      />,
    );

    expect(renderedTexts(['Orion', 'Apolo', 'Hefesto'])).toEqual([
      'Orion',
      'Apolo',
      'Hefesto',
    ]);
  });
});
