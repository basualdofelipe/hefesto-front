'use client';

import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { CatalogItem, Product } from './types';
import { formatCost } from './types';
import { BatchPriceDialog } from './BatchPriceDialog';
import { ProductNameGroup } from './ProductNameGroup';
import type { SupplyOption } from '@/types/supply';

interface ProductTypeGroupProps {
  typeName: string;
  products: Product[];
  supplies: SupplyOption[];
  types: CatalogItem[];
  names: CatalogItem[];
  finishes: CatalogItem[];
  colors: CatalogItem[];
  sizes: CatalogItem[];
  canEdit: boolean;
}

export function ProductTypeGroup({
  typeName,
  products,
  supplies,
  types,
  names,
  finishes,
  colors,
  sizes,
  canEdit,
}: ProductTypeGroupProps): ReactElement {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);
  const [showBatchPrice, setShowBatchPrice] = useState(false);

  const avgCost = useMemo((): number | null => {
    const withCost = products.filter((p) => p.cost !== null);
    if (withCost.length === 0) return null;
    const total = withCost.reduce((sum, p) => sum + (p.cost as number), 0);
    return total / withCost.length;
  }, [products]);

  // Sub-group by name, keeping the catalog order the API returned (D-11)
  const nameGroups = useMemo((): {
    nameId: string;
    productName: string;
    products: Product[];
  }[] => {
    const groups = new Map<string, Product[]>();
    for (const product of products) {
      const group = groups.get(product.name.id);
      if (group) {
        group.push(product);
      } else {
        groups.set(product.name.id, [product]);
      }
    }

    return Array.from(groups.entries()).map(([nameId, groupProducts]) => ({
      nameId,
      productName: groupProducts[0].name.name,
      products: groupProducts,
    }));
  }, [products]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div
          role='button'
          tabIndex={0}
          className='hover:bg-muted/50 flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left transition-colors'
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsOpen(!isOpen);
            }
          }}
        >
          <ChevronDown
            className={`size-4 shrink-0 transition-transform duration-200 ${
              isOpen ? '' : '-rotate-90'
            }`}
          />
          <span className='font-semibold'>{typeName}</span>
          <Badge variant='secondary' className='ml-1'>
            {products.length} {products.length === 1 ? 'producto' : 'productos'}
          </Badge>
          {avgCost !== null && (
            <Badge variant='outline' className='ml-1'>
              Costo prom: {formatCost(avgCost)}
            </Badge>
          )}
          {canEdit && (
            <div
              className='ml-auto flex items-center gap-1'
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                size='sm'
                variant='ghost'
                className='h-7 text-xs'
                onClick={() => setShowBatchPrice(true)}
              >
                <DollarSign className='mr-1 size-3' />
                Precio grupal
              </Button>
            </div>
          )}
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className='space-y-1'>
          {nameGroups.map((group) => (
            <ProductNameGroup
              key={group.nameId}
              productName={group.productName}
              products={group.products}
              supplies={supplies}
              types={types}
              names={names}
              finishes={finishes}
              colors={colors}
              sizes={sizes}
              canEdit={canEdit}
            />
          ))}
        </div>
      </CollapsibleContent>

      <BatchPriceDialog
        products={products}
        open={showBatchPrice}
        onOpenChange={setShowBatchPrice}
        onSuccess={() => router.refresh()}
      />
    </Collapsible>
  );
}
