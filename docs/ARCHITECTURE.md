# Architecture — hefesto-front

Hefesto frontend is a Next.js 16 application using the App Router. It serves as the web interface for a leather-goods business management system, communicating exclusively with a NestJS REST backend over HTTP.

---

## System Overview

The frontend is a hybrid server/client rendered application. Pages that only need to display data are Server Components — they fetch from the backend at request time on the server, then hand hydrated data down to Client Components that own interactivity. There is no dedicated API layer inside the Next.js app beyond the Auth.js route handler; all business data comes from the NestJS backend.

```
Browser ──→ Next.js (Vercel)
              │
              ├─ Server Components  ──→ NestJS API (Railway)  ──→ PostgreSQL
              │    (apiFetch, SSR)
              │
              └─ Client Components  ──→ NestJS API (Railway)
                   (apiClientFetch, interactive mutations)
```

---

## App Router Structure

```
src/app/
├── layout.tsx              ← Root layout: fonts, ThemeProvider, SessionProvider, Toaster
├── globals.css
│
├── (app)/                  ← Authenticated route group — sidebar + header shell
│   ├── layout.tsx          ← SidebarProvider + AppSidebar + Header + <main>
│   ├── page.tsx            ← Dashboard home (quick-link cards, permission-filtered)
│   ├── loading.tsx         ← Segment-level Suspense fallback (spinner)
│   ├── error.tsx           ← Segment-level error boundary (retry button)
│   │
│   ├── insumos/page.tsx
│   ├── productos/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── proveedores/
│   │   ├── page.tsx
│   │   ├── nuevo/page.tsx
│   │   └── [id]/editar/
│   │       ├── page.tsx
│   │       └── EditSupplierClient.tsx
│   ├── catalogos/page.tsx
│   ├── finanzas/gastos/page.tsx
│   ├── calculadora/
│   │   ├── page.tsx
│   │   └── CalculadoraClient.tsx
│   ├── escenarios/
│   │   ├── page.tsx
│   │   ├── ScenarioListClient.tsx
│   │   └── [id]/page.tsx  (ScenarioEditorClient)
│   ├── configuracion/tiendanube/
│   │   ├── page.tsx
│   │   └── TiendanubeConfigClient.tsx
│   ├── usuarios/
│   │   ├── page.tsx
│   │   └── UsersClient.tsx
│   └── roles/
│       ├── page.tsx
│       └── RolesClient.tsx
│
├── (auth)/                 ← Unauthenticated route group — centred card layout
│   ├── layout.tsx          ← Simple flex-center wrapper
│   ├── login/              ← Auth.js sign-in page
│   └── acceso-denegado/    ← Shown when backend token is absent after Google OAuth
│
└── api/auth/[...nextauth]/route.ts  ← Auth.js catch-all handler (GET + POST)
```

### Route Group Rationale

`(app)` and `(auth)` are Next.js route groups — they segment the layout tree without adding a URL segment. Every protected page inherits the `(app)` layout (sidebar + header) automatically. Auth pages inherit the centred-card layout. This avoids passing layout wrappers as props and keeps each group independently testable.

---

## Data Flow

### Server-side fetch (read path)

All page-level data loading uses `apiFetch`, a thin async wrapper defined in `src/lib/api.ts`:

1. Page component (`async function`) calls `auth()` to retrieve the current session.
2. `apiFetch` reads `session.accessToken` and attaches it as a `Bearer` header.
3. A parallel `Promise.all` issues all required backend calls in one tick.
4. The resolved data is passed as props into a Client Component that takes ownership of interactivity.

```
(app)/insumos/page.tsx (Server Component, async)
  │
  ├── auth()  → session.accessToken
  │
  └── Promise.all([
        apiFetch('/api/supplies?includeInactive=true'),
        apiFetch('/api/catalogs/supply-types'),
        apiFetch('/api/suppliers?active=true'),
      ])
        │
        └── <SupplyTable initialSupplies={…} canEdit={…} />  (Client Component)
```

The Server Component also reads `session.user.permissions` to derive the `canEdit` boolean and pass it down as a prop, keeping permission checks close to the data load.

### Client-side fetch (mutation path)

Interactive Client Components call `apiClientFetch`, defined in `src/lib/api-client.ts`:

