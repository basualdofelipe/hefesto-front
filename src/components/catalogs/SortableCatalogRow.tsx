'use client';

import type { ReactElement } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CatalogItemRow } from '@/components/catalogs/CatalogItemRow';

interface SortableCatalogRowProps {
  item: { id: string; name: string };
  canEdit: boolean;
  onUpdate: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

/**
 * A catalog row that can be dragged by its grip handle only (D-05).
 *
 * dnd-kit's attributes and listeners go on the handle, never on the row, so
 * Space inside the inline-edit input never starts a drag. Without edit
 * permission there is no handle, so nothing can start a drag.
 */
export function SortableCatalogRow({
  item,
  canEdit,
  onUpdate,
  onDelete,
}: SortableCatalogRowProps): ReactElement {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    // Replaces dnd-kit's English default that screen readers speak (D-04).
    attributes: { roleDescription: 'ordenable' },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('flex items-center', isDragging && 'opacity-60')}
    >
      {canEdit && (
        <button
          type='button'
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Mover ${item.name}`}
          className='text-muted-foreground cursor-grab touch-none px-1'
        >
          <GripVertical className='size-4' />
        </button>
      )}
      <div className='flex-1'>
        <CatalogItemRow
          item={item}
          canEdit={canEdit}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}
