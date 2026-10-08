import { render } from '@testing-library/react';

import {
  makeDimension,
  makeProduct,
  renderedTexts,
} from '@/components/products/__fixtures__/products';
import type { Product, ProductDimension } from '@/components/products/types';
import { ProductOverrideTable } from '../ProductOverrideTable';

const lisa = makeDimension('Lisa');
const negro = makeDimension('Negro');
const talleUnico = makeDimension('Talle Unico');

function productOf(
  typeName: string,
  name: ProductDimension,
  options: { isActive: boolean; size?: ProductDimension },
): Product {
  return {
    ...makeProduct({
      type: makeDimension(typeName),
      name,
      finish: lisa,
      color: negro,
      size: options.size ?? talleUnico,
    }),
    isActive: options.isActive,
  };
}

describe('ProductOverrideTable', () => {
  it('lists active products first, then inactive, each part in arrival order', () => {
    const hercules = makeDimension('Hercules');
    const products = [
      productOf('Mochila', makeDimension('Orion'), { isActive: true }),
      productOf('Billetera', makeDimension('Apolo'), { isActive: false }),
      productOf('Cinturon', hercules, {
        isActive: true,
        size: makeDimension('XS'),
      }),
      productOf('Cinturon', hercules, {
        isActive: true,
        size: makeDimension('S'),
      }),
      productOf('Accesorio', makeDimension('Atlas'), { isActive: false }),
    ];
    const displayNames = [
      'Mochila Orion Lisa Negro',
      'Billetera Apolo Lisa Negro',
      'Cinturon Hercules Lisa Negro XS',
      'Cinturon Hercules Lisa Negro S',
      'Accesorio Atlas Lisa Negro',
    ];

    render(
      <ProductOverrideTable
        products={products}
        overrides={{}}
        calcResults={null}
        onOverrideChange={jest.fn()}
      />,
    );

    expect(renderedTexts(displayNames)).toEqual([
      'Mochila Orion Lisa Negro',
      'Cinturon Hercules Lisa Negro XS',
      'Cinturon Hercules Lisa Negro S',
      'Billetera Apolo Lisa Negro',
      'Accesorio Atlas Lisa Negro',
    ]);
  });
});
