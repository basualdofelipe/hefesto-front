'use client';

import type { ReactElement } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type CalcMode = 'forward' | 'inverse';

interface ModeToggleProps {
  mode: CalcMode;
  onModeChange: (mode: CalcMode) => void;
}

export function ModeToggle({
  mode,
  onModeChange,
}: ModeToggleProps): ReactElement {
  return (
    <Tabs
      value={mode}
      onValueChange={(value: string) => onModeChange(value as CalcMode)}
    >
      <TabsList className='w-full'>
        <TabsTrigger value='forward' className='flex-1'>
          Precio &rarr; Ganancia
        </TabsTrigger>
        <TabsTrigger value='inverse' className='flex-1'>
          Ganancia &rarr; Precio
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
