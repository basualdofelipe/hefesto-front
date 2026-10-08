'use client';

import type { ReactElement } from 'react';
import { useState } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { SupplyOption } from '@/types/supply';

export function SupplyCombobox({
  supplies,
  value,
  onChange,
}: {
  supplies: SupplyOption[];
  value: string;
  onChange: (supplyId: string) => void;
}): ReactElement {
  const [open, setOpen] = useState(false);

  // Groups keep the catalog order the API sends (D-11). Keyed by type name
  // (SupplyOption carries no type id; catalog names are unique). A Map keeps
  // insertion order for every key, unlike a plain object.
  const grouped = new Map<string, SupplyOption[]>();
  for (const supply of supplies) {
    const typeSupplies = grouped.get(supply.type.name);
    if (typeSupplies) {
      typeSupplies.push(supply);
    } else {
      grouped.set(supply.type.name, [supply]);
    }
  }

  const selected = supplies.find((s) => s.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          className='w-full justify-between'
          size='sm'
        >
          <span className='truncate'>
            {selected ? selected.name : 'Seleccionar insumo...'}
          </span>
          <ChevronsUpDown className='ml-1 size-3 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-80 p-0' align='start'>
        <Command>
          <CommandInput placeholder='Buscar insumo...' />
          <CommandList>
            <CommandEmpty>No se encontraron insumos.</CommandEmpty>
            {Array.from(grouped.entries()).map(([typeName, typeSupplies]) => (
              <CommandGroup key={typeName} heading={typeName}>
                {typeSupplies.map((supply) => (
                  <CommandItem
                    key={supply.id}
                    value={`${supply.name} ${supply.supplier?.name ?? ''}`}
                    onSelect={() => {
                      onChange(supply.id);
                      setOpen(false);
                    }}
                  >
                    <span className='truncate'>{supply.name}</span>
                    {supply.supplier?.name && (
                      <span className='text-muted-foreground ml-auto text-xs'>
                        {supply.supplier.name}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
