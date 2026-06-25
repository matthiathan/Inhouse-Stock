# Dallmayr SA Operations Portal

Enterprise operations workspace for stock control, warehouse receiving and dispatch, asset scanning, service routing, finance review, and operational analytics.

## Current Delivery Track

This repository is in the stabilization track. The current Vite/React app is being hardened first so it can be demonstrated and deployed quickly, while the Next.js App Router rebuild remains a later controlled migration.

## Stack

- React 19, Vite, TypeScript, Tailwind CSS 4
- TanStack Query for interactive workflows
- Supabase Auth, PostgreSQL, Storage, and Row Level Security
- Express production server for static assets and health checks

## Local Setup

1. Install Node 22.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. Run `npm run dev`.

When Supabase variables are not configured, selected workflows can use demo-safe data for presentation review. Production deployments must use real Supabase environment variables.

## Verification

```bash
npm run lint
npm run test
npm run build
```

## Render Deployment

- Build command: `npm install; npm run build`
- Start command: `npm run start`
- Node runtime: 22.x
- Health check path: `/api/health`

Required environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` only for trusted server-side tasks

Never commit Supabase service-role keys. Rotate any service-role key that has been pasted into chat or logs.
