# Enterprise Dallmayr SA Security Checklist

This document details the hardening, verification, and audit requirements for the enterprise production deployment of the Dallmayr SA Stock and Asset Management System.

## 1. Database Row-Level Security (RLS)
- [ ] **Enforce RLS Global Flag**: Ensure `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` is executed on all tables.
- [ ] **Default Deny Policy**: No public read/write access without explicit authentication policies.
- [ ] **Regional Separation**: Verify standard `user` and `tech` accounts can only access data in their region via `auth_user_region()`.
- [ ] **Admin Overrides**: Verify `admin` and `ops_manager` bypass regional filtering to maintain nationwide fleet visibility.
- [ ] **Strict FK Audits**: All tables with `user_id` should validate that the authenticated user matches the target ID.
- [ ] **Prevent RLS Traps**: Avoid recursive triggers in policy helper functions that could invite deadlock or timing attacks.

## 2. Authentication & Session Management
- [ ] **Short Session Expirations (JWT)**: Set Supabase Access Token (JWT) lifetime to 15 minutes.
- [ ] **Sliding Refresh Token Lifetimes**: Configure Refresh Tokens to 7 days, with automatic single-use rotation enabled.
- [ ] **Multi-Factor Authentication (MFA)**: Require TOTP verification for the `admin`, `ops_manager`, and `finance` roles.
- [ ] **Authorized Redirect URIs**: Strict wildcard restrictions on callback URLs (allow only `*.dallmayr.com` and secure staging environments).
- [ ] **Secure Cookie Policy**: If loading sessions via cookies, enforce `HttpOnly`, `Secure`, and `SameSite=Strict`.

## 3. Auditing & Transaction Traceability
- [ ] **Automated Postgres Audit Triggers**: Install the database trigger hook to record old and new JSON payloads to `public.audit_logs`.
- [ ] **Immutable Log Records**: Revoke all `UPDATE` and `DELETE` privileges on the `public.audit_logs` table for non-superusers.
- [ ] **User Context Injection**: Capture actual user email and connection metadata for every state change.
- [ ] **Hardware Mutation Verification**: Double check that any asset or machine relocations between inventory sections require electronic verification.

## 4. Rate Limiting & Edge Defense
- [ ] **API Gateway Integration**: Bind Nginx/Cloudflare rate-limiting to standard parameters (100 requests per 1-minute window).
- [ ] **Authentication Rate Limits**: Limit Auth sign-in / password-resets attempts to max 10 per hour per IP.
- [ ] **DDoS Mitigation**: Enable Cloudflare WAF rulesets for malicious payload filtering and bot management.

## 5. Security Scanning & Environment Protection
- [ ] **API Secrets Security**: No plain-text production keys in git; rotate production keys quarterly.
- [ ] **Dependency Audits**: Schedule `npm audit` inside weekly CI pipelines to automatically prune vulnerable dependencies.
- [ ] **Static Code Analysis (SAST)**: Employ linters to prevent SQL injection patterns and unsafe React markup.
