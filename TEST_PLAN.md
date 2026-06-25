# Test Plan

## Always Run

```bash
npm run lint
npm run test
npm run build
```

## Current Automated Coverage

- Permission normalization and role scopes.
- QR scanner payload normalization.

## Required Next Coverage

- Stock transaction validation, including insufficient stock.
- Fulfillment over-scan prevention and idempotency.
- Route guards and unauthorized access states.
- Asset section change with audit trail.
- Login and role routing.
- Scanner found and unknown flows.
- Warehouse receive and dispatch smoke tests.

## Database Validation

Run migration tests against a Supabase dev/staging target before production. Re-run Supabase security and performance advisors after each database milestone.

## Manual Demo Checks

- App loads without Supabase variables and shows demo-safe warehouse data.
- App loads with Supabase variables and does not expose service-role credentials.
- `/api/health` reports app health and public Supabase configuration status.
- Receive and dispatch forms show loading, empty, error, and permission-safe states.
