'use client';

import type { ReactElement } from 'react';
import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { TiendanubeConfigAll } from '@/components/tiendanube-config/types';
import { PAYMENT_METHOD_LABELS } from '@/components/tiendanube-config/types';
import { TN_PLAN_ESENCIAL } from '@/constants/tiendanube';

export interface GatewayConfig {
  gatewaySlug: string;
  paymentMethod: string;
  withdrawalDays: number;
  installments: number;
  planSlug: string | undefined;
}

interface GatewaySelectorsProps {
  config: TiendanubeConfigAll;
  onConfigChange: (config: GatewayConfig) => void;
}

const DEFAULT_PLAN_SLUG = TN_PLAN_ESENCIAL;

export function GatewaySelectors({
  config,
  onConfigChange,
}: GatewaySelectorsProps): ReactElement {
  const activeGateways = useMemo(
    () => config.gateways.filter((g) => g.isActive),
    [config.gateways],
  );
  const activeRates = useMemo(
    () => config.rates.filter((r) => r.isActive),
    [config.rates],
  );
  const activeInstallments = useMemo(
    () =>
      config.installments
        .filter((i) => i.isActive)
        .sort((a, b) => a.installments - b.installments),
    [config.installments],
  );
  const activePlans = useMemo(
    () => config.plans.filter((p) => p.isActive),
    [config.plans],
  );

  // Raw user selections
  const [selectedGateway, setSelectedGateway] = useState<string>(
    activeGateways[0]?.slug ?? '',
  );
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [selectedDays, setSelectedDays] = useState<number>(-1);
  const [installments, setInstallments] = useState<number>(
    activeInstallments[0]?.installments ?? 1,
  );
  const [showPlanOverride, setShowPlanOverride] = useState<boolean>(false);
  const [planSlug, setPlanSlug] = useState<string>(DEFAULT_PLAN_SLUG);

  // Ref to hold latest onConfigChange — avoids it being a useEffect dependency
  const onConfigChangeRef = useRef(onConfigChange);
  useEffect(() => {
    onConfigChangeRef.current = onConfigChange;
  }, [onConfigChange]);

  // Derive available methods from selected gateway
  const availableMethods = useMemo((): string[] => {
    const methods = new Set<string>();
    for (const rate of activeRates) {
      if (rate.gateway.slug === selectedGateway) {
        methods.add(rate.paymentMethod);
      }
    }
    return Array.from(methods);
  }, [activeRates, selectedGateway]);

  // Effective method: use selected if still valid, otherwise first available
  const effectiveMethod = useMemo((): string => {
    if (availableMethods.includes(selectedMethod)) return selectedMethod;
    return availableMethods[0] ?? '';
  }, [availableMethods, selectedMethod]);

  // Derive available withdrawal days from gateway + effective method
  const availableWithdrawalDays = useMemo((): number[] => {
    const days = new Set<number>();
    for (const rate of activeRates) {
      if (
        rate.gateway.slug === selectedGateway &&
        rate.paymentMethod === effectiveMethod
      ) {
        days.add(rate.withdrawalDays);
      }
    }
    return Array.from(days).sort((a, b) => a - b);
  }, [activeRates, selectedGateway, effectiveMethod]);

  // Effective days: use selected if still valid, otherwise first available
  const effectiveDays = useMemo((): number => {
    if (availableWithdrawalDays.includes(selectedDays)) return selectedDays;
    return availableWithdrawalDays[0] ?? 0;
  }, [availableWithdrawalDays, selectedDays]);

  // Notify parent of config changes (ref-based to avoid circular dependency)
  useEffect(() => {
    if (selectedGateway && effectiveMethod) {
      onConfigChangeRef.current({
        gatewaySlug: selectedGateway,
        paymentMethod: effectiveMethod,
        withdrawalDays: effectiveDays,
        installments,
        planSlug: showPlanOverride ? planSlug : undefined,
      });
    }
  }, [
    selectedGateway,
    effectiveMethod,
    effectiveDays,
    installments,
    showPlanOverride,
    planSlug,
  ]);

  function handleGatewayChange(slug: string): void {
    setSelectedGateway(slug);
    // Reset downstream selections so derivation picks new defaults
    setSelectedMethod('');
    setSelectedDays(-1);
  }

  function handleMethodChange(method: string): void {
    setSelectedMethod(method);
    // Reset days so derivation picks new default
    setSelectedDays(-1);
  }

  return (
    <div className='space-y-4'>
      {/* Gateway selector */}
      <div className='space-y-1.5'>
        <Label>Pasarela</Label>
        <Select value={selectedGateway} onValueChange={handleGatewayChange}>
          <SelectTrigger className='w-full'>
            <SelectValue placeholder='Selecciona pasarela' />
          </SelectTrigger>
          <SelectContent>
            {activeGateways.map((gw) => (
              <SelectItem key={gw.slug} value={gw.slug}>
                {gw.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Payment method selector */}
      <div className='space-y-1.5'>
        <Label>Medio de pago</Label>
        <Select value={effectiveMethod} onValueChange={handleMethodChange}>
          <SelectTrigger className='w-full'>
            <SelectValue placeholder='Selecciona medio' />
          </SelectTrigger>
          <SelectContent>
            {availableMethods.map((method) => (
              <SelectItem key={method} value={method}>
                {PAYMENT_METHOD_LABELS[method] ?? method}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Withdrawal days selector */}
      <div className='space-y-1.5'>
        <Label>Tiempo de retiro</Label>
        <Select
          value={String(effectiveDays)}
          onValueChange={(val: string) => setSelectedDays(Number(val))}
        >
          <SelectTrigger className='w-full'>
            <SelectValue placeholder='Selecciona dias' />
          </SelectTrigger>
          <SelectContent>
            {availableWithdrawalDays.map((days) => (
              <SelectItem key={days} value={String(days)}>
                {days} dias
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Installments selector */}
      <div className='space-y-1.5'>
        <Label>Cuotas</Label>
        <Select
          value={String(installments)}
          onValueChange={(val: string) => setInstallments(Number(val))}
        >
          <SelectTrigger className='w-full'>
            <SelectValue placeholder='Selecciona cuotas' />
          </SelectTrigger>
          <SelectContent>
            {activeInstallments.map((inst) => (
              <SelectItem
                key={inst.installments}
                value={String(inst.installments)}
              >
                {inst.installments === 1
                  ? '1 cuota (sin interes)'
                  : `${inst.installments} cuotas`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Plan override toggle */}
      <div className='space-y-2'>
        <div className='flex items-center gap-2'>
          <Switch
            checked={showPlanOverride}
            onCheckedChange={setShowPlanOverride}
          />
          <Label className='cursor-pointer'>Simular otro plan</Label>
        </div>
        {showPlanOverride && (
          <Select value={planSlug} onValueChange={setPlanSlug}>
            <SelectTrigger className='w-full'>
              <SelectValue placeholder='Selecciona plan' />
            </SelectTrigger>
            <SelectContent>
              {activePlans.map((plan) => (
                <SelectItem key={plan.slug} value={plan.slug}>
                  {plan.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
