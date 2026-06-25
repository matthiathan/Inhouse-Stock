# Database Migration Plan

## Rules

- Use migration files first.
- Do not run ad hoc production SQL.
- Do not commit secrets.
- Do not delete regional source tables, import tables, or operational data.
- Validate against a dev or staging target before production.

## Current Risk

The live Supabase schema does not fully match the local schema assumptions. Important live facts include a legacy `fam` import table, an empty `machines` table, `stock.id` as a bigint, and serious RLS/security advisor findings.

## Migration File

`supabase/migrations/20260624_enterprise_stabilization.sql` adds:

- `audit_logs`
- `asset_section_history`
- `warehouse_transactions`
- `order_fulfillment_scans`
- reviewed RLS policies for high-risk tables
- role helper functions in `app_private`
- fixed-search-path RPCs for warehouse transactions, fulfillment, order completion, and section changes
- a `security_invoker` normalized machine details view
- missing indexes for joins and workflow lookups

## Validation Sequence

1. Create or select a Supabase dev/staging project.
2. Restore representative schema/data if available.
3. Apply the migration there first.
4. Run Supabase security and performance advisors.
5. Test authenticated roles: admin, ops_manager, warehouse, warehouse_staff, driver, tech, road_tech, finance, user.
6. Test stock receive/dispatch and fulfillment concurrency.
7. Back up production.
8. Apply to production during a controlled window.
9. Run advisors again and capture results.

## Production Cutover

Rotate the service-role key before rollout. Configure Render with only the new key and never expose it to the browser.
