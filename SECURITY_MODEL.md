# Security Model

## Credential Handling

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are public client configuration.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must be set in trusted deployment settings.
- Any service-role key pasted into chat, tickets, logs, or screenshots is compromised and must be rotated.
- `.env.example` contains placeholders only.

## Roles

Application roles are centralized in `src/lib/permissions.ts`:

- `admin`
- `ops_manager`
- `warehouse`
- `warehouse_staff`
- `driver`
- `tech`
- `road_tech`
- `finance`
- `user`

Unknown role values normalize to `user`.

## Database Access

The migration moves high-risk table access to `TO authenticated` policies with role checks. The anon role should not have direct table access to operational data.

RPC functions use:

- `security definer` only where needed for controlled transactional behavior
- fixed `search_path`
- explicit role checks
- row locking for stock and order operations
- audit rows for sensitive mutations

## Browser Guarantees

The frontend must not claim reliable background GPS tracking. Driver and technician foundations should support route ownership and explicit workflow updates before any background-location promise is made.

## Outstanding Production Actions

- Rotate the exposed service-role key.
- Apply the migration to staging first.
- Re-run Supabase advisors after each database milestone.
- Review all legacy security-definer views and functions before exposing them to users.
