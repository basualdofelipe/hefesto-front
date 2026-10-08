'use client';

import type { ReactElement, KeyboardEvent } from 'react';
import { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type ScreenReaderInstructions,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClientFetch } from '@/lib/api-client';
import { SortableCatalogRow } from '@/components/catalogs/SortableCatalogRow';
import {
  useCatalogOrder,
  type CatalogItem,
} from '@/components/catalogs/useCatalogOrder';

interface CatalogResponse {
  data: CatalogItem;
}

interface CatalogTabContentProps {
  dimension: string;
  initialItems: CatalogItem[];
  canEdit: boolean;
}

const screenReaderInstructions: ScreenReaderInstructions = {
  draggable:
    'Para mover un ítem, presioná espacio o enter. Usá las flechas para elegir la nueva posición y espacio o enter para soltarlo. Escape cancela.',
};

/**
 * Spanish drag announcements (D-04). They name the item and its position,
 * never its id: dnd-kit's defaults would read the UUID aloud.
 */
function buildAnnouncements(items: CatalogItem[]): Announcements {
  const total = items.length;
  const nameOf = (id: UniqueIdentifier): string =>
    items.find((item) => item.id === String(id))?.name ?? 'el ítem';
  const positionOf = (id: UniqueIdentifier): number =>
    items.findIndex((item) => item.id === String(id)) + 1;

  return {
    onDragStart: ({ active }) => `Tomaste ${nameOf(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${nameOf(active.id)} está en la posición ${positionOf(over.id)} de ${total}.`
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `Soltaste ${nameOf(active.id)} en la posición ${positionOf(over.id)} de ${total}.`
        : `Soltaste ${nameOf(active.id)}.`,
    onDragCancel: ({ active }) =>
      `Se canceló el movimiento de ${nameOf(active.id)}.`,
  };
}

export function CatalogTabContent({
  dimension,
  initialItems,
  canEdit,
}: CatalogTabContentProps): ReactElement {
  const { data: session } = useSession();
  const token = session?.accessToken ?? '';

  const { items, isSaving, move, applyCreated, applyUpdated, applyDeleted } =
    useCatalogOrder(dimension, initialItems, token);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreate(): Promise<void> {
    const trimmed = newName.trim();
    if (!trimmed) return;

    setIsCreating(true);
    try {
      const response = await apiClientFetch<CatalogResponse>(
        `/api/catalogs/${dimension}`,
        token,
        {
          method: 'POST',
          body: JSON.stringify({ name: trimmed }),
        },
      );
      applyCreated(response.data);
      setNewName('');
      setIsAdding(false);
      toast.success('Item creado');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Error al crear item',
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdate(id: string, name: string): Promise<void> {
    try {
      const response = await apiClientFetch<CatalogResponse>(
        `/api/catalogs/${dimension}/${id}`,
        token,
        {
          method: 'PUT',
          body: JSON.stringify({ name }),
        },
      );
      applyUpdated(response.data);
      toast.success('Item actualizado');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Error al actualizar item',
      );
      throw error;
    }
  }

  async function handleDelete(id: string): Promise<void> {
    try {
      await apiClientFetch(`/api/catalogs/${dimension}/${id}`, token, {
        method: 'DELETE',
      });
      applyDeleted(id);
      toast.success('Item eliminado');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Error al eliminar item',
      );
      throw error;
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const announcements = useMemo(() => buildAnnouncements(items), [items]);

  function handleNewKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter') {
      void handleCreate();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewName('');
    }
  }

  return (
    <div className='space-y-2'>
      {canEdit && (
        <div className='mb-4'>
          {isAdding ? (
            <div className='flex items-center gap-2'>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={handleNewKeyDown}
                placeholder='Nombre del item...'
                disabled={isCreating}
                className='h-8 flex-1'
                autoFocus
              />
              <Button
                size='icon'
                variant='ghost'
                onClick={() => void handleCreate()}
                disabled={isCreating || !newName.trim()}
                className='size-8'
              >
                {isCreating ? (
                  <Loader2 className='size-4 animate-spin' />
                ) : (
                  <Check className='size-4' />
                )}
              </Button>
              <Button
                size='icon'
                variant='ghost'
                onClick={() => {
                  setIsAdding(false);
                  setNewName('');
                }}
                disabled={isCreating}
                className='size-8'
              >
                <X className='size-4' />
              </Button>
            </div>
          ) : (
            <Button
              variant='outline'
              size='sm'
              onClick={() => setIsAdding(true)}
            >
              <Plus className='mr-1 size-4' />
              Agregar
            </Button>
          )}
        </div>
      )}

      <div className='rounded-md border'>
        {items.length === 0 ? (
          <p className='text-muted-foreground p-4 text-center text-sm'>
            No hay items en este catalogo.
          </p>
        ) : (
          // A stable id keeps dnd-kit's aria-describedby ids equal on server
          // and client (no hydration mismatch with 7 contexts on one page).
          <DndContext
            id={`catalog-dnd-${dimension}`}
            sensors={sensors}
            collisionDetection={closestCenter}
            accessibility={{ announcements, screenReaderInstructions }}
            onDragEnd={({ active, over }) => {
              if (over) move(String(active.id), String(over.id));
            }}
          >
            {/* Dragging is blocked only while the reorder PUT is in flight (D-06). */}
            <SortableContext
              items={items.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
              disabled={isSaving}
            >
              {items.map((item) => (
                <SortableCatalogRow
                  key={item.id}
                  item={item}
                  canEdit={canEdit}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