1. Component reads `session.accessToken` from `useSession()`.
2. Passes the token explicitly to `apiClientFetch(path, token, options)`.
3. On `401`, the function redirects to `/login` via `window.location.href`.
4. On `204 No Content`, returns `undefined` without attempting `res.json()` (avoids SyntaxError on DELETE responses).
5. On success, the component calls `router.refresh()` (Next.js soft revalidation) or updates local state directly.

```
SupplyTable (Client Component)
  │
  ├── useSession()  → token
  │
  ├── apiClientFetch(PATCH /api/supplies/:id, token, { body })
  │     ├── 401 → window.location.href = '/login'
  │     ├── 403 → throws 'No tenes permisos…'
  │     ├── 204 → returns undefined
  │     └── 2xx → returns parsed JSON
  │
  └── toast.success / router.refresh()
```

### Why two fetch functions?

| | `apiFetch` | `apiClientFetch` |
|---|---|---|
| Runtime | Node.js (server) | Browser |
| Token source | `auth()` — reads the server-side session | `useSession()` — reads from client cookie |
| Error handling | Throws generic `Error` | Handles 401 redirect, 403 message, 204 body |
| `'use client'` | No | Yes (marked at top of file) |

`apiFetch` cannot run in the browser because `auth()` is a server-only function. `apiClientFetch` cannot run on the server because it references `window`.

---

## Authentication & Route Gating

Authentication is implemented with Auth.js v5 (NextAuth) using two providers:

### Providers

| Provider | Flow |
|---|---|
| **Google** | User signs in with Google → `jwt` callback POSTs the Google `id_token` to `POST /api/auth/google` on the NestJS backend → backend returns a JWT + `Permissions` object |
| **Credentials (demo)** | Local convenience for evaluating the app without Google OAuth setup — POSTs an email to `POST /api/auth/demo-login` → receives JWT + Permissions (gated by `DEMO_LOGIN_ENABLED`, pinned to one account) |

### Token shape

Auth.js stores a custom JWT containing three fields beyond the standard NextAuth claims:

```typescript
// src/types/next-auth.d.ts
interface JWT {
  backendToken?: string;   // NestJS-issued JWT, forwarded as Bearer on every request
  permissions?: Permissions;
  userId?: string;
}

interface Session {
  accessToken: string;     // mapped from token.backendToken
  user: {
    id: string;
    permissions: Permissions;
    email: string;
    name: string;
    image: string;
  };
}
```

A stale-token guard in the `jwt` callback detects old-format tokens that carry `token.role` instead of `token.permissions` and clears `backendToken`, forcing re-authentication on the next navigation.

### Middleware gating (`src/middleware.ts`)

The middleware runs on every non-static request (matcher excludes `api`, `_next/*`, `favicon.ico`, fonts, images, brand assets).

Three checks in order:

1. **Unauthenticated**: no `req.auth` → redirect to `/login?callbackUrl=…`
2. **Backend rejected**: authenticated but `req.auth.accessToken` is empty → redirect to `/acceso-denegado` (backend was unreachable during OAuth)
3. **Permission check**: looks up the requested pathname in `ROUTE_PERMISSIONS`, checks `permissions[requiredPermission]` → redirects to `/` if false

```typescript
const ROUTE_PERMISSIONS: Record<string, keyof Permissions> = {
  '/catalogos':      'canViewProducts',
  '/proveedores':    'canViewSupplies',
  '/insumos':        'canViewSupplies',
  '/productos':      'canViewProducts',
  '/finanzas':       'canViewExpenses',
  '/usuarios':       'canManageUsers',
  '/configuracion':  'canManageConfig',
  '/calculadora':    'canUseCalculator',
  '/escenarios':     'canManageScenarios',
  '/roles':          'canManageUsers',
};
```

Prefix matching is used (`pathname.startsWith(route + '/')`) so `/productos/abc` inherits `/productos`'s permission.

### Client-side permission enforcement

UI elements (sidebar nav groups, edit buttons) read permissions from `usePermissions()`, a hook that wraps `useSession()`:

```typescript
// src/hooks/usePermissions.ts
export function usePermissions(): Permissions {
  const { data: session } = useSession();
  return session?.user?.permissions ?? NO_PERMISSIONS;
}
```

`AppSidebar` uses this hook to conditionally render navigation groups. Individual feature Client Components (e.g., `SupplyTable`) accept a `canEdit` prop from the Server Component, dual-validated against `usePermissions()` on the client as a second layer.

### Permissions model

