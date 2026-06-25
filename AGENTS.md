# Agent Guide

## Product Goal

Make the existing operations portal reliable enough for an ASAP company demonstration while keeping the path open for a later Next.js App Router migration.

## Non-Negotiables

- Do not commit secrets.
- Do not write real Supabase keys into tracked files.
- Treat pasted service-role keys as compromised.
- Use migration files for database changes.
- Do not delete production data, regional tables, import tables, or legacy source tables.
- Run `npm run lint`, `npm run test`, and `npm run build` before publishing.

## Architecture Preferences

- Prefer existing React/Vite patterns during the stabilization phase.
- Keep Supabase writes in repository/API modules rather than UI components.
- Centralize permission changes in `src/lib/permissions.ts`.
- Centralize scanner normalization in `src/utils/qr.ts`.
- Add focused tests near the module being protected.

## Git

Use branch prefix `codex/` for agent-authored branches. Stage only intentional app files and leave local archives or environment files untracked.
