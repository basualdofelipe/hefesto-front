import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  makeDimension,
  makeProduct,
  renderedTexts,
} from '@/components/products/__fixtures__/products';
import type { Product, ProductDimension } from '@/components/products/types';
import { ProductSelector } from '../ProductSelector';

const lisa = makeDimension('Lisa');
const negro = makeDimension('Negro');

function productOf(
  type: ProductDimension,
  name: ProductDimension,
  size: ProductDimension,
  isActive = true,
): Product {
  return {
    ...makeProduct({ type, name, finish: lisa, color: negro, size }),
    isActive,
  };
}

describe('ProductSelector', () => {
  it('lists type groups and their products in arrival order, skipping inactive products', async () => {
    const mochila = makeDimension('Mochila');
    const cinturon = makeDimension('Cinturon');
    const billetera = makeDimension('Billetera');
    const hercules = makeDimension('Hercules');
    const sizes = ['XS', 'S', 'M', 'L', 'XL'];

    const products = [
      productOf(mochila, makeDimension('Orion'), makeDimension('Talle Unico')),
      ...sizes.map((size) =>
        productOf(cinturon, hercules, makeDimension(size)),
      ),
      productOf(
        billetera,
        makeDimension('Apolo'),
        makeDimension('Talle Unico'),
        false,
      ),
    ];

    render(
      <ProductSelector
        products={products}
        selectedProductId={null}
        onProductSelect={jest.fn()}
      />,
    );
    const user = userEvent.setup({ delay: null });
    await user.click(screen.getByRole('combobox'));

    expect(renderedTexts(['Mochila', 'Cinturon', 'Billetera'])).toEqual([
      'Mochila',
      'Cinturon',
    ]);
    expect(
      screen.getAllByRole('option').map((option) => option.textContent),
    ).toEqual([
      'Mochila Orion Lisa Negro',
      ...sizes.map((size) => `Cinturon Hercules Lisa Negro ${size}`),
    ]);
  });
});