`Permissions` is a flat boolean record with 11 keys (defined in `src/types/permissions.ts`):

```
canViewProducts   canEditProducts
canViewSupplies   canEditSupplies
canViewExpenses   canEditExpenses
canUseCalculator  canManageScenarios
canViewDashboard  canManageConfig   canManageUsers
```

Roles are managed server-side (NestJS + PostgreSQL). The frontend has no role-to-permission mapping — it only receives the resolved `Permissions` object from the backend.

---

## Providers & Global State

There is no global state manager (no Redux, Zustand, or React Context for business data). State lives locally in each Client Component with `useState`. Cross-component coordination is achieved by passing data as props from the Server Component or by calling `router.refresh()` after mutations to re-trigger the server fetch.

Two providers wrap the entire application in `src/app/layout.tsx`:

```
<ThemeProvider>          ← next-themes, dark mode by default, class strategy
  <SessionProvider>      ← NextAuth SessionProvider (exposes useSession() in client tree)
    {children}
    <Toaster />          ← Sonner toast container
  </SessionProvider>
</ThemeProvider>
```

Both providers are `'use client'` wrappers — thin adapters that let the Root Layout (a Server Component) inject client-side context without lifting the layout itself to a Client Component.

---

## Component Organization

Components live in `src/components/` and are organized by feature module, mirroring the route structure:

```
src/components/
├── layout/
│   ├── AppSidebar.tsx      ← Permission-filtered navigation, collapsible icon mode
│   └── Header.tsx          ← Sticky header, user avatar + sign-out dropdown
│
├── ui/                     ← Shadcn/ui primitives (button, dialog, table, sidebar…)
│                              Never modified directly — regenerate via shadcn CLI
│
├── calculator/             ← Calculator feature sub-components
│   ├── ModeToggle.tsx      ← forward / inverse mode switch
│   ├── ProductSelector.tsx ← product combobox
│   ├── GatewaySelectors.tsx← gateway + plan + installments selection
│   └── DesglosePanel.tsx   ← result breakdown display
│
├── scenarios/              ← Pricing scenario sub-components
│   ├── ScenarioCard.tsx
│   ├── CreateScenarioDialog.tsx
│   ├── ProductOverrideTable.tsx
│   ├── BulkOverrideDialog.tsx
│   └── MarginSummary.tsx
│
├── products/               ← Product management sub-components + domain types
│   ├── types.ts            ← Product, BomItem, CatalogItem, helper functions
│   ├── ProductTable.tsx    ← Grouped display (type → name → row)
│   ├── ProductDetailClient.tsx
│   ├── BomEditorDialog.tsx ← Bill-of-materials editor
│   ├── ProductEditDialog.tsx
│   └── …
│
├── supplies/               ← Supply (insumo) management sub-components
│   ├── types.ts            ← Supply, PriceRecord, formatPrice
│   ├── SupplyTable.tsx     ← Grouped display (type → row), inline price entry
│   ├── SupplyFormDialog.tsx
│   └── …
│
├── expenses/               ← Expense management sub-components
│   ├── types.ts            ← Expense, groupByMonth, formatters
│   ├── ExpenseTable.tsx
│   └── ExpenseMonthGroup.tsx
│
├── suppliers/              ← Supplier CRUD sub-components
│   └── SupplierForm.tsx    ← Shared form used by both create and edit flows
│
├── catalogs/               ← Catalog dimension management (types, names, colors…)
│   ├── CatalogTabContent.tsx
│   └── CatalogItemRow.tsx
│
└── tiendanube-config/      ← Tiendanube configuration sections
    ├── types.ts            ← TiendanubeConfigAll, TnPlan, TnGatewayRate, etc.
    ├── GatewaySection.tsx
    ├── PlansSection.tsx
    ├── InstallmentsSection.tsx
    └── TaxConfigSection.tsx
```

### The Server/Client split pattern

Each feature follows the same structural pattern:

```
app/(app)/[feature]/page.tsx          ← async Server Component
  │  reads session, calls apiFetch(), derives canEdit
  └─→ components/[feature]/[Feature]Table.tsx  ← 'use client' Client Component
        │  owns useState, calls apiClientFetch() for mutations
        └─→ components/[feature]/[Feature]FormDialog.tsx  ← modal, also 'use client'
```

The Server Component is intentionally thin — it exists only to load data and pass it down. All UI logic, filtering, sorting, and mutation handling live in the Client Component. This keeps server-rendered HTML correct on first load without shipping large interactive bundles in the RSC payload.

