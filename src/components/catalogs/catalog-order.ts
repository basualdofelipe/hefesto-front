/**
 * True when both id lists hold the same ids in the same positions.
 *
 * Guards the reorder save: when the final order equals the last order the
 * server confirmed, no request is sent (same-spot drop, or A → B → A inside
 * the save window — D-06).
 */
export function sameOrder(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((id, index) => id === b[index]);
}

/**
 * Returns the items in the order given by `ids`, followed by the items that
 * `ids` does not list, in their current relative order. Ids naming an item
 * that is no longer present are skipped. Inputs are not mutated.
 *
 * Reconciles a list with an id order that may be out of date: the revert to
 * the last confirmed order keeps rows created since then and never brings
 * back deleted ones (D-06, D-10).
 */
export function orderByIds<T extends { id: string }>(
  items: readonly T[],
  ids: readonly string[],
): T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const listed: T[] = [];
  for (const id of ids) {
    const item = byId.get(id);
    if (item !== undefined) {
      listed.push(item);
      byId.delete(id);
    }
  }
  const unlisted = items.filter((item) => byId.has(item.id));
  return [...listed, ...unlisted];
}
