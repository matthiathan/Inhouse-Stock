# Enterprise Dallmayr SA Deployment Checklist

This guide documents the procedures for high-availability release management on Cloud Run and Supabase.

## 1. Environment & Config Management
- [ ] **Double-check Secrets**: Verify that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are securely loaded from Secret Manager (not committed to codebase).
- [ ] **Container Ports Configuration**: Confirm that container configuration redirects all external traffic exclusively to port `3000`.
- [ ] **Node Production Env**: Ensure `NODE_ENV` is set to `production` inside target runtimes.

## 2. Compilation & Verification
- [ ] **TypeScript Stripping**: Run `npm run build` to compile client assets to static assets in `dist/` and bundle server-side entry points to `dist/server.cjs` via `esbuild`.
- [ ] **Linter Safety Block**: Execute `npm run lint` within CI to prevent unhandled React errors from breaking active user sessions.
- [ ] **Sourcemaps**: Verify sourcemap output directories are generated to route errors correctly to tracking agents.

## 3. Database Migration Procedures
- [ ] **Pre-Deployment Backup**: Run full pg_dump backup prior to executing any DDL statements on the database schema.
- [ ] **Non-Breaking Migrations (Schema-First)**: Apply additive additions only (e.g. `CREATE TABLE IF NOT EXISTS`). Never drop columns or rename active structures.
- [ ] **Verify Seed Status**: Ensure lookup data (sections, fleet models) are pre-populated into dictionaries so client inputs do not error.

## 4. Health, Load Balancing & Zero-Downtime
- [ ] **Readiness Probe**: Map health-check endpoint `/api/health` as green.
- [ ] **Liveness Probe**: Confirm fallback ping response within healthy system thresholds (under 250ms latency).
- [ ] **Graceful Shutdown**: Configure Node process execution to catch `SIGTERM` signals and finish active database queries within a 30-second window.
