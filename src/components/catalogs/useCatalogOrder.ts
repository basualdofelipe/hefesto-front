'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { toast } from 'sonner';
import { apiClientFetch } from '@/lib/api-client';
import { orderByIds, sameOrder } from '@/components/catalogs/catalog-order';

/** Quiet time after the last move before the order is saved (D-06). */
export const SAVE_DELAY_MS = 2000;

export interface CatalogItem {
  id: string;
  name: string;
}

export interface UseCatalogOrderResult {
  /** Current list, in display order (optimistic while a save is pending). */
  items: CatalogItem[];
  /** True only while the reorder PUT is in flight; the UI blocks dragging then. */
  isSaving: boolean;
  move: (activeId: string, overId: string) => void;
  /** A row the server just created: goes last, and into the confirmed baseline. */
  applyCreated: (item: CatalogItem) => void;
  /** A row the server just renamed: keeps its position. */
  applyUpdated: (item: CatalogItem) => void;
  /** A row the server just deleted: leaves the list and the confirmed baseline. */
  applyDeleted: (id: string) => void;
}

/**
 * Client-side reorder engine for one catalog dimension.
 *
 * Moves update the list at once; one `PUT /api/catalogs/:dimension/order`
 * goes out after `SAVE_DELAY_MS` without further moves, carrying the final
 * full id list, and only when it differs from the last order the server
 * confirmed (D-06). A failed save reverts to that confirmed order and shows
 * an error toast; there is no success toast (D-09). Unmounting with a save
 * pending sends it right away (D-07). Items keep the received order (D-10).
 */
export function useCatalogOrder(
  dimension: string,
  initialItems: CatalogItem[],
  token: string,
): UseCatalogOrderResult {
  const [items, setItems] = useState<CatalogItem[]>(initialItems);
  const [isSaving, setIsSaving] = useState(false);

  // Timer callbacks and the unmount cleanup run outside render, so they read
  // the latest values from refs instead of a stale closure.
  const itemsRef = useRef<CatalogItem[]>(initialItems);
  const confirmedIdsRef = useRef<string[]>(initialItems.map((item) => item.id));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tokenRef = useRef(token);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const commit = useCallback((next: CatalogItem[]): void => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  const flush = useCallback(async (): Promise<void> => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const ids = itemsRef.current.map((item) => item.id);
    if (sameOrder(ids, confirmedIdsRef.current)) return;

    setIsSaving(true);
    // try/catch because the outcome drives the state: success moves the
    // baseline, failure reverts the list to it.
    try {
      await apiClientFetch(
        `/api/catalogs/${dimension}/order`,
        tokenRef.current,
        {
          method: 'PUT',
          body: JSON.stringify({ ids }),
        },
      );
      // Not replaced with the response: a row created while the PUT was in
      // flight would vanish. Rows deleted meanwhile drop out here.
      confirmedIdsRef.current = orderByIds(itemsRef.current, ids).map(
        (item) => item.id,
      );
    } catch (error) {
      commit(orderByIds(itemsRef.current, confirmedIdsRef.current));
      toast.error(
        error instanceof Error ? error.message : 'No se pudo guardar el orden',
      );
    } finally {
      setIsSaving(false);
    }
  }, [dimension, commit]);

  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  // Empty deps: the cleanup runs on a real unmount only. StrictMode's
  // simulated unmount happens before any move, so no timer is pending (D-07).
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) void flushRef.current();
    };
  }, []);

  const move = useCallback(
    (activeId: string, overId: string): void => {
      const current = itemsRef.current;
      const from = current.findIndex((item) => item.id === activeId);
      const to = current.findIndex((item) => item.id === overId);
      if (from < 0 || to < 0 || from === to) return;

      commit(arrayMove(current, from, to));
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void flushRef.current();
      }, SAVE_DELAY_MS);
    },
    [commit],
  );

  const applyCreated = useCallback(
    (item: CatalogItem): void => {
      commit([...itemsRef.current, item]);
      confirmedIdsRef.current = [...confirmedIdsRef.current, item.id];
    },
    [commit],
  );

  const applyUpdated = useCallback(
    (item: CatalogItem): void => {
      commit(
        itemsRef.current.map((current) =>
          current.id === item.id ? item : current,
        ),
      );
    },
    [commit],
  );

  const applyDeleted = useCallback(
    (id: string): void => {
      commit(itemsRef.current.filter((item) => item.id !== id));
      confirmedIdsRef.current = confirmedIdsRef.current.filter(
        (confirmedId) => confirmedId !== id,
      );
    },
    [commit],
  );

  return { items, isSaving, move, applyCreated, applyUpdated, applyDeleted };
}
