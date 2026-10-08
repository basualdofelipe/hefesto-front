import { orderByIds, sameOrder } from '@/components/catalogs/catalog-order';

interface Item {
  id: string;
  name: string;
}

const a: Item = { id: 'a', name: 'Alfa' };
const b: Item = { id: 'b', name: 'Beta' };
const c: Item = { id: 'c', name: 'Gamma' };
const n: Item = { id: 'n', name: 'Nuevo' };

describe('sameOrder', () => {
  it('is true for the same ids in the same order', () => {
    expect(sameOrder(['a', 'b'], ['a', 'b'])).toBe(true);
  });

  it('is false for the same ids in a different order', () => {
    expect(sameOrder(['a', 'b'], ['b', 'a'])).toBe(false);
  });

  it('is false when the lengths differ', () => {
    expect(sameOrder(['a'], ['a', 'b'])).toBe(false);
    expect(sameOrder(['a', 'b'], ['a'])).toBe(false);
  });

  it('is true for two empty lists', () => {
    expect(sameOrder([], [])).toBe(true);
  });
});

describe('orderByIds', () => {
  it('returns the items in the order of the ids, keeping the same objects', () => {
    const result = orderByIds([a, b, c], ['c', 'a', 'b']);

    expect(result.map((item) => item.id)).toEqual(['c', 'a', 'b']);
    expect(result[0]).toBe(c);
    expect(result[1]).toBe(a);
    expect(result[2]).toBe(b);
  });

  it('skips ids that name an item that no longer exists', () => {
    const result = orderByIds([a, b], ['x', 'b', 'a']);

    expect(result.map((item) => item.id)).toEqual(['b', 'a']);
  });

  it('puts items absent from the ids after the listed ones, in their current order', () => {
    const result = orderByIds([a, n, b], ['b', 'a']);

    expect(result.map((item) => item.id)).toEqual(['b', 'a', 'n']);
  });

  it('keeps several unlisted items in their current relative order', () => {
    const result = orderByIds([n, a, c, b], ['b']);

    expect(result.map((item) => item.id)).toEqual(['b', 'n', 'a', 'c']);
  });

  it('does not mutate its inputs', () => {
    const items = [a, b, c];
    const ids = ['c', 'b', 'a'];

    orderByIds(items, ids);

    expect(items.map((item) => item.id)).toEqual(['a', 'b', 'c']);
    expect(ids).toEqual(['c', 'b', 'a']);
  });

  it('returns a new array even when the order is unchanged', () => {
    const items = [a, b];

    const result = orderByIds(items, ['a', 'b']);

    expect(result).toEqual(items);
    expect(result).not.toBe(items);
  });
});
