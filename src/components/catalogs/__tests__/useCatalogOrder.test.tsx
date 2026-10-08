import type { ReactElement, ReactNode } from 'react';
import { StrictMode } from 'react';
import { act, renderHook, type RenderHookResult } from '@testing-library/react';

jest.mock('@/lib/api-client', () => ({
  apiClientFetch: jest.fn(),
}));

import { apiClientFetch } from '@/lib/api-client';
import {
  SAVE_DELAY_MS,
  useCatalogOrder,
  type CatalogItem,
  type UseCatalogOrderResult,
} from '@/components/catalogs/useCatalogOrder';

const mockApiClientFetch = apiClientFetch as jest.MockedFunction<
  typeof apiClientFetch
>;

interface RecordedRequest {
  path: string;
  method: string | undefined;
  body: { ids: string[] };
  token: string;
}

const DIMENSION = 'product-sizes';
const LIST_PATH = `/api/catalogs/${DIMENSION}`;
const ORDER_PATH = `${LIST_PATH}/order`;
const STALE_SET_MESSAGE =
  'El orden enviado no coincide con los ítems actuales del catálogo';

const A: CatalogItem = {
  id: 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1',
  name: 'XS',
};
const B: CatalogItem = {
  id: 'b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2',
  name: 'S',
};
const C: CatalogItem = {
  id: 'c3c3c3c3-c3c3-4c3c-8c3c-c3c3c3c3c3c3',
  name: 'M',
};
const D: CatalogItem = {
  id: 'd4d4d4d4-d4d4-4d4d-8d4d-d4d4d4d4d4d4',
  name: 'L',
};
const N: CatalogItem = {
  id: 'e5e5e5e5-e5e5-4e5e-8e5e-e5e5e5e5e5e5',
  name: 'XL',
};

const INITIAL: CatalogItem[] = [A, B, C, D];

let requests: RecordedRequest[];
let respond: () => Promise<unknown>;
// GET /api/catalogs/:dimension, the resync after a failed save. Rejects by
// default, so a failed save falls back to the confirmed order.
let listRequests: string[];
let respondList: () => Promise<unknown>;
// The structured logger writes warn lines here; silenced and read by the tests.
let consoleWarn: jest.SpyInstance;

interface WarnLine {
  level: string;
  msg: string;
  op?: string;
  dimension?: string;
  err?: string;
}

/** Every console.warn call, parsed as the logger's JSON line. */
function warnLines(): WarnLine[] {
  return consoleWarn.mock.calls.map(
    ([line]: unknown[]) => JSON.parse(String(line)) as WarnLine,
  );
}

function ids(items: readonly CatalogItem[]): string[] {
  return items.map((item) => item.id);
}

function deferred(): { promise: Promise<unknown>; resolve: () => void } {
  let resolve: () => void = () => undefined;
  const promise = new Promise<unknown>((done) => {
    resolve = () => done(undefined);
  });
  return { promise, resolve };
}

