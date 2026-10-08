'use client';

import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ChevronDown,
  ClipboardList,
  DollarSign,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { CatalogItem, Product } from './types';
import { formatCost } from './types';
import { BatchPriceDialog } from './BatchPriceDialog';
import { BomGroupEditorDialog } from './BomGroupEditorDialog';
import { ProductFinishGroup } from './ProductFinishGroup';
import type { SupplyOption } from '@/types/supply';

interface ProductNameGroupProps {
  productName: string;
  products: Product[];
  supplies: SupplyOption[];
  types: CatalogItem[];
  names: CatalogItem[];
  finishes: CatalogItem[];
  colors: CatalogItem[];
  sizes: CatalogItem[];
  canEdit: boolean;
}

export function ProductNameGroup({
  productName,
  products,
  supplies,
  types,
  names,
  finishes,
  colors,
  sizes,
  canEdit,
}: ProductNameGroupProps): ReactElement {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [showGroupBomEditor, setShowGroupBomEditor] = useState(false);
  const [showBatchPrice, setShowBatchPrice] = useState(false);
  const [hasDivergence, setHasDivergence] = useState(false);

  const avgCost = useMemo((): number | null => {
    const withCost = products.filter((p) => p.cost !== null);
    if (withCost.length === 0) return null;
    const total = withCost.reduce((sum, p) => sum + (p.cost as number), 0);
    return total / withCost.length;
  }, [products]);

  // Cost-based heuristic for BOM divergence detection
  const costBasedDivergence = useMemo((): boolean => {
    const withCost = products.filter((p) => p.cost !== null);
    if (withCost.length < 2) return false;

    // Find the majority cost (most common cost value, rounded to 2 decimals)
    const costCounts = new Map<number, number>();
    for (const p of withCost) {
      const rounded = Math.round((p.cost as number) * 100) / 100;
      costCounts.set(rounded, (costCounts.get(rounded) ?? 0) + 1);
    }

    let majorityCost = 0;
    let maxCount = 0;
    for (const [cost, count] of costCounts) {
      if (count > maxCount) {
        maxCount = count;
        majorityCost = cost;
      }
    }

    // Check if any product differs from the majority by more than $0.01
    for (const p of withCost) {
      const rounded = Math.round((p.cost as number) * 100) / 100;
      if (Math.abs(rounded - majorityCost) > 0.01) {
        return true;
      }
    }

    return false;
  }, [products]);

  const showDivergenceBadge = hasDivergence || costBasedDivergence;

  // Sub-group by finish, keeping the catalog order the API returned (D-11)
  const finishGroups = useMemo((): {
    finishId: string;
    finishName: string;
    products: Product[];
  }[] => {
    const groups = new Map<string, Product[]>();
    for (const product of products) {
      const group = groups.get(product.finish.id);
      if (group) {
        group.push(product);
      } else {
        groups.set(product.finish.id, [product]);
      }
    }

    return Array.from(groups.entries()).map(([finishId, groupProducts]) => ({
      finishId,
      finishName: groupProducts[0].finish.name,
      products: groupProducts,
    }));
  }, [products]);

  function handleDivergenceDetected(hasDivergent: boolean): void {
    setHasDivergence(hasDivergent);
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div
          role='button'
          tabIndex={0}
          className='hover:bg-muted/50 flex w-full cursor-pointer items-center gap-2 rounded-md py-1.5 pr-3 pl-6 text-left transition-colors'
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsOpen(!isOpen);
            }
          }}
        >
          <ChevronDown
            className={`size-3.5 shrink-0 transition-transform duration-200 ${
              isOpen ? '' : '-rotate-90'
            }`}
          />
          <span className='text-sm font-semibold'>{productName}</span>
          <Badge variant='secondary' className='ml-1 text-xs'>
            {products.length} {products.length === 1 ? 'producto' : 'productos'}
          </Badge>
          {avgCost !== null && (
            <Badge variant='outline' className='ml-1 text-xs'>
              Costo prom: {formatCost(avgCost)}
            </Badge>
          )}
          {showDivergenceBadge && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className='flex items-center'>
                    <Badge
                      variant='outline'
                      className='ml-1 border-amber-300 text-xs text-amber-600'
                    >
                      <AlertTriangle className='mr-1 size-3' />
                      BOM personalizado
                    </Badge>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  Algunos productos tienen BOM personalizado
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
                onClick={() => setShowGroupBomEditor(true)}
              >
                <ClipboardList className='mr-1 size-3' />
                Editar BOM grupal
              </Button>
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
          {finishGroups.map((group) => (
            <ProductFinishGroup
              key={group.finishId}
              finishName={group.finishName}
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

      <BomGroupEditorDialog
        products={products}
        supplies={supplies}
        open={showGroupBomEditor}
        onOpenChange={setShowGroupBomEditor}
        onSuccess={() => router.refresh()}
        groupName={productName}
        onDivergenceDetected={handleDivergenceDetected}
      />

      <BatchPriceDialog
        products={products}
        open={showBatchPrice}
        onOpenChange={setShowBatchPrice}
        onSuccess={() => router.refresh()}
      />
    </Collapsible>
  );
}
