import { render } from '@testing-library/react';

jest.mock('@/hooks/usePermissions', () => ({
  usePermissions: (): { canEditSupplies: boolean } => ({
    canEditSupplies: false,
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

import { renderedTexts } from '@/components/products/__fixtures__/products';
import { SupplyTable } from '../SupplyTable';
import type { Supplier, Supply, SupplyType } from '../types';

const SUPPLIER: Supplier = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Curtiembre Sur',
};

let seq = 100;

function nextUuid(): string {
  seq += 1;
  return `00000000-0000-4000-8000-${seq.toString().padStart(12, '0')}`;
}

function supplyType(name: string): SupplyType {
  return { id: nextUuid(), name };
}

function supplyOf(type: SupplyType, name: string): Supply {
  return {
    id: nextUuid(),
    name,
    type,
    supplier: SUPPLIER,
    unitType: 'unidad',
    notes: null,
    isActive: true,
    currentPrice: null,
    lastPriceUpdate: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

function renderTable(supplies: Supply[]): void {
  render(
    <SupplyTable
      initialSupplies={supplies}
      supplyTypes={[]}
      suppliers={[SUPPLIER]}
      canEdit={false}
    />,
  );
}

describe('SupplyTable', () => {
  it('renders supply type groups in the order the API returned them, numeric-looking names included', () => {
    renderTable([
      supplyOf(supplyType('Herraje'), 'Hebilla'),
      supplyOf(supplyType('Cuero'), 'Vaqueta'),
      supplyOf(supplyType('2024'), 'Etiqueta'),
    ]);

    expect(renderedTexts(['Herraje', 'Cuero', '2024'])).toEqual([
      'Herraje',
      'Cuero',
      '2024',
    ]);
  });

  it('keeps supplies of one type together in the group of their first arrival', () => {
    const herraje = supplyType('Herraje');
    const cuero = supplyType('Cuero');

    renderTable([
      supplyOf(herraje, 'Hebilla'),
      supplyOf(cuero, 'Vaqueta'),
      supplyOf(herraje, 'Argolla'),
    ]);

    expect(
      renderedTexts(['Herraje', 'Cuero', 'Hebilla', 'Vaqueta', 'Argolla']),
    ).toEqual(['Herraje', 'Hebilla', 'Argolla', 'Cuero', 'Vaqueta']);
  });
});
