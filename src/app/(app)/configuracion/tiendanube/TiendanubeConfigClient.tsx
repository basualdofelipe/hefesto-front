'use client';

import type { ReactElement } from 'react';
import { useState, useMemo } from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { GatewaySection } from '@/components/tiendanube-config/GatewaySection';
import { PlansSection } from '@/components/tiendanube-config/PlansSection';
import { InstallmentsSection } from '@/components/tiendanube-config/InstallmentsSection';
import { TaxConfigSection } from '@/components/tiendanube-config/TaxConfigSection';
import { ShippingSection } from '@/components/tiendanube-config/ShippingSection';
import type {
  TiendanubeConfigAll,
  TnGatewayRate,
  TnPlan,
} from '@/components/tiendanube-config/types';
import { TN_PLAN_ESENCIAL } from '@/constants/tiendanube';

interface TiendanubeConfigClientProps {
  config: TiendanubeConfigAll;
}

export function TiendanubeConfigClient({
  config,
}: TiendanubeConfigClientProps): ReactElement {
  const defaultPlan =
    config.plans.find((p) => p.slug === TN_PLAN_ESENCIAL) ?? config.plans[0];

  const [selectedPlan, setSelectedPlan] = useState<TnPlan>(defaultPlan);
  const [plans, setPlans] = useState<TnPlan[]>(config.plans);

  const ratesByGateway = useMemo(() => {
    const grouped = new Map<string, TnGatewayRate[]>();
    for (const gw of config.gateways) {
      grouped.set(gw.id, []);
    }
    for (const rate of config.rates) {
      const existing = grouped.get(rate.gateway.id);
      if (existing) {
        existing.push(rate);
      }
    }
    return grouped;
  }, [config.gateways, config.rates]);

  const sectionKeys = useMemo(() => {
    const keys = config.gateways.map((gw) => `gateway-${gw.id}`);
    keys.push('plans', 'installments', 'taxes', 'shipping');
    return keys;
  }, [config.gateways]);

  function handlePlanChange(slug: string): void {
    const plan = plans.find((p) => p.slug === slug);
    if (plan) {
      setSelectedPlan(plan);
    }
  }

  function handlePlanUpdated(updatedPlan: TnPlan): void {
    setPlans((prev) =>
      prev.map((p) => (p.id === updatedPlan.id ? updatedPlan : p)),
    );
    if (selectedPlan.id === updatedPlan.id) {
      setSelectedPlan(updatedPlan);
    }
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-3'>
        <span className='text-sm font-semibold'>Plan Tiendanube:</span>
        <Select value={selectedPlan.slug} onValueChange={handlePlanChange}>
          <SelectTrigger className='w-48'>
            <SelectValue placeholder='Seleccionar plan' />
          </SelectTrigger>
          <SelectContent>
            {plans.map((plan) => (
              <SelectItem key={plan.id} value={plan.slug}>
                {plan.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className='text-muted-foreground text-xs'>
        Ingresá la tasa efectiva; si Tiendanube la publica &apos;+ IVA&apos;,
        cargala con el IVA sumado.
      </p>

      <Accordion type='multiple' defaultValue={sectionKeys}>
        {config.gateways.map((gateway) => (
          <AccordionItem key={gateway.id} value={`gateway-${gateway.id}`}>
            <AccordionTrigger>
              <GatewaySection.Header
                gateway={gateway}
                selectedPlan={selectedPlan}
              />
            </AccordionTrigger>
            <AccordionContent>
              <GatewaySection
                gateway={gateway}
                rates={ratesByGateway.get(gateway.id) ?? []}
                selectedPlan={selectedPlan}
              />
            </AccordionContent>
          </AccordionItem>
        ))}

        <AccordionItem value='plans'>
          <AccordionTrigger>Planes Tiendanube</AccordionTrigger>
          <AccordionContent>
            <PlansSection plans={plans} onPlanUpdated={handlePlanUpdated} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value='installments'>
          <AccordionTrigger>Cuotas</AccordionTrigger>
          <AccordionContent>
            <InstallmentsSection installments={config.installments} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value='taxes'>
          <AccordionTrigger>Impuestos</AccordionTrigger>
          <AccordionContent>
            <TaxConfigSection taxConfig={config.taxConfig} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value='shipping'>
          <AccordionTrigger>Envío por defecto</AccordionTrigger>
          <AccordionContent>
            <ShippingSection shipping={config.shipping} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className='pt-2'>
        <Button variant='link' asChild className='px-0'>
          <a
            href='https://ayuda.tiendanube.com/es_AR/pago-nube-2/cuales-son-las-comisiones-de-pago-nube'
            target='_blank'
            rel='noopener noreferrer'
          >
            <ExternalLink className='mr-1 size-4' />
            Verificar tasas en Pago Nube
          </a>
        </Button>
      </div>
    </div>
  );
}
