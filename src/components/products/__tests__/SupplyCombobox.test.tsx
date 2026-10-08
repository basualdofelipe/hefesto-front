import { fireEvent, render, screen } from '@testing-library/react';

import type { SupplyOption } from '@/types/supply';
import { SupplyCombobox } from '../SupplyCombobox';
import { renderedTexts } from '../__fixtures__/products';

let seq = 200;

function supplyOption(typeName: string, name: string): SupplyOption {
  seq += 1;
  return {
    id: `00000000-0000-4000-8000-${seq.toString().padStart(12, '0')}`,
    name,
    unitType: 'unidad',
    isActive: true,
    type: { name: typeName },
  };
}

function openPicker(supplies: SupplyOption[]): void {
  render(<SupplyCombobox supplies={supplies} value='' onChange={jest.fn()} />);
  fireEvent.click(screen.getByRole('combobox'));
}

describe('SupplyCombobox', () => {
  it('lists supply type groups in the order the API returned them, numeric-looking names included', () => {
    openPicker([
      supplyOption('Herraje', 'Hebilla'),
      supplyOption('Cuero', 'Vaqueta'),
      supplyOption('2024', 'Etiqueta'),
    ]);

    expect(renderedTexts(['Herraje', 'Cuero', '2024'])).toEqual([
      'Herraje',
      'Cuero',
      '2024',
    ]);
  });
});
