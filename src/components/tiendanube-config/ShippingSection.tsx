'use client';

import type { ReactElement } from 'react';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClientFetch } from '@/lib/api-client';
import type { TnShippingConfig } from './types';

// Client mirror of UpdateShippingConfigDto's @Min(0) @Max(1000000000) so the
// admin gets a local toast instead of a server 400 (same pattern as the 0-100
// range check in TaxConfigSection).
const MAX_SHIPPING = 1000000000;

const RANGE_ERROR_MESSAGE =
  'El envío por defecto debe ser un número entre 0 y 1.000.000.000';

interface ShippingSectionProps {
  shipping: TnShippingConfig | null;
}

function isOutOfRange(value: number): boolean {
  return isNaN(value) || value < 0 || value > MAX_SHIPPING;
}

export function ShippingSection({
  shipping,
}: ShippingSectionProps): ReactElement {
  const { data: session } = useSession();
  const token = session?.accessToken ?? '';

  const [chargedValue, setChargedValue] = useState(
    (shipping?.defaultShippingCharged ?? 0).toFixed(2),
  );
  const [costValue, setCostValue] = useState(
    (shipping?.defaultShippingCost ?? 0).toFixed(2),
  );
  const [saving, setSaving] = useState(false);

  async function handleSave(): Promise<void> {
    const defaultShippingCharged = parseFloat(chargedValue);
    const defaultShippingCost = parseFloat(costValue);

    if (
      isOutOfRange(defaultShippingCharged) ||
      isOutOfRange(defaultShippingCost)
    ) {
      toast.error(RANGE_ERROR_MESSAGE);
      return;
    }

    setSaving(true);
    try {
      await apiClientFetch('/api/tiendanube-config/shipping', token, {
        method: 'PUT',
        body: JSON.stringify({ defaultShippingCharged, defaultShippingCost }),
      });
      toast.success('Envío por defecto actualizado');
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Error al guardar el envío por defecto',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className='space-y-4'>
      <div className='grid gap-4 sm:grid-cols-2'>
        <div className='space-y-2'>
          <Label htmlFor='default-shipping-charged'>
            Envío cobrado al cliente
          </Label>
          <Input
            id='default-shipping-charged'
            type='number'
            step='0.01'
            min='0'
            max={MAX_SHIPPING}
            value={chargedValue}
            onChange={(e) => setChargedValue(e.target.value)}
            className='w-40'
            disabled={saving}
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='default-shipping-cost'>
            Costo real del envío (con IVA)
          </Label>
          <Input
            id='default-shipping-cost'
            type='number'
            step='0.01'
            min='0'
            max={MAX_SHIPPING}
            value={costValue}
            onChange={(e) => setCostValue(e.target.value)}
            className='w-40'
            disabled={saving}
          />
          <p className='text-muted-foreground text-xs'>
            Valor con IVA que paga el vendedor al correo. Se usa en la
            calculadora, el batch y los escenarios; la calculadora permite
            cambiarlo por cálculo.
          </p>
        </div>
      </div>

      <Button onClick={() => void handleSave()} disabled={saving}>
        {saving && <Loader2 className='mr-2 size-4 animate-spin' />}
        Guardar
      </Button>
    </div>
  );
}
