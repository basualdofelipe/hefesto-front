import { formatSellingPrice } from '../types';

describe('formatSellingPrice', () => {
  it('formats a numeric price with es-AR grouping', () => {
    expect(formatSellingPrice(150000)).toBe('$150.000');
  });

  it('formats the decimal string the API actually sends', () => {
    // The products endpoint returns Postgres decimals as strings.
    const apiPrice = '150000.00' as unknown as number;

    expect(formatSellingPrice(apiPrice)).toBe('$150.000');
  });

  it('shows a dash when there is no price', () => {
    expect(formatSellingPrice(null)).toBe('—');
  });
});
