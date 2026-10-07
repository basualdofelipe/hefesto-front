'use client';

import type { ReactElement } from 'react';
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { ScenarioProductResult } from './types';

interface MarginSummaryProps {
  results: ScenarioProductResult[];
}

export function MarginSummary({ results }: MarginSummaryProps): ReactElement {
  const stats = useMemo(() => {
    const withOverride = results.filter((r) => r.overridePrice !== null);
    const withSimResult = results.filter((r) => r.simResult !== null);

    const avgMargin =
      withSimResult.length > 0
        ? withSimResult.reduce(
            (sum, r) => sum + (r.simResult?.marginPercent ?? 0),
            0,
          ) / withSimResult.length
        : 0;

    const totalMargin = withSimResult.reduce(
      (sum, r) => sum + (r.simResult?.realProfit ?? 0),
      0,
    );

    return {
      overrideCount: withOverride.length,
      totalProducts: results.length,
      avgMargin,
      totalMargin,
    };
  }, [results]);

  return (
    <Card>
      <CardContent className='pt-4'>
        <div className='flex flex-wrap gap-8'>
          <div className='space-y-1'>
            <p className='text-muted-foreground text-sm font-semibold'>
              Margen promedio
            </p>
            <p className='text-2xl font-semibold tabular-nums'>
              {stats.avgMargin.toFixed(1)}%
            </p>
          </div>
          <div className='space-y-1'>
            <p className='text-muted-foreground text-sm font-semibold'>
              Productos con override
            </p>
            <p className='text-2xl font-semibold tabular-nums'>
              {stats.overrideCount}/{stats.totalProducts}
            </p>
          </div>
          <div className='space-y-1'>
            <p className='text-muted-foreground text-sm font-semibold'>
              Margen total simulado
            </p>
            <p className='text-2xl font-semibold tabular-nums'>
              ${stats.totalMargin.toLocaleString('es-AR')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
