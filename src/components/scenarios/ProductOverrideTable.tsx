'use client';

import type { ReactElement } from 'react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { Product } from '@/components/products/types';
import {
  getProductDisplayName,
  formatCost,
  formatSellingPrice,
} from '@/components/products/types';
import type { ScenarioProductResult } from './types';

interface ProductOverrideTableProps {
  products: Product[];
  overrides: Record<string, number>;
  calcResults: ScenarioProductResult[] | null;
  onOverrideChange: (productId: string, value: number | null) => void;
  /** Increment to force DebouncedInput remount (e.g., after bulk override) */
  resetKey?: number;
}

// Debounced input to prevent re-rendering the entire table on each keystroke.
// Uses uncontrolled internal state initialized from defaultValue. Parent sync
// is handled via React key prop at the call site (key changes = remount).
function DebouncedInput({
  defaultValue,
  onChange,
  ...props
}: {
  defaultValue: string;
  onChange: (v: number | null) => void;
} & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'defaultValue' | 'onChange'
>): ReactElement {
  const [localValue, setLocalValue] = useState<string>(defaultValue);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const raw = e.target.value;
    setLocalValue(raw);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (raw === '' || raw === undefined) {
        onChange(null);
      } else {
        const parsed = parseInt(raw, 10);
        if (!isNaN(parsed) && parsed >= 0) onChange(parsed);
      }
    }, 300);
  }

  useEffect(() => {
    return (): void => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return <Input {...props} value={localValue} onChange={handleChange} />;
}

function formatResultMargin(
  result: ScenarioProductResult | undefined,
  field: 'realResult' | 'simResult',
): string {
  if (!result) return '\u2014';
  const calc = result[field];
  if (!calc) return '\u2014';
  return `$${calc.realProfit.toLocaleString('es-AR')} (${calc.marginPercent.toFixed(1)}%)`;
}

export function ProductOverrideTable({
  products,
  overrides,
  calcResults,
  onOverrideChange,
  resetKey = 0,
}: ProductOverrideTableProps): ReactElement {
  const resultsMap = useMemo(
    () => new Map(calcResults?.map((r) => [r.productId, r]) ?? []),
    [calcResults],
  );

  // Sort: active first, then by type name, then by product name
  const sortedProducts = useMemo(
    () =>
      [...products].sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        const typeCmp = a.type.name.localeCompare(b.type.name);
        if (typeCmp !== 0) return typeCmp;
        return a.name.name.localeCompare(b.name.name);
      }),
    [products],
  );

  return (
    <div className='rounded-md border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead className='w-[100px] text-right'>Costo</TableHead>
            <TableHead className='w-[110px] text-right'>Precio real</TableHead>
            <TableHead className='w-[130px] text-right'>
              Precio override
            </TableHead>
            <TableHead className='w-[100px] text-right'>Margen real</TableHead>
            <TableHead className='w-[110px] text-right'>
              Margen simulado
            </TableHead>
            <TableHead className='w-[90px] text-right'>Diferencia</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedProducts.map((product) => {
            const hasOverride = overrides[product.id] !== undefined;
            const result = resultsMap.get(product.id);
            const simProfit = result?.simResult?.realProfit ?? 0;
            const realProfit = result?.realResult?.realProfit ?? 0;
            const diff = result?.simResult ? simProfit - realProfit : null;

            return (
              <TableRow
                key={product.id}
                className={!product.isActive ? 'opacity-60' : ''}
              >
                <TableCell>
                  <span className='text-sm'>
                    {getProductDisplayName(product)}
                  </span>
                  {!product.isActive && (
                    <Badge variant='outline' className='ml-2 text-xs'>
                      (inactivo)
                    </Badge>
                  )}
                </TableCell>
                <TableCell className='text-right text-sm tabular-nums'>
                  {formatCost(product.cost)}
                </TableCell>
                <TableCell className='text-right text-sm tabular-nums'>
                  {formatSellingPrice(product.currentPrice)}
                </TableCell>
                <TableCell className='text-right'>
                  <DebouncedInput
                    key={`${product.id}-${resetKey}`}
                    type='number'
                    step='1'
                    min='0'
                    defaultValue={overrides[product.id]?.toString() ?? ''}
                    onChange={(v) => onOverrideChange(product.id, v)}
                    className={`h-8 w-full text-right font-mono text-sm tabular-nums ${
                      hasOverride
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300'
                        : ''
                    }`}
                    placeholder='$'
                  />
                </TableCell>
                <TableCell className='text-right text-sm tabular-nums'>
                  {formatResultMargin(result, 'realResult')}
                </TableCell>
                <TableCell
                  className={`text-right text-sm tabular-nums ${
                    diff !== null && diff > 0
                      ? 'text-green-600 dark:text-green-400'
                      : diff !== null && diff < 0
                        ? 'text-red-600 dark:text-red-400'
                        : ''
                  }`}
                >
                  {formatResultMargin(result, 'simResult')}
                </TableCell>
                <TableCell className='text-right text-sm'>
                  {diff !== null && diff !== 0 ? (
                    <span
                      className={`inline-flex items-center gap-1 tabular-nums ${
                        diff > 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {diff > 0 ? (
                        <TrendingUp className='h-3.5 w-3.5' />
                      ) : (
                        <TrendingDown className='h-3.5 w-3.5' />
                      )}
                      {diff > 0 ? '+' : '-'}$
                      {Math.abs(diff).toLocaleString('es-AR')}
                    </span>
                  ) : (
                    '\u2014'
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
