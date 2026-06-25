# Enterprise Implementation Plan

## Milestone 1: Stabilization Baseline

Status: in progress in this branch.

- Keep the Vite/React app operational for an ASAP company demonstration.
- Pin Node 22 for Render and local runtime consistency.
- Remove unused AI dependencies and app metadata.
- Harden server config responses and add health checks.
- Add centralized role and permission logic for `warehouse_staff` and `driver`.
- Normalize QR scanner payloads before asset or stock lookup.
- Route stock dispatch, fulfillment, order completion, and section changes through migration-backed RPCs.
- Add demo-safe warehouse inventory data for unconfigured local review.

## Milestone 2: Supabase Security Remediation

Status: migration drafted, not applied.

- Validate `supabase/migrations/20260624_enterprise_stabilization.sql` against a dev or staging Supabase project.
- Run Supabase security and performance advisors after the migration.
- Fix any migration-specific advisor findings before production rollout.
- Rotate the exposed service-role key before production.

## Milestone 3: Workflow Completeness

Status: next.

- Add broader Playwright smoke coverage for login, role routing, warehouse receive/dispatch, scanner found/unknown flows, asset section change, fulfillment, and unauthorized access.
- Add Supabase generated database types after the live/staging schema has been stabilized.
- Tighten repository types around `stock`, `orders`, `order_items`, `machines`, and `fam`.

## Milestone 4: Next.js Migration

Status: deferred.

- Migrate after the database contract and operational workflows are proven.
- Preserve the current business logic modules and tests during the migration.
- Move server-only Supabase operations to server actions or route handlers.
- Rework auth/session handling with the official Supabase SSR package.
