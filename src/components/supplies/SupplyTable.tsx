'use client';

import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePermissions } from '@/hooks/usePermissions';
import type { Supply, SupplyType, Supplier } from './types';
import { SupplyTypeGroup } from './SupplyTypeGroup';
import { SupplyFormDialog } from './SupplyFormDialog';

interface SupplyTableProps {
  initialSupplies: Supply[];
  supplyTypes: SupplyType[];
  suppliers: Supplier[];
  canEdit: boolean;
}

interface SupplyTypeGroupData {
  typeId: string;
  typeName: string;
  supplies: Supply[];
}

const ALL_SUPPLIERS_VALUE = '__all__';

export function SupplyTable({
  initialSupplies,
  supplyTypes,
  suppliers,
  canEdit: canEditProp,
}: SupplyTableProps): ReactElement {
  const { canEditSupplies } = usePermissions();
  const canEdit = canEditProp ?? canEditSupplies;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(
    null,
  );
  const [showInactive, setShowInactive] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const filteredSupplies = useMemo((): Supply[] => {
    return initialSupplies.filter((supply) => {
      if (!showInactive && !supply.isActive) return false;

      if (
        searchQuery &&
        !supply.name.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      if (selectedSupplierId && supply.supplier.id !== selectedSupplierId) {
        return false;
      }

      return true;
    });
  }, [initialSupplies, searchQuery, selectedSupplierId, showInactive]);

  // Groups keep the catalog order the API sends (D-11). A Map keeps insertion
  // order for every key, unlike a plain object, which hoists integer-like keys.
  const typeGroups = useMemo((): SupplyTypeGroupData[] => {
    const groups = new Map<string, SupplyTypeGroupData>();
    for (const supply of filteredSupplies) {
      const group = groups.get(supply.type.id);
      if (group) {
        group.supplies.push(supply);
      } else {
        groups.set(supply.type.id, {
          typeId: supply.type.id,
          typeName: supply.type.name,
          supplies: [supply],
        });
      }
    }
    return Array.from(groups.values());
  }, [filteredSupplies]);

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center gap-4'>
        <div className='relative min-w-[200px] flex-1'>
          <Search className='text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2' />
          <Input
            placeholder='Buscar insumo...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='pl-9'
          />
        </div>

        <Select
          value={selectedSupplierId ?? ALL_SUPPLIERS_VALUE}
          onValueChange={(value) =>
            setSelectedSupplierId(value === ALL_SUPPLIERS_VALUE ? null : value)
          }
        >
          <SelectTrigger className='w-[200px]'>
            <SelectValue placeholder='Filtrar por proveedor' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_SUPPLIERS_VALUE}>
              Todos los proveedores
            </SelectItem>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className='flex items-center gap-2'>
          <Switch
            id='show-inactive'
            checked={showInactive}
            onCheckedChange={setShowInactive}
          />
          <Label htmlFor='show-inactive' className='text-sm'>
            Mostrar inactivos
          </Label>
        </div>

        {canEdit && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className='mr-1 size-4' />
            Nuevo insumo
          </Button>
        )}
      </div>

      {typeGroups.length === 0 ? (
        <div className='text-muted-foreground rounded-md border py-12 text-center'>
          {searchQuery || selectedSupplierId
            ? 'No se encontraron insumos con los filtros seleccionados.'
            : 'No hay insumos registrados.'}
        </div>
      ) : (
        <div className='space-y-4'>
          {typeGroups.map((group) => (
            <SupplyTypeGroup
              key={group.typeId}
              typeName={group.typeName}
              supplies={group.supplies}
              supplyTypes={supplyTypes}
              allSuppliers={suppliers}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}

      <SupplyFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        supplyTypes={supplyTypes}
        suppliers={suppliers}
      />
    </div>
  );
}
