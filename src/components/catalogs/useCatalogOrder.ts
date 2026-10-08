'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { toast } from 'sonner';
import { apiClientFetch } from '@/lib/api-client';
import { describeError, logger } from '@/lib/logger';
import { orderByIds, sameOrder } from '@/components/catalogs/catalog-order';

/** Quiet time after the last move before the order is saved (D-06). */
export const SAVE_DELAY_MS = 2000;

export interface CatalogItem {
  id: string;
  name: string;
}

interface CatalogListResponse {
  data: CatalogItem[];
}

export interface UseCatalogOrderResult {
  /** Current list, in display order (optimistic while a save is pending). */
  items: CatalogItem[];
  /** True only while the reorder PUT is in flight; the UI blocks dragging then. */
  isSaving: boolean;
  /** Applies a drop; ignored while the reorder PUT is in flight (D-06). */
  move: (activeId: string, overId: string) => void;
  /** A drag started: holds the pending save so it cannot fire mid-drag. */
  pause: () => void;
  /** A drag ended without a move: restarts the wait if an order is unsaved. */
  resume: () => void;
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
 * confirmed (D-06). A failed save shows an error toast and rebases the list
 * and the confirmed order on the server's current list, falling back to the
 * confirmed order if that read fails too; there is no success toast (D-09). Unmounting with a save
 * pending sends it right away (D-07). Items keep the received order (D-10).
 *
 * A drag in progress counts as reordering: `pause` holds the wait while one
 * is active, and drops are refused while the PUT is in flight, so a save can
 * never land under (or be reverted over) the user's latest drop.
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
  // Read synchronously by move(): the isSaving state lags one render.
  const savingRef = useRef(false);
  const tokenRef = useRef(token);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const commit = useCallback((next: CatalogItem[]): void => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  const clearTimer = useCallback((): void => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const isUnsaved = useCallback(
    (): boolean =>
      !sameOrder(
        itemsRef.current.map((item) => item.id),
        confirmedIdsRef.current,
      ),
    [],
  );

  /**
   * After a failed save: a stale set (another session created or deleted a
   * row since this page loaded) is rejected on every later save until the
   * baseline matches the server again, so take the server's list as both the
   * list and the confirmed order. If that read fails too (or replies with an
   * unexpected shape), log it and revert to the last confirmed order; the
   * save's error toast has already told the user.
   */
  const rebaseOnServer = useCallback(async (): Promise<void> => {
    try {
      const response = await apiClientFetch<CatalogListResponse | undefined>(
        `/api/catalogs/${dimension}`,
        tokenRef.current,
      );
      if (!Array.isArray(response?.data)) {
        throw new TypeError(
          `catalog list: unexpected shape (${typeof response?.data} data)`,
        );
      }
      confirmedIdsRef.current = response.data.map((item) => item.id);
      commit(response.data);
    } catch (error) {
      logger.warn(
        { op: 'catalog-reorder-resync', dimension, err: describeError(error) },
        'resync after a failed reorder failed; reverting to the confirmed order',
      );
      commit(orderByIds(itemsRef.current, confirmedIdsRef.current));
    }
  }, [dimension, commit]);

  const flush = useCallback(async (): Promise<void> => {
    clearTimer();
    const ids = itemsRef.current.map((item) => item.id);
    if (sameOrder(ids, confirmedIdsRef.current)) return;

    savingRef.current = true;
    setIsSaving(true);
    // try/catch because the outcome drives the state: success moves the
    // baseline, failure rebases the list (dragging stays blocked meanwhile).
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
      toast.error(
        error instanceof Error ? error.message : 'No se pudo guardar el orden',
      );
      await rebaseOnServer();
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [dimension, clearTimer, rebaseOnServer]);

  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const schedule = useCallback((): void => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      void flushRef.current();
    }, SAVE_DELAY_MS);
  }, [clearTimer]);

  // Stable deps: the cleanup runs on a real unmount only. StrictMode's
  // simulated unmount happens before any move, so nothing is unsaved (D-07).
  // An unsaved order goes out even when a drag paused its timer; one already
  // in flight is not sent twice.
  useEffect(() => {
    return () => {
      if (!savingRef.current && isUnsaved()) void flushRef.current();
    };
  }, [isUnsaved]);

  const move = useCallback(
    (activeId: string, overId: string): void => {
      if (savingRef.current) return;
      const current = itemsRef.current;
      const from = current.findIndex((item) => item.id === activeId);
      const to = current.findIndex((item) => item.id === overId);
      if (from < 0 || to < 0 || from === to) return;

      commit(arrayMove(current, from, to));
      schedule();
    },
    [commit, schedule],
  );

  const pause = clearTimer;

  const resume = useCallback((): void => {
    if (savingRef.current || timerRef.current !== null) return;
    if (isUnsaved()) schedule();
  }, [isUnsaved, schedule]);

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

  return {
    items,
    isSaving,
    move,
    pause,
    resume,
    applyCreated,
    applyUpdated,
    applyDeleted,
  };
}
