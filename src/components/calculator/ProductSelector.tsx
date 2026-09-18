'use client';

import type { ReactElement } from 'react';
import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Product } from '@/components/products/types';
import { getProductDisplayName, formatCost } from '@/components/products/types';

interface ProductSelectorProps {
  products: Product[];
  selectedProductId: string | null;
  onProductSelect: (product: Product) => void;
}

interface GroupedProducts {
  typeName: string;
  products: Product[];
}

export function ProductSelector({
  products,
  selectedProductId,
  onProductSelect,
}: ProductSelectorProps): ReactElement {
  const grouped = useMemo((): GroupedProducts[] => {
    const map = new Map<string, Product[]>();
    for (const product of products) {
      if (!product.isActive) continue;
      const key = product.type.name;
      const existing = map.get(key) ?? [];
      existing.push(product);
      map.set(key, existing);
    }
    return Array.from(map.entries()).map(([typeName, prods]) => ({
      typeName,
      products: prods.sort((a, b) =>
        getProductDisplayName(a).localeCompare(getProductDisplayName(b)),
      ),
    }));
  }, [products]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  function handleValueChange(productId: string): void {
    const product = products.find((p) => p.id === productId);
    if (product) {
      onProductSelect(product);
    }
  }

  return (
    <div className='space-y-2'>
      <Select value={selectedProductId ?? ''} onValueChange={handleValueChange}>
        <SelectTrigger className='w-full'>
          <SelectValue placeholder='Selecciona un producto' />
        </SelectTrigger>
        <SelectContent>
          {grouped.map((group) => (
            <SelectGroup key={group.typeName}>
              <SelectLabel>{group.typeName}</SelectLabel>
              {group.products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {getProductDisplayName(product)}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>

      {selectedProduct && (
        <div className='text-sm'>
          {selectedProduct.cost !== null ? (
            <span className='text-muted-foreground'>
              Costo: {formatCost(selectedProduct.cost)}
            </span>
          ) : (
            <span className='flex items-center gap-1 text-amber-600'>
              <AlertTriangle className='size-3.5' />
              Sin costo definido
            </span>
          )}
        </div>
      )}
    </div>
  );
}
