import type { ReactElement } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toaster } from 'sonner';

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: { accessToken: 'test-token' } }),
}));

jest.mock('@/lib/api-client', () => ({
  apiClientFetch: jest.fn(),
}));

import { apiClientFetch } from '@/lib/api-client';
import { CatalogTabContent } from '@/components/catalogs/CatalogTabContent';

const mockApiClientFetch = apiClientFetch as jest.MockedFunction<
  typeof apiClientFetch
>;

interface CatalogItem {
  id: string;
  name: string;
}

interface RecordedRequest {
  path: string;
  method: string | undefined;
  body: unknown;
}

const DIMENSION = 'product-sizes';
const BASE_PATH = `/api/catalogs/${DIMENSION}`;
const ORDER_PATH = `${BASE_PATH}/order`;
const ROW_HEIGHT = 40;

const INSTRUCTIONS =
  'Para mover un ítem, presioná espacio o enter. Usá las flechas para elegir la nueva posición y espacio o enter para soltarlo. Escape cancela.';

const M: CatalogItem = {
  id: '3f0c7a52-8b1e-4c39-9a6d-1e2f3a4b5c6d',
  name: 'M',
};
const XS: CatalogItem = {
  id: '7d4e9b13-2a5f-4e8c-b7d1-6f5e4d3c2b1a',
  name: 'XS',
};
const L: CatalogItem = {
  id: 'a9b8c7d6-e5f4-4a3b-8c2d-1e0f9a8b7c6d',
  name: 'L',
};
const CREATED: CatalogItem = {
  id: 'c1d2e3f4-a5b6-4c7d-9e8f-0a1b2c3d4e5f',
  name: 'AA',
};

let requests: RecordedRequest[];
let respondToOrder: () => Promise<unknown>;

function renderTab(items: CatalogItem[], canEdit = true): void {
  function Harness(): ReactElement {
    return (
      <>
        <CatalogTabContent
          dimension={DIMENSION}
          initialItems={items}
          canEdit={canEdit}
        />
        <Toaster />
      </>
    );
  }
  render(<Harness />);
}

function handles(): HTMLElement[] {
  return screen.queryAllByRole('button', { name: /^Mover / });
}

/** Row names in display order, read from the drag handles' accessible names. */
function rowOrder(): string[] {
  return handles().map((handle) =>
    (handle.getAttribute('aria-label') ?? '').replace(/^Mover /, ''),
  );
}

function orderRequests(): RecordedRequest[] {
  return requests.filter(
    (request) => request.path === ORDER_PATH && request.method === 'PUT',
  );
}

/**
 * jsdom lays nothing out, so every rect is zero and dnd-kit's keyboard
 * coordinate getter finds no row below the active one (RESEARCH Pitfall 9).
 * Give each element a rect by its index among its siblings: the sortable rows
 * share one parent, so row i sits at top = i * ROW_HEIGHT.
 */
function mockRowRects(): jest.SpyInstance {
  return jest
    .spyOn(Element.prototype, 'getBoundingClientRect')
    .mockImplementation(function rect(this: Element): DOMRect {
      const siblings = this.parentElement
        ? Array.from(this.parentElement.children)
        : [this];
      const top = siblings.indexOf(this) * ROW_HEIGHT;
      return {
        x: 0,
        y: top,
        top,
        left: 0,
        right: 300,
        bottom: top + ROW_HEIGHT,
        width: 300,
        height: ROW_HEIGHT,
        toJSON: () => ({}),
      } as DOMRect;
    });
}

