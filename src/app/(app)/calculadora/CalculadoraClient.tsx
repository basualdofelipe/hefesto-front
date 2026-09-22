'use client';

import type { ReactElement } from 'react';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClientFetch } from '@/lib/api-client';
import type { Product } from '@/components/products/types';
import type { TiendanubeConfigAll } from '@/components/tiendanube-config/types';
import type {
  CalcResult,
  CalcInverseResult,
} from '@/components/calculator/types';
import { ModeToggle } from '@/components/calculator/ModeToggle';
import { ProductSelector } from '@/components/calculator/ProductSelector';
import {
  GatewaySelectors,
  type GatewayConfig,
} from '@/components/calculator/GatewaySelectors';
import { DesglosePanel } from '@/components/calculator/DesglosePanel';

type CalcMode = 'forward' | 'inverse';

interface CalculadoraClientProps {
  products: Product[];
  config: TiendanubeConfigAll;
}

const DEBOUNCE_MS = 300;

// Same copy as the backend's PRODUCT_COST_REQUIRED_MESSAGE so the user reads
// the same words whether the client or the server stops the calculation.
const PRODUCT_COST_REQUIRED_HINT = 'Definí el costo del producto primero';

export function CalculadoraClient({
  products,
  config,
}: CalculadoraClientProps): ReactElement {
  const { data: session } = useSession();

  const [mode, setMode] = useState<CalcMode>('forward');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sellingPrice, setSellingPrice] = useState<string>('');
  // Preloaded once from the configured default; edits are request-scoped and
  // never written back (the default is managed in /configuracion).
  const [shippingCharged, setShippingCharged] = useState<string>(
    String(config.shipping?.defaultShippingCharged ?? 0),
  );
  const [shippingCost, setShippingCost] = useState<string>(
    String(config.shipping?.defaultShippingCost ?? 0),
  );
  const [targetProfit, setTargetProfit] = useState<string>('');
  const [result, setResult] = useState<CalcResult | CalcInverseResult | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [gatewayConfig, setGatewayConfig] = useState<GatewayConfig | null>(
    null,
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A product without BOM has no cost: the backend answers 400, so the client
  // never asks and shows a hint instead (gated per product, not sticky).
  const productHasCost =
    selectedProduct !== null && selectedProduct.cost !== null;
  const productMissingCost =
    selectedProduct !== null && selectedProduct.cost === null;

  // Cleanup debounce on unmount
  useEffect(() => {
    return (): void => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const calculate = useCallback(async (): Promise<void> => {
    if (!session?.accessToken || !selectedProduct || !gatewayConfig) return;
    if (selectedProduct.cost === null) return;

    const shipping = {
      shippingCharged: parseFloat(shippingCharged) || 0,
      shippingCost: parseFloat(shippingCost) || 0,
    };
    const gateway = {
      gatewaySlug: gatewayConfig.gatewaySlug,
      paymentMethod: gatewayConfig.paymentMethod,
      withdrawalDays: gatewayConfig.withdrawalDays,
      installments: gatewayConfig.installments,
      planSlug: gatewayConfig.planSlug,
    };

    if (mode === 'forward') {
      const price = parseFloat(sellingPrice);
      // NaN compares false, so this also rejects an unparsable input
      if (!(price > 0)) return;

      setLoading(true);
      try {
        const res = await apiClientFetch<{ data: CalcResult }>(
          '/api/calculator/forward',
          session.accessToken,
          {
            method: 'POST',
            body: JSON.stringify({
              productId: selectedProduct.id,
              sellingPrice: price,
              ...shipping,
              ...gateway,
            }),
          },
        );
        setResult(res.data);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Error en el cálculo';
        toast.error(message);
        setResult(null);
      } finally {
        setLoading(false);
      }
    } else {
      const target = parseFloat(targetProfit);
      // 0 is break-even and a valid target (R7); only negatives are rejected
      if (Number.isNaN(target) || target < 0) return;

      setLoading(true);
      try {
        const res = await apiClientFetch<{ data: CalcInverseResult }>(
          '/api/calculator/inverse',
          session.accessToken,
          {
            method: 'POST',
            body: JSON.stringify({
              productId: selectedProduct.id,
              targetProfit: target,
              ...shipping,
              ...gateway,
            }),
          },
        );
        setResult(res.data);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Error en el cálculo';
        toast.error(message);
        setResult(null);
      } finally {
        setLoading(false);
      }
    }
  }, [
    session?.accessToken,
    selectedProduct,
    gatewayConfig,
    mode,
    sellingPrice,
    shippingCharged,
    shippingCost,
    targetProfit,
  ]);

  const debouncedCalculate = useCallback((): void => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      void calculate();
    }, DEBOUNCE_MS);
  }, [calculate]);

  // Trigger calculation on input changes
  useEffect(() => {
    if (!selectedProduct || !gatewayConfig || !productHasCost) return;

    if (mode === 'forward' && parseFloat(sellingPrice) > 0) {
      debouncedCalculate();
    } else if (
      mode === 'inverse' &&
      targetProfit !== '' &&
      parseFloat(targetProfit) >= 0
    ) {
      debouncedCalculate();
    }
  }, [
    mode,
    selectedProduct,
    productHasCost,
    sellingPrice,
    shippingCharged,
    shippingCost,
    targetProfit,
    gatewayConfig,
    debouncedCalculate,
  ]);

  const handleModeChange = useCallback((newMode: CalcMode): void => {
    setMode(newMode);
    setResult(null);
  }, []);

  const handleProductSelect = useCallback((product: Product): void => {
    setSelectedProduct(product);
    setResult(null);
  }, []);

  const handleGatewayConfigChange = useCallback(
    (newConfig: GatewayConfig): void => {
      setGatewayConfig(newConfig);
    },
    [],
  );

  return (
    <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
      {/* Left column: Inputs */}
      <div className='space-y-4'>
        {/* Mode toggle */}
        <Card>
          <CardContent className='pt-6'>
            <ModeToggle mode={mode} onModeChange={handleModeChange} />
          </CardContent>
        </Card>

        {/* Product selector */}
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Producto</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductSelector
              products={products}
              selectedProductId={selectedProduct?.id ?? null}
              onProductSelect={handleProductSelect}
            />
          </CardContent>
        </Card>

        {/* Price / Profit input */}
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>
              {mode === 'forward' ? 'Precio de venta' : 'Ganancia deseada'}
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            {mode === 'forward' ? (
              <div className='space-y-1.5'>
                <Label htmlFor='selling-price'>Precio de venta</Label>
                <div className='relative'>
                  <span className='text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm'>
                    $
                  </span>
                  <Input
                    id='selling-price'
                    type='number'
                    placeholder='0'
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className='pl-7'
                    min={0}
                    step='0.01'
                  />
                </div>
              </div>
            ) : (
              <div className='space-y-1.5'>
                <Label htmlFor='target-profit'>Ganancia deseada</Label>
                <div className='relative'>
                  <span className='text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm'>
                    $
                  </span>
                  <Input
                    id='target-profit'
                    type='number'
                    placeholder='0'
                    value={targetProfit}
                    onChange={(e) => setTargetProfit(e.target.value)}
                    className='pl-7'
                    min={0}
                    step='0.01'
                  />
                </div>
              </div>
            )}

            {/* Shipping: preloaded from config, overridable per calculation */}
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='space-y-1.5'>
                <Label htmlFor='shipping-charged'>
                  Envío cobrado al cliente
                </Label>
                <div className='relative'>
                  <span className='text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm'>
                    $
                  </span>
                  <Input
                    id='shipping-charged'
                    type='number'
                    placeholder='0'
                    value={shippingCharged}
                    onChange={(e) => setShippingCharged(e.target.value)}
                    className='pl-7'
                    min={0}
                    step='0.01'
                  />
                </div>
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='shipping-cost'>
                  Costo real del envío (con IVA)
                </Label>
                <div className='relative'>
                  <span className='text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm'>
                    $
                  </span>
                  <Input
                    id='shipping-cost'
                    type='number'
                    placeholder='0'
                    value={shippingCost}
                    onChange={(e) => setShippingCost(e.target.value)}
                    className='pl-7'
                    min={0}
                    step='0.01'
                  />
                </div>
              </div>
            </div>
            <p className='text-muted-foreground text-xs'>
              Precargado desde la configuración de Tiendanube; el cambio vale
              solo para este cálculo.
            </p>
          </CardContent>
        </Card>

        {/* Gateway selectors */}
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Pasarela de pago</CardTitle>
          </CardHeader>
          <CardContent>
            <GatewaySelectors
              config={config}
              onConfigChange={handleGatewayConfigChange}
            />
          </CardContent>
        </Card>
      </div>

      {/* Right column: Results */}
      <div>
        <Card className='lg:sticky lg:top-6'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-base'>
              <Calculator className='size-4' />
              Desglose
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className='flex items-center justify-center py-12'>
                <Loader2 className='text-muted-foreground size-6 animate-spin' />
              </div>
            ) : productMissingCost ? (
              <p className='text-muted-foreground py-12 text-center text-sm'>
                {PRODUCT_COST_REQUIRED_HINT}
              </p>
            ) : result ? (
              <DesglosePanel
                result={result}
                mode={mode}
                installments={gatewayConfig?.installments ?? 1}
              />
            ) : (
              <div className='text-muted-foreground py-12 text-center text-sm'>
                Seleccioná un producto y completá los datos para ver el
                desglose.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
