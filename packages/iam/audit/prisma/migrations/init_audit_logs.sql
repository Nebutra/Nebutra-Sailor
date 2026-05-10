-- =============================================================================
-- Audit log table — APPEND-ONLY canonical schema (SOC 2 alignment)
-- =============================================================================
-- This file is a *draft* — the live `audit_logs` table is owned by
-- `packages/db/prisma/schema.prisma` (model AuditLog) and applied via the
-- @nebutra/db migration history. Use this file as the reference for the
-- immutability invariants the schema must satisfy.
--
-- DO NOT run this directly — apply via `prisma migrate dev` from @nebutra/db.
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id        TEXT NOT NULL,
  actor_type      TEXT NOT NULL,
  actor_email     TEXT,
  tenant_id       TEXT NOT NULL,
  action          TEXT NOT NULL,
  resource_type   TEXT NOT NULL,
  resource_id     TEXT NOT NULL,
  resource_name   TEXT,
  outcome         TEXT NOT NULL,
  severity        TEXT NOT NULL DEFAULT 'info',
  ip              INET,
  user_agent      TEXT,
  request_id      TEXT,
  session_id      TEXT,
  changes_before  JSONB,
  changes_after   JSONB,
  metadata        JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_ts ON audit_logs (tenant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor    ON audit_logs (actor_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action   ON audit_logs (action, timestamp DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Append-only invariant
-- ─────────────────────────────────────────────────────────────────────────────
-- The application role must NEVER UPDATE or DELETE audit rows. Retention and
-- pruning are the responsibility of a separate scheduled job that runs as a
-- privileged role (audit_retention_role) — see docs/runbooks/audit-retention.md.
--
-- Replace `app_role` with the role name your deployment uses for the runtime
-- application (e.g. `nebutra_app`, `app_runtime`).
-- ─────────────────────────────────────────────────────────────────────────────

REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC;
-- REVOKE UPDATE, DELETE ON audit_logs FROM app_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Row-level security policy stub
-- ─────────────────────────────────────────────────────────────────────────────
-- The @nebutra/tenant package owns the canonical RLS policies. The audit table
-- should enforce SELECT scoping by `current_setting('app.tenant_id', true)`
-- and INSERT scoping that requires tenant_id to match the same setting.
-- Refer to packages/tenant/sql/rls_policies.sql for the canonical helpers.
-- ─────────────────────────────────────────────────────────────────────────────

-- ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY audit_logs_tenant_isolation ON audit_logs
--   USING  (tenant_id = current_setting('app.tenant_id', true))
--   WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
