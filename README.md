# Dallmayr Coffee South Africa Enterprise Operations System

A Supabase-backed enterprise web application for Dallmayr Coffee South Africa operations. The system centralises stock control, asset lifecycle management, warehouse receiving and dispatch, order fulfilment, technician route execution, service ticket handling, analytics, and user access control.

## Core modules

- **Warehouse operations**: live stock visibility, receiving, dispatching, inventory history, and warehouse dashboards.
- **Asset management**: coffee machine onboarding, QR/barcode scanning, customer assignment, section tracking, and asset profiles.
- **Orders and fulfilment**: order management, fulfilment workflows, dispatch preparation, and proof-of-action flows.
- **Field service**: technician routes, service tasks, ticket views, and mobile-friendly scanner workflows.
- **Management reporting**: analytics, finance dashboards, routing hubs, and operational health checks.
- **Enterprise access**: Supabase authentication with role-aware navigation for admin, operations, warehouse, finance, and technician teams.

## Supabase configuration

The application is configured to use the Dallmayr Coffee South Africa Supabase project by default:

```txt
VITE_SUPABASE_URL=https://xwdltghqqaobsgefrczy.supabase.co
VITE_SUPABASE_ANON_KEY=<public anon key>
SUPABASE_SERVICE_ROLE_KEY=<server-only service role key>
```

For deployments, keep environment-specific values in `.env.local`, hosting environment variables, or your platform secret manager. The anon key is safe for browser use when Row Level Security policies are correctly configured in Supabase. The service role key is supported for trusted server-side Supabase administration only and must never be exposed through client-side code or any `VITE_` variable.

## Run locally

**Prerequisites:** Node.js 20+

```bash
npm install
npm run dev
```

Open the local URL printed by the server. The Express/Vite server exposes `/api/config` so the client and server use the same Supabase project configuration.

## Quality checks

```bash
npm run lint
npm run build
```

## Deployment notes

- Configure Supabase RLS policies before exposing production data.
- Use `SUPABASE_SERVICE_ROLE_KEY` only on trusted server infrastructure if administrative operations are needed.
- Keep service role keys in `.env.local` or deployment secrets; `.env*` files are gitignored except `.env.example`.
- Never place service role keys in client-side `VITE_` variables or return them from `/api/config`.
