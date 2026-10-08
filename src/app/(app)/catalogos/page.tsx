import type { ReactElement } from 'react';
import { auth } from '@/auth';
import { apiFetch } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CatalogTabContent } from '@/components/catalogs/CatalogTabContent';

interface CatalogItem {
  id: string;
  name: string;
}

interface CatalogResponse {
  data: CatalogItem[];
}

const DIMENSIONS = [
  { key: 'product-types', label: 'Tipos' },
  { key: 'product-names', label: 'Nombres' },
  { key: 'product-finishes', label: 'Terminaciones' },
  { key: 'product-colors', label: 'Colores' },
  { key: 'product-sizes', label: 'Talles' },
  { key: 'supply-types', label: 'Tipos de Insumo' },
  { key: 'expense-categories', label: 'Categorias de Gasto' },
];

export default async function CatalogosPage(): Promise<ReactElement> {
  const session = await auth();
  const canEdit = session?.user?.permissions?.canEditProducts ?? false;

  const results = await Promise.all(
    DIMENSIONS.map((d) => apiFetch<CatalogResponse>(`/api/catalogs/${d.key}`)),
  );

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>Catalogos</h1>
        <p className='text-muted-foreground text-sm'>
          Gestiona los catalogos de productos e insumos.
        </p>
      </div>

      <Tabs defaultValue={DIMENSIONS[0].key}>
        <TabsList className='flex-wrap'>
          {DIMENSIONS.map((d) => (
            <TabsTrigger key={d.key} value={d.key}>
              {d.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {/* Force-mounting keeps each tab's edits and pending reorder across tab
            switches (D-08). Radix then never sets `hidden`, so the class
            hides the inactive panels. */}
        {DIMENSIONS.map((d, i) => (
          <TabsContent
            key={d.key}
            value={d.key}
            forceMount
            className='data-[state=inactive]:hidden'
          >
            <CatalogTabContent
              dimension={d.key}
              initialItems={results[i].data}
              canEdit={canEdit}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