---

## Types Architecture

Types are split across two locations with different purposes:

### `src/types/` — cross-cutting domain types

| File | Contents |
|---|---|
| `permissions.ts` | `Permissions` interface, `NO_PERMISSIONS` constant, `PERMISSION_KEYS` tuple |
| `role.ts` | `RoleRow`, `RoleOption` — admin role management shapes |
| `supply.ts` | `SupplyOption`, `UnitType`, `UNIT_LABELS` — shared supply reference |
| `next-auth.d.ts` | Module augmentation extending `Session`, `User`, and `JWT` |

### `src/components/[feature]/types.ts` — feature-local types

Each feature module owns its data shapes. This avoids a monolithic types file and keeps the blast radius of a backend API change contained to one component directory.

| Feature | Notable exports |
|---|---|
| `products/types.ts` | `Product`, `BomItem`, `CatalogItem`, `getProductDisplayName()`, `formatCost()` |
| `supplies/types.ts` | `Supply`, `PriceRecord`, `formatPrice()` |
| `expenses/types.ts` | `Expense`, `ExpenseCategory`, `groupByMonth()`, `formatAmount()` |
| `scenarios/types.ts` | `Scenario`, `ScenarioProductResult`, `ScenarioCalcResult`, `CreateScenarioPayload` |
| `calculator/types.ts` | `CalcResult`, `CalcInverseResult`, `CalcBatchItem` |
| `tiendanube-config/types.ts` | `TiendanubeConfigAll`, `TnPlan`, `TnGatewayRate`, `TnTaxConfig` |

---

## Key Cross-Cutting Patterns

### `src/lib/`

| File | Purpose |
|---|---|
| `api.ts` | `apiFetch<T>` — server-side authenticated fetch |
| `api-client.ts` | `apiClientFetch<T>` — client-side authenticated fetch with 401/403/204 handling |
| `formatters.ts` | `formatDate(iso)` — locale-aware date formatting for `es-AR` |
| `utils.ts` | `cn(...inputs)` — Tailwind class merge utility (clsx + tailwind-merge) |
| `suppliers.ts` | `cleanSupplierData()` — strips empty optional fields before PATCH/POST |

### `src/constants/`

| File | Purpose |
|---|---|
| `tiendanube.ts` | Named constants for Tiendanube slugs: `TN_PLAN_ESENCIAL`, `TN_GATEWAY_PAGO_NUBE`, `TN_PAYMENT_TARJETA` — prevents magic strings across calculator and config components |

### `src/hooks/`

| Hook | Purpose |
|---|---|
| `usePermissions()` | Reads `Permissions` from `useSession()`, returns `NO_PERMISSIONS` as safe default |
| `useIsMobile()` | Responsive breakpoint detection via `matchMedia` (threshold: 768px) |

### Form validation

Client Components that handle form input use `react-hook-form` with `zod` schemas and `@hookform/resolvers/zod`. This pattern appears in `UsersClient`, `RolesClient`, and similar mutation-heavy components. Validation runs client-side before the `apiClientFetch` call, providing instant feedback without a round-trip.

### Optimistic UI / refresh strategy

After a successful mutation, Client Components follow one of two patterns:

- **Local state update** — for additions and deletions within an already-loaded list (e.g., add a supply: `setSupplies(prev => [...prev, newItem])`).
- **`router.refresh()`** — for changes where the full server-fetched state must be re-derived (e.g., after editing a product that affects cost calculations). This triggers a soft re-render using Next.js App Router's server fetch without a full page reload.

### Toast notifications

All user-visible feedback (success, error) goes through `sonner` (`toast.success`, `toast.error`). The `<Toaster />` is mounted in the root layout so toasts are available everywhere without additional providers.

---

## Build & Tooling Configuration

| Config | Notable settings |
|---|---|
| `next.config.mjs` | `reactStrictMode: true`, Turbopack enabled, SVG via `@svgr/webpack`, `removeConsole` in production (keeps `error`/`warn`) |
| `tsconfig.json` | Path alias `@/*` → `./src/*`, strict mode |
| `postcss.config.mjs` | Tailwind v4 |
| `components.json` | Shadcn/ui registry config |
| `jest.config.js` | Unit tests with `jest` + `@testing-library/react`, coverage in `coverage/` |
