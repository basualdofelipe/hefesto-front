# hefesto-front

Frontend web app for **Hefesto** — a management and pricing tool for a leather-goods business (marroquineria). Covers product/cost management, supplies and supplier catalogs, business expenses, a Tiendanube pricing calculator, pricing scenarios, and an investor dashboard. Talks to a NestJS REST API ([hefesto-back](../hefesto-back/)). Built deployment-ready for Vercel, but runs locally for evaluation — there is no hosted instance (see [Local setup](#local-setup)).

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.1.6 (App Router) |
| Language | TypeScript 5 (strict, no `any`, explicit return types) |
| Styling | Tailwind CSS v4 + Shadcn/ui (New York style, Lucide icons) |
| Auth | Auth.js v5 (NextAuth) — Google OAuth + credentials (demo login) |
| Forms | React Hook Form + Zod v4 |
| Testing | Jest 30 + Testing Library + jsdom |
| Linting | ESLint 9 (eslint-config-next, @typescript-eslint, sonarjs) + Prettier 3 |
| Fonts | Poppins (UI), JetBrains Mono (code/numbers), EngravingCC (display) |

---

## Features by module

### Products (`/productos`)
Hierarchical product catalog: type → name → finish → color → size. Each product carries a Bill of Materials (BOM) — leather area in m², additional supplies with quantities. Inline selling-price editing, BOM editor dialog, price history, batch-price dialog for multi-product updates. Grouped by type → name in an expandable table.

### Supplies & Suppliers (`/insumos`, `/proveedores`)
Supply catalog (leather, hardware, packaging, etc.) with unit types (m², units, metres, kg), current price tracking, and price history timeline. Supplier directory with contact details (address, email, phone, WhatsApp).

### Expenses (`/finanzas/gastos`)
Business expense register. Filtered by month, grouped by month in an accordion table. Category-based classification, inline create/edit/delete per permission level.

### Tiendanube Calculator (`/calculadora`)
Two modes — **forward** (given a selling price, compute net profit) and **inverse** (given a desired margin, compute the required price). Accounts for Tiendanube plan commissions, payment gateway rates, installment fees, VAT (IVA), Ingresos Brutos withholding, and shipping cost. Debounced auto-calculation at 300 ms. Full desglose (breakdown) panel.

### Pricing Scenarios (`/escenarios`)
Save named Tiendanube configurations (gateway, plan, installments) and apply per-product price overrides to simulate pricing changes without modifying live data. Public/private scenarios, margin summary table comparing simulated vs real results.

### Catalogs (`/catalogos`)
Admin-level management of the reference data dimensions used across the app: product types, names, finishes, colors, sizes, supply types, and expense categories. Tabbed UI.

### Tiendanube Config (`/configuracion/tiendanube`)
Configure gateway rate tables, plan slugs/commissions, installment surcharge tables, and tax/withholding parameters. Consumed by the calculator and scenario engine.

### Users & Roles (`/usuarios`, `/roles`)
Role-based access control. Roles carry 11 granular permission flags (`canViewProducts`, `canEditProducts`, `canViewSupplies`, `canEditSupplies`, `canViewExpenses`, `canEditExpenses`, `canUseCalculator`, `canManageScenarios`, `canViewDashboard`, `canManageConfig`, `canManageUsers`). Admins can create custom roles, assign them to users, edit users, or deactivate accounts. System roles are protected from deletion.

---

## Authentication

Auth is handled by Auth.js v5 with two providers:

- **Google OAuth** — The Google ID token is exchanged with the backend (`POST /api/auth/google`) to obtain a JWT. The backend validates the Google user and returns an `accessToken` along with the user's permissions object.
- **Credentials (demo login)** — Calls `POST /api/auth/demo-login` with an email. A local convenience for evaluating the app without setting up Google OAuth credentials; gated behind `DEMO_LOGIN_ENABLED` on the backend and pinned to a single demo account.

The JWT session stores `backendToken` (passed as `Authorization: Bearer` on every API call), `permissions`, and `userId`. `middleware.ts` enforces route-level access: unauthenticated requests are redirected to `/login`; authenticated requests without a backend token are redirected to `/acceso-denegado`; permission checks gate every named route.

---

## Prerequisites

- Node.js >= 20 (matches `@types/node ^20`)
- npm >= 9
- A running instance of **hefesto-back** (default: `http://localhost:4000`)

---

## Local setup

**1. Clone and install**

```bash
git clone <repo-url>
cd hefesto-front
npm install
```

**2. Configure environment**

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_APP_NAME=Hefesto
NEXT_PUBLIC_API_URL=http://localhost:4000   # hefesto-back URL
NODE_ENV=development

# Auth.js v5
AUTH_SECRET=<generate with: npx auth secret>
AUTH_GOOGLE_ID=<your-google-client-id>.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=<your-google-client-secret>
```

`AUTH_SECRET` is required for JWT signing. Generate it with `npx auth secret` or any 32-byte random string. Google credentials are optional if you only use the demo login.

**3. Start the dev server**

```bash
npm run dev
```

The app starts at [http://localhost:3000](http://localhost:3000).

---

## Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Development server (Next.js with Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Start production build locally |
| `npm run lint` | ESLint check |
| `npm run prettier` | Prettier format check |
| `npm run prettier:fix` | Auto-fix formatting |
| `npm run test` | Run Jest test suite |
| `npm run test:watch` | Jest in watch mode |
| `npm run test:coverage` | Jest with v8 coverage report |

---

## Project structure

```
src/
  app/
    (app)/              # Authenticated shell — all business routes
      __tests__/        # Page-level tests
      calculadora/      # Tiendanube pricing calculator
      catalogos/        # Reference data catalogs
      configuracion/
        tiendanube/     # Gateway/plan/tax config
      escenarios/       # Pricing scenarios
      finanzas/
        gastos/         # Expense management
      insumos/          # Supply catalog
      productos/        # Product catalog
      proveedores/      # Supplier directory
      roles/            # Role management (admin)
      usuarios/         # User management (admin)
      layout.tsx        # AppSidebar + Header shell
    (auth)/             # Unauthenticated routes
      login/
      acceso-denegado/
    api/                # Next.js API routes (Auth.js handlers)
    layout.tsx          # Root layout — fonts, providers, toaster
  auth.ts               # Auth.js configuration (providers + JWT/session callbacks)
  middleware.ts         # Route guard — auth + permission enforcement
  components/
    calculator/         # Calculator UI components
    catalogs/           # Catalog tab content
    expenses/           # Expense table + dialogs
    layout/             # AppSidebar, Header
    products/           # Product table + BOM editor + dialogs
    scenarios/          # Scenario cards + override table
    suppliers/          # Supplier table + dialogs
    supplies/           # Supply table + price dialogs
    tiendanube-config/  # Config section components
    ui/                 # Shadcn/ui primitives
  constants/            # App-wide constants (e.g., Tiendanube plan slugs)
  hooks/
    use-mobile.ts
    usePermissions.ts   # Permission flags from session
  lib/
    api.ts              # Server-side fetch helper (reads session server-side)
    api-client.ts       # Client-side fetch helper (reads session via useSession)
    formatters.ts       # Number/currency formatters
    suppliers.ts        # Supplier-specific helpers
    utils.ts            # Tailwind merge + clsx utility
  providers/
    SessionProvider.tsx
    ThemeProvider.tsx
  types/
    next-auth.d.ts      # Session type augmentation
    permissions.ts      # Permissions interface + NO_PERMISSIONS constant
    role.ts             # RoleRow, RoleOption types
    supply.ts           # SupplyOption type
```

---

## Backend connection

All API calls go to `NEXT_PUBLIC_API_URL` (the hefesto-back NestJS server).

- **Server Components** use `apiFetch()` from `src/lib/api.ts` — reads the Auth.js session server-side and attaches the `Authorization: Bearer <backendToken>` header automatically.
- **Client Components** use `apiClientFetch()` from `src/lib/api-client.ts` — the token is passed in explicitly from `useSession()`.

A 401 from the backend triggers a client-side redirect to `/login`. A 403 surfaces as a toast error.

---

## Code style

- TypeScript strict mode enforced
- No `any` — always explicit types
- Explicit return types on all functions (`@typescript-eslint/explicit-function-return-type`)
- Single quotes for strings (enforced by ESLint)
- Prettier for formatting (`prettier-plugin-tailwindcss` for class sorting)
- Husky pre-commit hook runs lint + prettier check

Run both checks before committing:

```bash
npm run lint
npm run prettier:fix
```

---

## Testing

Tests use Jest 30 with jsdom and React Testing Library.

```bash
npm run test               # run all tests
npm run test:watch         # watch mode
npm run test:coverage      # generate coverage report (src/ only, excluding .d.ts and index.ts)
```

Test files live next to the code they test in `__tests__/` subdirectories:
- `src/app/(app)/__tests__/` — page-level server component tests
- `src/app/(app)/calculadora/__tests__/` — calculator client component tests
- `src/app/(app)/usuarios/__tests__/` — user management dialog tests

The `@/` path alias resolves to `src/` in both the app and tests.

---

## Deployment

The project is configured for deployment to Vercel but is **not currently hosted** — run it locally to evaluate it (see [Local setup](#local-setup)). The build is deployment-ready:

- `console.log` calls are stripped from the production build automatically (`removeConsole` excludes `error` and `warn`)
- `reactStrictMode` is enabled
- Images are served unoptimized (no Vercel image CDN required)
- Set all variables from `.env.example` in the Vercel project's environment variable settings; use production values for `NEXT_PUBLIC_API_URL` and `AUTH_SECRET`

---

## Known trade-offs & roadmap

Deliberate decisions and their accepted trade-offs, documented rather than hidden.

### Accepted trade-offs

- **Two fetch helpers instead of one.** `lib/api.ts` (Server Components) and `lib/api-client.ts` (Client Components) exist separately because the App Router reads the Auth.js session differently in each context. The shared base-URL and header assembly could be factored into a common helper, and the server-side `apiFetch` could parse the backend error envelope instead of throwing a bare status string.
- **The permissions interface mirrors the backend by hand** (`types/permissions.ts`). This crosses a repo boundary and can drift from the backend definition; a shared package or codegen step is the real fix.
- **`CalculadoraClient` forward/inverse branches are ~90% duplicated.** Readable as-is; a shared sub-component would DRY it up.

### Roadmap

- **Session-expiry redirect.** A backend `401` currently triggers `window.location.href = '/login'` from inside the fetch wrapper — effective but heavy-handed for the App Router. Routing it through Auth.js `signOut` / middleware would be cleaner.
- **Component-level test coverage** beyond the current page and dialog tests.