async function advance(ms: number): Promise<void> {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

/** Text of dnd-kit's live region, which screen readers speak. */
function announcement(): string {
  return document.querySelector('[id^="DndLiveRegion"]')?.textContent ?? '';
}

interface KeyboardMoveAnnouncements {
  lifted: string;
  moved: string;
  dropped: string;
}

async function keyboardMoveFirstRowDown(): Promise<KeyboardMoveAnnouncements> {
  const [first] = handles();
  act(() => first.focus());
  fireEvent.keyDown(first, { code: 'Space', key: ' ' });
  // The keyboard sensor attaches its document listeners on a 0 ms timeout.
  await advance(0);
  const lifted = announcement();
  fireEvent.keyDown(first, { code: 'ArrowDown', key: 'ArrowDown' });
  await advance(0);
  const moved = announcement();
  fireEvent.keyDown(first, { code: 'Space', key: ' ' });
  await advance(0);
  return { lifted, moved, dropped: announcement() };
}

beforeEach(() => {
  requests = [];
  respondToOrder = () => Promise.resolve(undefined);
  mockApiClientFetch.mockReset();
  mockApiClientFetch.mockImplementation(
    <T,>(
      path: string,
      _token: string,
      options: RequestInit = {},
    ): Promise<T> => {
      const body: unknown =
        options.body === undefined
          ? undefined
          : JSON.parse(String(options.body));
      requests.push({ path, method: options.method, body });

      if (path === ORDER_PATH) return respondToOrder() as Promise<T>;
      if (path === BASE_PATH && options.method === 'POST') {
        const { name } = body as { name: string };
        return Promise.resolve({ data: { id: CREATED.id, name } } as T);
      }
      if (options.method === 'PUT') {
        const id = path.slice(BASE_PATH.length + 1);
        const { name } = body as { name: string };
        return Promise.resolve({ data: { id, name } } as T);
      }
      return Promise.resolve(undefined as T);
    },
  );
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('CatalogTabContent', () => {
  it('renders items in the order received, with no alphabetical re-sort', () => {
    renderTab([M, XS, L]);

    expect(rowOrder()).toEqual(['M', 'XS', 'L']);
  });

  it('renders no drag handle without edit permission, but still renders the rows', () => {
    renderTab([M, XS, L], false);

    expect(handles()).toHaveLength(0);
    expect(screen.getByText('M')).toBeInTheDocument();
    expect(screen.getByText('XS')).toBeInTheDocument();
    expect(screen.getByText('L')).toBeInTheDocument();
  });

  it('renders one handle per row named after the item', () => {
    renderTab([M, XS, L]);

    expect(
      handles().map((handle) => handle.getAttribute('aria-label')),
    ).toEqual(['Mover M', 'Mover XS', 'Mover L']);
  });

  it('shows the empty state and no drag context with 0 items', () => {
    renderTab([]);

    expect(
      screen.getByText('No hay items en este catalogo.'),
    ).toBeInTheDocument();
    expect(handles()).toHaveLength(0);
    expect(document.querySelector('[id^="DndDescribedBy"]')).toBeNull();
  });

  it('renders a single item with its handle', () => {
    renderTab([M]);

    expect(rowOrder()).toEqual(['M']);
    expect(
      screen.queryByText('No hay items en este catalogo.'),
    ).not.toBeInTheDocument();
  });

  it('appends a created item at the end', async () => {
    const user = userEvent.setup();
    renderTab([M, XS, L]);

    await user.click(screen.getByRole('button', { name: 'Agregar' }));
    await user.type(screen.getByPlaceholderText('Nombre del item...'), 'AA');
    await user.keyboard('{Enter}');

    expect(
      await screen.findByRole('button', { name: 'Mover AA' }),
    ).toBeInTheDocument();
    expect(rowOrder()).toEqual(['M', 'XS', 'L', 'AA']);
    expect(requests).toEqual([
      { path: BASE_PATH, method: 'POST', body: { name: 'AA' } },
    ]);
  });

  it('keeps a renamed item in its position', async () => {
    const user = userEvent.setup();
    renderTab([M, XS, L]);

    const firstRow = handles()[0].parentElement as HTMLElement;
    // Row buttons: drag handle, pencil, trash.
    await user.click(within(firstRow).getAllByRole('button')[1]);
    const input = within(firstRow).getByDisplayValue('M');
    await user.clear(input);
    await user.type(input, 'MM{Enter}');

    expect(
      await screen.findByRole('button', { name: 'Mover MM' }),
    ).toBeInTheDocument();
    expect(rowOrder()).toEqual(['MM', 'XS', 'L']);
    expect(requests).toEqual([
      { path: `${BASE_PATH}/${M.id}`, method: 'PUT', body: { name: 'MM' } },
    ]);
  });

  it('makes every handle a keyboard-operable button with Spanish instructions', () => {
    renderTab([M, XS, L]);

    const all = handles();
    expect(all).toHaveLength(3);
    for (const handle of all) {
      expect(handle.tagName).toBe('BUTTON');
      expect(handle.tabIndex).toBe(0);
      expect(handle).toHaveAttribute('aria-roledescription', 'ordenable');

      act(() => handle.focus());
      expect(document.activeElement).toBe(handle);

      const describedById = handle.getAttribute('aria-describedby');
      expect(describedById).toBeTruthy();
      const instructions = document.getElementById(describedById ?? '');
      expect(instructions).not.toBeNull();
      expect(instructions?.textContent).toBe(INSTRUCTIONS);
    }
  });

  it('reorders with the keyboard only and saves the new order once after 2 s', async () => {
    jest.useFakeTimers();
    mockRowRects();
    renderTab([M, XS, L]);

    const spoken = await keyboardMoveFirstRowDown();

    expect(rowOrder()).toEqual(['XS', 'M', 'L']);
    // Spanish announcements name the item and its position, never its UUID.
    // On lift dnd-kit reports the row as over its own slot right away, so
    // the start message may already be replaced; it still names the item.
    expect(spoken.lifted).toMatch(/M/);
    expect(spoken.lifted).not.toContain(M.id);
    expect(spoken.moved).toBe('M está en la posición 2 de 3.');
    expect(spoken.dropped).toBe('Soltaste M en la posición 2 de 3.');
    expect(orderRequests()).toHaveLength(0);
    await advance(2000);
    expect(orderRequests()).toEqual([
      { path: ORDER_PATH, method: 'PUT', body: { ids: [XS.id, M.id, L.id] } },
    ]);
  });

  it('holds the save while a keyboard drag spans the 2 s window', async () => {
    jest.useFakeTimers();
    mockRowRects();
    renderTab([M, XS, L]);

    await keyboardMoveFirstRowDown();
    expect(rowOrder()).toEqual(['XS', 'M', 'L']);
    await advance(1500);

    // Lift M, step down, and keep it lifted past the first drop's 2 s mark.
    const moving = handles()[1];
    act(() => moving.focus());
    fireEvent.keyDown(moving, { code: 'Space', key: ' ' });
    await advance(0);
    fireEvent.keyDown(moving, { code: 'ArrowDown', key: 'ArrowDown' });
    await advance(1000);
    expect(orderRequests()).toHaveLength(0);
    fireEvent.keyDown(moving, { code: 'Space', key: ' ' });
    await advance(0);

    expect(rowOrder()).toEqual(['XS', 'L', 'M']);
    await advance(1999);
    expect(orderRequests()).toHaveLength(0);
    await advance(1);
    expect(orderRequests()).toEqual([
      { path: ORDER_PATH, method: 'PUT', body: { ids: [XS.id, L.id, M.id] } },
    ]);
  });

  it('restarts the 2 s wait when a drag is cancelled with Escape', async () => {
    jest.useFakeTimers();
    mockRowRects();
    renderTab([M, XS, L]);

    await keyboardMoveFirstRowDown();
    await advance(1500);

    const lifted = handles()[0];
    act(() => lifted.focus());
    fireEvent.keyDown(lifted, { code: 'Space', key: ' ' });
    await advance(1000);
    fireEvent.keyDown(lifted, { code: 'Escape', key: 'Escape' });
    await advance(0);

    expect(orderRequests()).toHaveLength(0);
    await advance(1999);
    expect(orderRequests()).toHaveLength(0);
    await advance(1);
    expect(orderRequests()).toEqual([
      { path: ORDER_PATH, method: 'PUT', body: { ids: [XS.id, M.id, L.id] } },
    ]);
  });

  it('reverts to the confirmed order and shows an error toast when the save fails', async () => {
    jest.useFakeTimers();
    mockRowRects();
    respondToOrder = () => Promise.reject(new Error('No se pudo guardar'));
    renderTab([M, XS, L]);

    await keyboardMoveFirstRowDown();
    expect(rowOrder()).toEqual(['XS', 'M', 'L']);
    await advance(2000);

    expect(rowOrder()).toEqual(['M', 'XS', 'L']);
    expect(await screen.findByText('No se pudo guardar')).toBeInTheDocument();
  });
});
