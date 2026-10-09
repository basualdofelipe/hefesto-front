'use client';

import { Fragment, type ReactElement } from 'react';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { CatalogItem, Product } from './types';
import { formatCost, formatMargin, formatSellingPrice } from './types';
import { ProductExpandedRow } from './ProductExpandedRow';
import type { SupplyOption } from '@/types/supply';

interface ProductFinishGroupProps {
  finishName: string;
  products: Product[];
  supplies: SupplyOption[];
  types: CatalogItem[];
  names: CatalogItem[];
  finishes: CatalogItem[];
  colors: CatalogItem[];
  sizes: CatalogItem[];
  canEdit: boolean;
}

export function ProductFinishGroup({
  finishName,
  products,
  supplies,
  types,
  names,
  finishes,
  colors,
  sizes,
  canEdit,
}: ProductFinishGroupProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const colSpan = 6;

  const avgCost = useMemo((): number | null => {
    const withCost = products.filter((p) => p.cost !== null);
    if (withCost.length === 0) return null;
    const total = withCost.reduce((sum, p) => sum + (p.cost as number), 0);
    return total / withCost.length;
  }, [products]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div
          role='button'
          tabIndex={0}
          className='hover:bg-muted/50 flex w-full cursor-pointer items-center gap-2 rounded-md py-1 pr-3 pl-10 text-left transition-colors'
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsOpen(!isOpen);
            }
          }}
        >
          <ChevronDown
            className={`size-3 shrink-0 transition-transform duration-200 ${
              isOpen ? '' : '-rotate-90'
            }`}
          />
          <span className='text-sm'>{finishName}</span>
          <Badge variant='secondary' className='ml-1 text-xs'>
            {products.length}
          </Badge>
          {avgCost !== null && (
            <Badge variant='outline' className='ml-1 text-xs'>
              Costo prom: {formatCost(avgCost)}
            </Badge>
          )}
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className='ml-12 rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Talle</TableHead>
                <TableHead className='text-right'>Costo</TableHead>
                <TableHead className='text-right'>Precio Venta</TableHead>
                <TableHead className='text-right'>Margen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={colSpan}
                    className='text-muted-foreground h-16 text-center'
                  >
                    No hay productos en esta terminacion.
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <Fragment key={product.id}>
                    <TableRow
                      className={`cursor-pointer ${
                        !product.isActive ? 'opacity-50' : ''
                      } ${expandedId === product.id ? 'bg-muted/30' : ''}`}
                      onClick={() =>
                        setExpandedId(
                          expandedId === product.id ? null : product.id,
                        )
                      }
                    >
                      <TableCell className='font-mono text-sm'>
                        <Link
                          href={`/productos/${product.id}`}
                          className='text-primary font-mono text-sm hover:underline'
                          onClick={(e) => e.stopPropagation()}
                        >
                          {product.skuCode}
                        </Link>
                      </TableCell>
                      <TableCell>{product.color.name}</TableCell>
                      <TableCell>
                        {product.size.name === 'Unico'
                          ? '\u2014'
                          : product.size.name}
                      </TableCell>
                      <TableCell className='text-right'>
                        {product.cost === null &&
                        product.costWarnings.length === 0 ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>{formatCost(product.cost)}</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                Sin materiales definidos
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className='flex items-center justify-end gap-1'>
                            {formatCost(product.cost)}
                            {product.costWarnings.length > 0 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertTriangle className='size-3.5 text-amber-500' />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {product.costWarnings.map((w, i) => (
                                      <p key={i}>{w}</p>
                                    ))}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className='text-right'>
                        {formatSellingPrice(product.currentPrice)}
                      </TableCell>
                      <TableCell className='text-right'>
                        {(() => {
                          const margin = formatMargin(
                            product.cost,
                            product.currentPrice,
                          );
                          return (
                            <span>
                              {margin.amount}
                              {margin.percent !== '\u2014' && (
                                <span className='text-muted-foreground ml-1 text-xs'>
                                  ({margin.percent})
                                </span>
                              )}
                            </span>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                    {expandedId === product.id && (
                      <ProductExpandedRow
                        key={`${product.id}-expanded`}
                        product={product}
                        supplies={supplies}
                        types={types}
                        names={names}
                        finishes={finishes}
                        colors={colors}
                        sizes={sizes}
                        canEdit={canEdit}
                        colSpan={colSpan}
                      />
                    )}
                  </Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
