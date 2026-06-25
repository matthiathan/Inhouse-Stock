# Dallmayr SA Operations Portal Architecture

## Delivery Posture

The product is on a stabilize-first track. The current Vite, React, TypeScript, Supabase application is the company-ready baseline. A Next.js App Router migration is a later milestone after the operational workflows, Supabase security model, and database contract are stable.

## Runtime

- React 19 and Vite provide the single-page application.
- The production server is Express. It serves the built app, exposes `/api/health`, and returns only public client configuration through `/api/config`.
- Node is pinned to version 22 through `package.json` and `.node-version` so Render does not drift to a moving default runtime.
- Supabase Auth, PostgreSQL, Storage, and Row Level Security are the backend platform.

## Frontend Boundaries

- `src/pages` owns route-level screens and workflow composition.
- `src/features` owns richer operational modules such as warehouse inventory.
- `src/services/api` and `src/api` isolate Supabase reads and writes from UI components.
- `src/lib/permissions.ts` centralizes role normalization and permission checks.
- `src/utils/qr.ts` centralizes QR and scanner payload normalization.

## Database Boundaries

All production schema and security changes must be represented as migration files under `supabase/migrations`. Direct production SQL is not the delivery mechanism.

The current live Supabase project still includes legacy tables, quoted import columns, and security advisor findings. The migration `20260624_enterprise_stabilization.sql` is intentionally non-destructive: it adds audit and transaction tables, reviewed policies, safer RPCs, indexes, and a normalized machine details view without deleting regional/import source data.

## Security Model

The browser uses only the Supabase anon key. Service-role credentials are server-only and must be configured through Render or Supabase secrets, never committed.

All high-risk stock and fulfillment mutations should go through reviewed RPCs:

- `record_warehouse_transaction`
- `fulfill_order_item`
- `complete_order_transaction`
- `change_machine_section`

These functions are designed for authenticated execution, fixed `search_path`, role checks, row locking, and audit logging.

## Presentation Quality

The current UI keeps a restrained Dallmayr operations design: dense, legible, and built for repeat warehouse and service tasks. Demo-safe inventory data is available only when Supabase is unconfigured so the product can be shown without exposing production data.