async function advance(ms: number): Promise<void> {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

function renderOrderHook(
  token = 'token-1',
): RenderHookResult<UseCatalogOrderResult, { token: string }> {
  return renderHook(
    ({ token: currentToken }) =>
      useCatalogOrder(DIMENSION, INITIAL, currentToken),
    { initialProps: { token } },
  );
}

beforeEach(() => {
  jest.useFakeTimers();
  requests = [];
  respond = () => Promise.resolve(undefined);
  listRequests = [];
  respondList = () => Promise.reject(new Error('offline'));
  consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  mockApiClientFetch.mockReset();
  mockApiClientFetch.mockImplementation(
    <T,>(
      path: string,
      token: string,
      options: RequestInit = {},
    ): Promise<T> => {
      if (options.method === undefined) {
        listRequests.push(path);
        return respondList() as Promise<T>;
      }
      requests.push({
        path,
        token,
        method: options.method,
        body: JSON.parse(String(options.body)) as { ids: string[] },
      });
      return respond() as Promise<T>;
    },
  );
});

afterEach(() => {
  jest.useRealTimers();
  consoleWarn.mockRestore();
});

describe('useCatalogOrder', () => {
  it('keeps the received order on mount and sends nothing', async () => {
    const { result } = renderOrderHook();

    expect(ids(result.current.items)).toEqual(ids(INITIAL));
    await advance(5000);
    expect(requests).toEqual([]);
  });

  it('moves optimistically and sends one PUT with the full order after 2 s', async () => {
    const { result } = renderOrderHook();

    act(() => result.current.move(A.id, C.id));

    expect(ids(result.current.items)).toEqual([B.id, C.id, A.id, D.id]);
    await advance(1999);
    expect(requests).toEqual([]);
    await advance(1);
    expect(requests).toEqual([
      {
        path: ORDER_PATH,
        method: 'PUT',
        body: { ids: [B.id, C.id, A.id, D.id] },
        token: 'token-1',
      },
    ]);
  });

  it('restarts the wait on each move and sends only the final order', async () => {
    const { result } = renderOrderHook();

    act(() => result.current.move(A.id, C.id));
    await advance(1000);
    act(() => result.current.move(D.id, B.id));
    await advance(1999);
    expect(requests).toEqual([]);
    await advance(1);

    expect(requests).toHaveLength(1);
    expect(requests[0].body.ids).toEqual([D.id, B.id, C.id, A.id]);
  });

  it('sends nothing when an item is moved away and back inside the window', async () => {
    const { result } = renderOrderHook();

    act(() => result.current.move(A.id, B.id));
    expect(ids(result.current.items)).toEqual([B.id, A.id, C.id, D.id]);
    act(() => result.current.move(A.id, B.id));
    expect(ids(result.current.items)).toEqual(ids(INITIAL));
    await advance(5000);

    expect(requests).toEqual([]);
  });

  it('ignores a drop on the same spot', async () => {
    const { result } = renderOrderHook();

    act(() => result.current.move(A.id, A.id));

    expect(ids(result.current.items)).toEqual(ids(INITIAL));
    await advance(5000);
    expect(requests).toEqual([]);
  });

  it('ignores a move that names an unknown item', async () => {
    const { result } = renderOrderHook();

    act(() => result.current.move(A.id, N.id));

    expect(ids(result.current.items)).toEqual(ids(INITIAL));
    await advance(5000);
    expect(requests).toEqual([]);
  });

  it('reverts to the initial order when the PUT fails', async () => {
    respond = () => Promise.reject(new Error('boom'));
    const { result } = renderOrderHook();

    act(() => result.current.move(A.id, C.id));
    await advance(SAVE_DELAY_MS);

    expect(requests).toHaveLength(1);
    expect(ids(result.current.items)).toEqual(ids(INITIAL));
    expect(result.current.isSaving).toBe(false);
  });

  it('rebases on the server list after a stale-set 400, so the next move saves', async () => {
    // Another session created N after this page loaded.
    const serverItems = [...INITIAL, N];
    respond = () => Promise.reject(new Error(STALE_SET_MESSAGE));
    respondList = () => Promise.resolve({ data: serverItems });
    const { result } = renderOrderHook();

    act(() => result.current.move(A.id, C.id));
    await advance(SAVE_DELAY_MS);

    expect(listRequests).toEqual([LIST_PATH]);
    expect(ids(result.current.items)).toEqual(ids(serverItems));
    expect(result.current.isSaving).toBe(false);

    respond = () => Promise.resolve(undefined);
    act(() => result.current.move(N.id, A.id));
    await advance(SAVE_DELAY_MS);

    expect(requests).toHaveLength(2);
    expect(requests[1].body.ids).toEqual([N.id, A.id, B.id, C.id, D.id]);
    expect([...requests[1].body.ids].sort()).toEqual(ids(serverItems).sort());
  });

  it('treats the server list as confirmed, so moving away and back sends nothing', async () => {
    const serverItems = [D, C, B, A];
    respond = () => Promise.reject(new Error(STALE_SET_MESSAGE));
    respondList = () => Promise.resolve({ data: serverItems });
    const { result } = renderOrderHook();

    act(() => result.current.move(A.id, C.id));
    await advance(SAVE_DELAY_MS);
    expect(ids(result.current.items)).toEqual(ids(serverItems));

    act(() => result.current.move(D.id, C.id));
    act(() => result.current.move(D.id, C.id));
    await advance(5000);

    expect(requests).toHaveLength(1);
  });

  it('falls back to the confirmed order when the resync also fails', async () => {
    respond = () => Promise.reject(new Error(STALE_SET_MESSAGE));
    const { result } = renderOrderHook();

    act(() => result.current.move(A.id, C.id));
    await advance(SAVE_DELAY_MS);

    expect(listRequests).toEqual([LIST_PATH]);
    expect(ids(result.current.items)).toEqual(ids(INITIAL));
    expect(result.current.isSaving).toBe(false);
  });

  it('logs a failed resync as one structured warn line', async () => {
    respond = () => Promise.reject(new Error(STALE_SET_MESSAGE));
    const { result } = renderOrderHook();

    act(() => result.current.move(A.id, C.id));
    await advance(SAVE_DELAY_MS);

    expect(warnLines()).toEqual([
      expect.objectContaining({
        level: 'warn',
        op: 'catalog-reorder-resync',
        dimension: DIMENSION,
        err: 'offline',
      }),
    ]);
  });

  it('treats a list reply of an unexpected shape as a failed resync and logs it', async () => {
    respond = () => Promise.reject(new Error(STALE_SET_MESSAGE));
    // apiClientFetch resolves undefined for an empty body.
    respondList = () => Promise.resolve(undefined);
    const { result } = renderOrderHook();

    act(() => result.current.move(A.id, C.id));
    await advance(SAVE_DELAY_MS);

    expect(ids(result.current.items)).toEqual(ids(INITIAL));
    expect(warnLines()).toEqual([
      expect.objectContaining({
        op: 'catalog-reorder-resync',
        err: expect.stringContaining('unexpected shape'),
      }),
    ]);
  });

  it('logs nothing when the resync succeeds', async () => {
    respond = () => Promise.reject(new Error(STALE_SET_MESSAGE));
    respondList = () => Promise.resolve({ data: INITIAL });
    const { result } = renderOrderHook();

    act(() => result.current.move(A.id, C.id));
    await advance(SAVE_DELAY_MS);

    expect(warnLines()).toEqual([]);
  });

  it('is saving only while the PUT is in flight', async () => {
    const put = deferred();
    respond = () => put.promise;
    const { result } = renderOrderHook();

    act(() => result.current.move(A.id, C.id));
    expect(result.current.isSaving).toBe(false);
    await advance(SAVE_DELAY_MS);
    expect(result.current.isSaving).toBe(true);

    await act(async () => {
      put.resolve();
      await put.promise;
    });

    expect(result.current.isSaving).toBe(false);
    expect(ids(result.current.items)).toEqual([B.id, C.id, A.id, D.id]);
  });

  it('reverts to the order confirmed by the last successful PUT', async () => {
    const { result } = renderOrderHook();

    act(() => result.current.move(A.id, C.id));
    await advance(SAVE_DELAY_MS);
    expect(requests).toHaveLength(1);

    respond = () => Promise.reject(new Error('boom'));
    act(() => result.current.move(D.id, B.id));
    expect(ids(result.current.items)).toEqual([D.id, B.id, C.id, A.id]);
    await advance(SAVE_DELAY_MS);

    expect(requests).toHaveLength(2);
    expect(ids(result.current.items)).toEqual([B.id, C.id, A.id, D.id]);
  });

  it('refuses a move while the PUT is in flight', async () => {
    const put = deferred();
    respond = () => put.promise;
    const { result } = renderOrderHook();

    act(() => result.current.move(A.id, C.id));
    await advance(SAVE_DELAY_MS);
    expect(result.current.isSaving).toBe(true);

    act(() => result.current.move(D.id, B.id));
    expect(ids(result.current.items)).toEqual([B.id, C.id, A.id, D.id]);

    await act(async () => {
      put.resolve();
      await put.promise;
    });
    await advance(5000);

    expect(requests).toHaveLength(1);
    expect(ids(result.current.items)).toEqual([B.id, C.id, A.id, D.id]);
  });

  it('holds the pending save while paused and restarts the full wait on resume', async () => {
    const { result } = renderOrderHook();

    act(() => result.current.move(A.id, C.id));
    await advance(1500);
    act(() => result.current.pause());
    await advance(5000);
    expect(requests).toEqual([]);

    act(() => result.current.resume());
    await advance(SAVE_DELAY_MS - 1);
    expect(requests).toEqual([]);
    await advance(1);

    expect(requests).toHaveLength(1);
    expect(requests[0].body.ids).toEqual([B.id, C.id, A.id, D.id]);
  });

  it('sends nothing on resume when the order matches the confirmed one', async () => {
    const { result } = renderOrderHook();

    act(() => result.current.pause());
    act(() => result.current.resume());
    await advance(5000);

    expect(requests).toEqual([]);
  });

  it('sends the pending order at once when it unmounts while paused', async () => {
    const { result, unmount } = renderOrderHook();

    act(() => result.current.move(A.id, C.id));
    act(() => result.current.pause());
    unmount();

    expect(requests).toHaveLength(1);
    expect(requests[0].body.ids).toEqual([B.id, C.id, A.id, D.id]);
  });

  it('does not save again after a successful PUT when nothing moved', async () => {
    const { result } = renderOrderHook();

    act(() => result.current.move(A.id, C.id));
    await advance(SAVE_DELAY_MS);
    await advance(5000);

    expect(requests).toHaveLength(1);
  });

  it('sends a created item at the end and keeps it when the PUT fails', async () => {
    respond = () => Promise.reject(new Error('boom'));
    const { result } = renderOrderHook();

    act(() => result.current.move(A.id, C.id));
    act(() => result.current.applyCreated(N));
    expect(ids(result.current.items)).toEqual([B.id, C.id, A.id, D.id, N.id]);
    await advance(SAVE_DELAY_MS);

    expect(requests).toHaveLength(1);
    expect(requests[0].body.ids).toEqual([B.id, C.id, A.id, D.id, N.id]);
    expect(ids(result.current.items)).toEqual([A.id, B.id, C.id, D.id, N.id]);
  });

  it('keeps one copy of a created item applied twice, in the list and in the next PUT', async () => {
    const { result } = renderOrderHook();

    act(() => result.current.applyCreated(N));
    act(() => result.current.applyCreated(N));
    expect(ids(result.current.items)).toEqual([...ids(INITIAL), N.id]);

    act(() => result.current.move(A.id, C.id));
    await advance(SAVE_DELAY_MS);

    expect(requests).toHaveLength(1);
    expect(requests[0].body.ids).toEqual([B.id, C.id, A.id, D.id, N.id]);
  });

  it('replaces in place a created item the resync already brought in', async () => {
    // The create's reply lands after a resync whose GET already listed N.
    respond = () => Promise.reject(new Error(STALE_SET_MESSAGE));
    respondList = () => Promise.resolve({ data: [N, ...INITIAL] });
    const { result } = renderOrderHook();

    act(() => result.current.move(A.id, C.id));
    await advance(SAVE_DELAY_MS);
    expect(ids(result.current.items)).toEqual([N.id, ...ids(INITIAL)]);

    const renamed: CatalogItem = { ...N, name: 'XXL' };
    act(() => result.current.applyCreated(renamed));
    expect(result.current.items).toEqual([renamed, ...INITIAL]);

    // The baseline holds N once, so moving away and back sends nothing.
    respond = () => Promise.resolve(undefined);
    act(() => result.current.move(A.id, B.id));
    act(() => result.current.move(A.id, B.id));
    await advance(5000);
    expect(requests).toHaveLength(1);
  });

  it('sends nothing for a create alone', async () => {
    const { result } = renderOrderHook();

    act(() => result.current.applyCreated(N));

    expect(ids(result.current.items)).toEqual([...ids(INITIAL), N.id]);
    await advance(5000);
    expect(requests).toEqual([]);
  });

  it('treats a created item as confirmed, so moving away and back sends nothing', async () => {
    const { result } = renderOrderHook();

    act(() => result.current.applyCreated(N));
    act(() => result.current.move(A.id, B.id));
    act(() => result.current.move(A.id, B.id));
    await advance(5000);

    expect(ids(result.current.items)).toEqual([...ids(INITIAL), N.id]);
    expect(requests).toEqual([]);
  });

  it('drops a deleted item from the PUT and never brings it back on revert', async () => {
    respond = () => Promise.reject(new Error('boom'));
    const { result } = renderOrderHook();

    act(() => result.current.applyDeleted(B.id));
    expect(ids(result.current.items)).toEqual([A.id, C.id, D.id]);
    act(() => result.current.move(A.id, C.id));
    await advance(SAVE_DELAY_MS);

    expect(requests).toHaveLength(1);
    expect(requests[0].body.ids).toEqual([C.id, A.id, D.id]);
    expect(ids(result.current.items)).toEqual([A.id, C.id, D.id]);
  });

  it('treats a deleted item as confirmed, so moving away and back sends nothing', async () => {
    const { result } = renderOrderHook();

    act(() => result.current.applyDeleted(B.id));
    act(() => result.current.move(A.id, C.id));
    act(() => result.current.move(A.id, C.id));
    await advance(5000);

    expect(ids(result.current.items)).toEqual([A.id, C.id, D.id]);
    expect(requests).toEqual([]);
  });

  it('keeps the position of a renamed item and sends nothing', async () => {
    const { result } = renderOrderHook();

    act(() => result.current.applyUpdated({ id: C.id, name: 'renamed' }));

    expect(ids(result.current.items)).toEqual(ids(INITIAL));
    expect(result.current.items[2]).toEqual({ id: C.id, name: 'renamed' });
    await advance(5000);
    expect(requests).toEqual([]);
  });

  it('keeps the latest names when it reverts', async () => {
    respond = () => Promise.reject(new Error('boom'));
    const { result } = renderOrderHook();

    act(() => result.current.move(A.id, C.id));
    act(() => result.current.applyUpdated({ id: A.id, name: 'renamed' }));
    await advance(SAVE_DELAY_MS);

    expect(result.current.items[0]).toEqual({ id: A.id, name: 'renamed' });
  });

  it('sends the pending order at once when it unmounts with a save pending', async () => {
    const { result, unmount } = renderOrderHook();

    act(() => result.current.move(A.id, C.id));
    unmount();

    expect(requests).toEqual([
      {
        path: ORDER_PATH,
        method: 'PUT',
        body: { ids: [B.id, C.id, A.id, D.id] },
        token: 'token-1',
      },
    ]);
    await advance(5000);
    expect(requests).toHaveLength(1);
  });

  it('sends nothing when it unmounts with nothing pending', async () => {
    const { unmount } = renderOrderHook();

    unmount();
    await advance(5000);

    expect(requests).toEqual([]);
  });

  it('sends nothing when it unmounts after the save already went out', async () => {
    const { result, unmount } = renderOrderHook();

    act(() => result.current.move(A.id, C.id));
    await advance(SAVE_DELAY_MS);
    unmount();
    await advance(5000);

    expect(requests).toHaveLength(1);
  });

  it('sends no second PUT when it unmounts while the save is in flight', async () => {
    const put = deferred();
    respond = () => put.promise;
    const { result, unmount } = renderOrderHook();

    act(() => result.current.move(A.id, C.id));
    await advance(SAVE_DELAY_MS);
    unmount();
    await act(async () => {
      put.resolve();
      await put.promise;
    });

    expect(requests).toHaveLength(1);
  });

  it('sends nothing on the StrictMode remount and one PUT per burst', async () => {
    const wrapper = ({ children }: { children: ReactNode }): ReactElement => (
      <StrictMode>{children}</StrictMode>
    );
    const { result } = renderHook(
      () => useCatalogOrder(DIMENSION, INITIAL, 'token-1'),
      { wrapper },
    );

    await advance(5000);
    expect(requests).toEqual([]);

    act(() => result.current.move(A.id, C.id));
    await advance(SAVE_DELAY_MS);

    expect(requests).toHaveLength(1);
    expect(requests[0].body.ids).toEqual([B.id, C.id, A.id, D.id]);
  });

  it('uses the latest token when the timer fires', async () => {
    const { result, rerender } = renderOrderHook('token-1');

    act(() => result.current.move(A.id, C.id));
    rerender({ token: 'token-2' });
    await advance(SAVE_DELAY_MS);

    expect(requests).toHaveLength(1);
    expect(requests[0].token).toBe('token-2');
  });
});
