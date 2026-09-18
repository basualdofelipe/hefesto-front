'use client';

import type { ReactElement } from 'react';
import { Separator } from '@/components/ui/separator';
import type { CalcResult, CalcInverseResult } from './types';

type CalcMode = 'forward' | 'inverse';

interface DesglosePanelProps {
  result: CalcResult | CalcInverseResult;
  mode: CalcMode;
  installments: number;
}

const arsFormat = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
});

function formatArs(value: number): string {
  return arsFormat.format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

interface LineItemProps {
  label: string;
  value: string;
  variant?:
    | 'negative'
    | 'positive'
    | 'neutral'
    | 'highlight-green'
    | 'highlight-blue';
  bold?: boolean;
  indent?: boolean;
  large?: boolean;
}

function LineItem({
  label,
  value,
  variant = 'neutral',
  bold = false,
  indent = false,
  large = false,
}: LineItemProps): ReactElement {
  const colorClass =
    variant === 'negative'
      ? 'text-red-600 dark:text-red-400'
      : variant === 'positive'
        ? 'text-green-600 dark:text-green-400'
        : variant === 'highlight-green'
          ? 'text-green-700 dark:text-green-300'
          : variant === 'highlight-blue'
            ? 'text-blue-700 dark:text-blue-300'
            : 'text-foreground';

  return (
    <div
      className={`flex items-center justify-between py-1 ${indent ? 'pl-4' : ''} ${large ? 'py-2' : ''}`}
    >
      <span
        className={`text-sm ${bold ? 'font-semibold' : ''} ${large ? 'text-base' : ''} text-muted-foreground`}
      >
        {label}
      </span>
      <span
        className={`text-sm ${bold ? 'font-semibold' : ''} ${large ? 'text-lg font-semibold' : ''} ${colorClass} tabular-nums`}
      >
        {value}
      </span>
    </div>
  );
}

export function DesglosePanel({
  result,
  mode,
  installments,
}: DesglosePanelProps): ReactElement {
  const isInverse = mode === 'inverse';
  const inverseResult = isInverse ? (result as CalcInverseResult) : null;

  return (
    <div className='space-y-1'>
      {/* Inverse mode: show required selling price at top */}
      {isInverse && inverseResult && (
        <div className='mb-3 rounded-lg bg-blue-50 p-3 dark:bg-blue-950/30'>
          <LineItem
            label='Precio de venta necesario'
            value={formatArs(inverseResult.requiredSellingPrice)}
            variant='highlight-blue'
            bold
            large
          />
        </div>
      )}

      {/* Total paid by client */}
      <LineItem
        label='Total pagado por cliente'
        value={formatArs(result.customerTotal)}
        bold
      />

      <Separator className='my-2' />

      {/* Deductions */}
      <LineItem
        label={`Comisión pasarela (${formatPercent(result.baseRate)} + IVA = ${formatPercent(result.rateWithIva)})`}
        value={`-${formatArs(result.gatewayFee)}`}
        variant='negative'
      />

      {installments > 1 && (
        <LineItem
          label={`Financiación cuotas (${formatPercent(result.installmentRate)}, según config)`}
          value={`-${formatArs(result.financingCost)}`}
          variant='negative'
        />
      )}

      <LineItem
        label='CPT Tiendanube (según config)'
        value={`-${formatArs(result.cpt)}`}
        variant='negative'
      />

      <LineItem
        label='Retenciones IIBB'
        value={`-${formatArs(result.iibbWithholding)}`}
        variant='negative'
      />

      <LineItem
        label='Neto recibido'
        value={formatArs(result.netReceived)}
        bold
      />

      <Separator className='my-2' />

      {/* IVA breakdown */}
      <LineItem
        label='IVA débito fiscal'
        value={`-${formatArs(result.ivaDebit)}`}
        variant='negative'
      />
      <LineItem
        label='IVA crédito producto'
        value={`+${formatArs(result.ivaCreditProduct)}`}
        variant='positive'
        indent
      />
      <LineItem
        label='IVA crédito comisión'
        value={`+${formatArs(result.ivaCreditGatewayFee)}`}
        variant='positive'
        indent
      />
      <LineItem
        label='IVA crédito envío'
        value={`+${formatArs(result.ivaCreditShipping)}`}
        variant='positive'
        indent
      />
      <LineItem
        label='IVA neto a pagar'
        value={`-${formatArs(result.ivaNet)}`}
        variant='negative'
      />

      {/* Product and shipping costs */}
      <LineItem
        label='Costo producto + IVA'
        value={`-${formatArs(result.productCostWithIva)}`}
        variant='negative'
      />
      <LineItem
        label='Costo de envío (con IVA)'
        value={`-${formatArs(result.shippingCost)}`}
        variant='negative'
      />

      <Separator className='my-2' />

      {/* Real profit -- highlighted green, large */}
      <div className='rounded-lg bg-green-50 p-3 dark:bg-green-950/30'>
        <LineItem
          label={`GANANCIA REAL (margen ${formatPercent(result.marginPercent)})`}
          value={formatArs(result.realProfit)}
          variant='highlight-green'
          bold
          large
        />
      </div>

      {/* Disclaimers */}
      <p className='text-muted-foreground pt-3 text-xs'>
        Valores aproximados sujetos a variaciones de tasas y redondeos de la
        pasarela de pago.
      </p>
      <p className='text-muted-foreground text-xs'>
        La fórmula asume Responsable Inscripto (IVA débito/crédito).
      </p>
    </div>
  );
}
