# INHOUSE STOCK: Operational Rebuild Implementation Plan

This implementation plan details our multi-stage, systematic process to turn the Dallmayr SA Operations Portal into a production-grade, enterprise-ready portal. The scope is designed around safe, non-destructive increments.

## Milestone 1: Compilation & Type Safety Hardening
**Objective**: Resolve all existing TypeScript type errors and tsc check failures to achieve zero compile-time warnings and establish strict, clean typing.
- **Task 1.1**: Audit and harmonize the `ServiceCallLog` domain model types in `src/types.ts` with Supabase schemas, rectifying differences in fields like `status`, `doc_no`, `do_number`, `priority`.
- **Task 1.2**: Align `SCLDispatchForm.tsx` and `RoutePlannerPage.tsx` with corrected `ServiceCallLog` definitions.
- **Task 1.3**: Resolve machine lookup references in `SCLTechClosurePage.tsx` where `customer_code` was referenced instead of `customer_id`.
- **Task 1.4**: Clean up hardcoded payment gateway enums and types in `src/services/api/wallet/paymentGateways.ts`.
- **Task 1.5**: Harmonize offline sync models in `src/utils/offlineSync.ts` to ensure full compliance with database ticket fields.

## Milestone 2: Authentication, Safe Configuration & RBAC Core
**Objective**: Guarantee that security is handled on the server, configure fail-safe environment checking, and establish role-aware interfaces.
- **Task 2.1**: Implement a global check for `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` that blocks loading of operational components and alerts administrators gracefully inside a stylish error boundary overlay.
- **Task 2.2**: Maintain unified cookies/session-based context for role retrieval without exposing sensitive variables like service role keys to the browser.
- **Task 2.3**: Map the nine system roles (`admin`, `ops_manager`, `warehouse`, `warehouse_staff`, `driver`, `tech`, `road_tech`, `finance`, `user`) and implement explicit client-side navigation restrictions.

## Milestone 3: Asset Scanning, QR Lookup & Movement History
**Objective**: Harden the mobile-first QR scanner to gracefully parse multi-format machine tags and log section transitions with append-only audit entries.
- **Task 3.1**: Normalize scanned QR parameters (trim, decode URL encodings, extract asset ID).
- **Task 3.2**: Enable a searchable section movement command drawer for changing `machines.section_id` with transaction safeguards.
- **Task 3.3**: Write detailed audits for physical relocations to `asset_section_history`.

## Milestone 4: Warehouse Stock Transactions & Packing Fulfillment
**Objective**: Prevent negative inventory and lock concurrent stock deductions using safe PostgreSQL RPCs and double-scan deduplication.
- **Task 4.1**: Interface the stock adjustment form with the database-level `record_warehouse_transaction` RPC.
- **Task 4.2**: Design an interactive packing fulfiller page for `orders` and `order_items` that validates scanned items against requirements.
- **Task 4.3**: Integrate duplicate scan prevention and optimistic UI overrides with automatic rollback.

## Milestone 5: Field Maintenance, Service Calls & Geolocation
**Objective**: Streamline the technician mobile workflow with step-by-step progress controls and robust photo evidence capture.
- **Task 5.1**: Map out the ticket progression lifecycle (`Open` -> `Assigned` -> `Travelling` -> `On Site` -> `Completed` -> `Closed`).
- **Task 5.2**: Build offline task drafts caching logs, narration, and resolution details inside standard client-side state.
- **Task 5.3**: Construct signature and camera intake blocks using HTML5 file attachments.

## Milestone 6: Fleet Dispatch, Stop Execution & Live Operations Map
**Objective**: Model vehicles, routes, stop schedules, and foreground driver tracking with full privacy protections.
- **Task 6.1**: Implement the driver shift controller triggering explicit location gathering only during active routes.
- **Task 6.2**: Design the dispatch control center showing stops on an interactive MapLibre/Leaflet display.
- **Task 6.3**: Build the Live Operations Map filtering active drivers, stale signals, and progress percentages.

---

## Progress Track & Definition of Done (DoD)
Each milestone will trigger:
1. File formatting (`prettier --write`).
2. Type check verification (`npm run lint`).
3. Application compilation (`npm run build`).
