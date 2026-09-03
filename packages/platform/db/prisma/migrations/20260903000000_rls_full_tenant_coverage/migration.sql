-- =============================================================================
-- P1.4 — Row-Level Security on every remaining tenant-scoped table
-- =============================================================================
--
-- 20260313000000_enable_rls / 20260520000000_add_atelier_canvas /
-- 20260730000000_platform_staff_rls turned RLS on for organizations, api_keys,
-- organization_members, contents, products, orders, integrations,
-- atelier_canvas, and platform_staff (deny-all). Every other table that
-- carries a direct tenantId/organizationId column — a majority of
-- schema.prisma — has never had RLS enabled through the migration history at
-- all. This migration closes that gap for the 35 tables below (32 keyed on
-- tenant_id, one on organization_id, one — tenants — on its own id, since a
-- Tenant row IS the isolation boundary, and one — auth_sessions — RLS
-- enabled but deliberately not tenant-filtered; see its own section below).
--
-- Convention (matches 20260313/20260520, not infra/data/database/policies/
-- rls.sql — see rationale below):
--   • current_org_id() — defined by 20260313, reused verbatim — reads
--     session var `app.current_tenant_id`, '' when unset.
--   • Two PERMISSIVE policies per table: "<table>_bypass" TO postgres
--     USING (true), and "<table>_tenant" with no TO clause (applies to every
--     non-superuser, non-owner role) restricting rows to the caller's tenant.
--     Both carry an explicit WITH CHECK so INSERT/UPDATE cannot write a row
--     into a tenant the caller does not hold — Postgres would already imply
--     this from USING when WITH CHECK is omitted, but the atelier_canvas
--     migration made it explicit and this migration keeps doing that.
--   • cofounder_profiles and tenant_transfer_journals split SELECT from
--     write, matching their non-standard sharing rules (see comments below).
--   • auth_sessions carries activeOrganizationId — the literal tenantId/
--     organizationId inclusion criterion — but gets RLS enabled with an
--     allow-all policy, not a tenant-filtered one; see its own section below
--     for why.
--
-- Why not infra/data/database/policies/rls.sql's convention: that file
-- already has correct, reviewed policies for every one of these tables (plus
-- a few FK-derived ones with no direct tenant column, out of this PR's
-- literal scope), using `TO app_user` and a `public.current_tenant_id()`
-- helper. But it is applied by a psql script, never by `prisma migrate
-- deploy` — see the PR description for the two provisioning paths. Porting
-- its `TO app_user` verbatim into the migration chain would make every
-- `prisma migrate deploy` run fail with "role app_user does not exist" on
-- any database where that role was never separately provisioned (docker-
-- compose local dev and Dockerfile.db-migrate both connect as the bare
-- `postgres` role and never create app_user). The no-TO-clause tenant policy
-- used here enforces identically for app_user once P1.3's APP_DB_ROLE role
-- switch is configured — it is just not spelled by name, so it can never be
-- missing. Running infra/data/database/policies/rls.sql after this migration
-- is still safe and remains idempotent: it creates differently-named
-- policies ("<table>_rls") that are redundant with, not in conflict with,
-- the ones below.
--
-- Scope note: `member` / `invitation` (better_auth schema, Better Auth's own
-- organization plugin tables) carry organizationId but are deliberately left
-- out of both this migration and infra/rls.sql. Better Auth's adapter talks
-- to Postgres on its own connection/role, and nothing in this repo
-- establishes that it ever sets `app.current_tenant_id` before querying
-- those tables — enabling deny-by-default RLS on them without that guarantee
-- risks breaking sign-in/org-invite flows outright, which is a correctness
-- risk this single-risk-per-PR migration does not take on. Left for a
-- follow-up that first confirms the Better Auth adapter's connection role
-- and session-var behavior.

-- ── Indexes — RLS predicates without one force a seq scan ────────────────────
-- Every other newly-covered table already has tenant_id (or the FK-chain
-- equivalent) leading a @@index or backed by a @unique constraint; these four
-- did not.
CREATE INDEX IF NOT EXISTS "user_skills_tenant_id_idx" ON "user_skills" ("tenant_id");
CREATE INDEX IF NOT EXISTS "connectors_tenant_id_idx" ON "connectors" ("tenant_id");
CREATE INDEX IF NOT EXISTS "code_redemptions_tenant_id_idx" ON "code_redemptions" ("tenant_id");
-- tenant_transfer_journals already indexes from_tenant_id; the select policy
-- below also filters on to_tenant_id (the receiving side of a transfer).
CREATE INDEX IF NOT EXISTS "tenant_transfer_journals_to_tenant_id_idx" ON "tenant_transfer_journals" ("to_tenant_id");

-- ── Standard tenant_id / organization_id / id tables ──────────────────────────
ALTER TABLE "access_invite_codes" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "access_invite_codes_bypass" ON "access_invite_codes"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "access_invite_codes_tenant" ON "access_invite_codes"
  AS PERMISSIVE FOR ALL
  USING ("tenant_id" = current_org_id())
  WITH CHECK ("tenant_id" = current_org_id());

ALTER TABLE "access_invite_redemptions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "access_invite_redemptions_bypass" ON "access_invite_redemptions"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "access_invite_redemptions_tenant" ON "access_invite_redemptions"
  AS PERMISSIVE FOR ALL
  USING ("tenant_id" = current_org_id())
  WITH CHECK ("tenant_id" = current_org_id());

ALTER TABLE "agent_rollout_lines" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_rollout_lines_bypass" ON "agent_rollout_lines"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "agent_rollout_lines_tenant" ON "agent_rollout_lines"
  AS PERMISSIVE FOR ALL
  USING ("tenant_id" = current_org_id())
  WITH CHECK ("tenant_id" = current_org_id());

ALTER TABLE "ai_request_logs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_request_logs_bypass" ON "ai_request_logs"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "ai_request_logs_tenant" ON "ai_request_logs"
  AS PERMISSIVE FOR ALL
  USING ("tenant_id" = current_org_id())
  WITH CHECK ("tenant_id" = current_org_id());

ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_bypass" ON "audit_logs"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "audit_logs_tenant" ON "audit_logs"
  AS PERMISSIVE FOR ALL
  USING ("tenant_id" = current_org_id())
  WITH CHECK ("tenant_id" = current_org_id());

ALTER TABLE "automation_runs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "automation_runs_bypass" ON "automation_runs"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "automation_runs_tenant" ON "automation_runs"
  AS PERMISSIVE FOR ALL
  USING ("tenant_id" = current_org_id())
  WITH CHECK ("tenant_id" = current_org_id());

ALTER TABLE "automations" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "automations_bypass" ON "automations"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "automations_tenant" ON "automations"
  AS PERMISSIVE FOR ALL
  USING ("tenant_id" = current_org_id())
  WITH CHECK ("tenant_id" = current_org_id());

ALTER TABLE "chat_sessions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_sessions_bypass" ON "chat_sessions"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "chat_sessions_tenant" ON "chat_sessions"
  AS PERMISSIVE FOR ALL
  USING ("tenant_id" = current_org_id())
  WITH CHECK ("tenant_id" = current_org_id());

ALTER TABLE "code_redemptions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "code_redemptions_bypass" ON "code_redemptions"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "code_redemptions_tenant" ON "code_redemptions"
  AS PERMISSIVE FOR ALL
  USING ("tenant_id" = current_org_id())
  WITH CHECK ("tenant_id" = current_org_id());

ALTER TABLE "connectors" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "connectors_bypass" ON "connectors"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "connectors_tenant" ON "connectors"
  AS PERMISSIVE FOR ALL
  USING ("tenant_id" = current_org_id())
  WITH CHECK ("tenant_id" = current_org_id());

ALTER TABLE "credit_balances" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_balances_bypass" ON "credit_balances"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "credit_balances_tenant" ON "credit_balances"
  AS PERMISSIVE FOR ALL
  USING ("tenant_id" = current_org_id())
  WITH CHECK ("tenant_id" = current_org_id());

ALTER TABLE "customer_feature_overrides" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_feature_overrides_bypass" ON "customer_feature_overrides"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "customer_feature_overrides_tenant" ON "customer_feature_overrides"
  AS PERMISSIVE FOR ALL
  USING ("tenant_id" = current_org_id())
  WITH CHECK ("tenant_id" = current_org_id());

ALTER TABLE "customer_plan_versions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_plan_versions_bypass" ON "customer_plan_versions"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "customer_plan_versions_tenant" ON "customer_plan_versions"
  AS PERMISSIVE FOR ALL
  USING ("tenant_id" = current_org_id())
  WITH CHECK ("tenant_id" = current_org_id());

ALTER TABLE "customer_usage_limits" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_usage_limits_bypass" ON "customer_usage_limits"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "customer_usage_limits_tenant" ON "customer_usage_limits"
  AS PERMISSIVE FOR ALL
  USING ("tenant_id" = current_org_id())
  WITH CHECK ("tenant_id" = current_org_id());

ALTER TABLE "feedback_reports" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback_reports_bypass" ON "feedback_reports"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "feedback_reports_tenant" ON "feedback_reports"
  AS PERMISSIVE FOR ALL
  USING ("tenant_id" = current_org_id())
  WITH CHECK ("tenant_id" = current_org_id());

ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_bypass" ON "invoices"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "invoices_tenant" ON "invoices"
  AS PERMISSIVE FOR ALL
  USING ("tenant_id" = current_org_id())
  WITH CHECK ("tenant_id" = current_org_id());

ALTER TABLE "notification_preferences" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_preferences_bypass" ON "notification_preferences"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "notification_preferences_tenant" ON "notification_preferences"
  AS PERMISSIVE FOR ALL
  USING ("tenant_id" = current_org_id())
  WITH CHECK ("tenant_id" = current_org_id());

ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_bypass" ON "notifications"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "notifications_tenant" ON "notifications"
  AS PERMISSIVE FOR ALL
  USING ("tenant_id" = current_org_id())
  WITH CHECK ("tenant_id" = current_org_id());

ALTER TABLE "oauth_clients" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "oauth_clients_bypass" ON "oauth_clients"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "oauth_clients_tenant" ON "oauth_clients"
  AS PERMISSIVE FOR ALL
  USING ("tenant_id" = current_org_id())
  WITH CHECK ("tenant_id" = current_org_id());

ALTER TABLE "payment_methods" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_methods_bypass" ON "payment_methods"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "payment_methods_tenant" ON "payment_methods"
  AS PERMISSIVE FOR ALL
  USING ("tenant_id" = current_org_id())
  WITH CHECK ("tenant_id" = current_org_id());

ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_bypass" ON "payments"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "payments_tenant" ON "payments"
  AS PERMISSIVE FOR ALL
  USING ("tenant_id" = current_org_id())
  WITH CHECK ("tenant_id" = current_org_id());

ALTER TABLE "stripe_customers" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stripe_customers_bypass" ON "stripe_customers"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "stripe_customers_tenant" ON "stripe_customers"
  AS PERMISSIVE FOR ALL
  USING ("tenant_id" = current_org_id())
  WITH CHECK ("tenant_id" = current_org_id());

ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_bypass" ON "subscriptions"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "subscriptions_tenant" ON "subscriptions"
  AS PERMISSIVE FOR ALL
  USING ("tenant_id" = current_org_id())
  WITH CHECK ("tenant_id" = current_org_id());

ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_bypass" ON "tasks"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "tasks_tenant" ON "tasks"
  AS PERMISSIVE FOR ALL
  USING ("tenant_id" = current_org_id())
  WITH CHECK ("tenant_id" = current_org_id());

ALTER TABLE "tenant_provider_keys" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_provider_keys_bypass" ON "tenant_provider_keys"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "tenant_provider_keys_tenant" ON "tenant_provider_keys"
  AS PERMISSIVE FOR ALL
  USING ("tenant_id" = current_org_id())
  WITH CHECK ("tenant_id" = current_org_id());

ALTER TABLE "threads" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "threads_bypass" ON "threads"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "threads_tenant" ON "threads"
  AS PERMISSIVE FOR ALL
  USING ("tenant_id" = current_org_id())
  WITH CHECK ("tenant_id" = current_org_id());

ALTER TABLE "uploads" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uploads_bypass" ON "uploads"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "uploads_tenant" ON "uploads"
  AS PERMISSIVE FOR ALL
  USING ("tenant_id" = current_org_id())
  WITH CHECK ("tenant_id" = current_org_id());

ALTER TABLE "usage_ledger_entries" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_ledger_entries_bypass" ON "usage_ledger_entries"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "usage_ledger_entries_tenant" ON "usage_ledger_entries"
  AS PERMISSIVE FOR ALL
  USING ("tenant_id" = current_org_id())
  WITH CHECK ("tenant_id" = current_org_id());

ALTER TABLE "user_consents" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_consents_bypass" ON "user_consents"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "user_consents_tenant" ON "user_consents"
  AS PERMISSIVE FOR ALL
  USING ("tenant_id" = current_org_id())
  WITH CHECK ("tenant_id" = current_org_id());

ALTER TABLE "user_skills" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_skills_bypass" ON "user_skills"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "user_skills_tenant" ON "user_skills"
  AS PERMISSIVE FOR ALL
  USING ("tenant_id" = current_org_id())
  WITH CHECK ("tenant_id" = current_org_id());

ALTER TABLE "workflow_definitions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workflow_definitions_bypass" ON "workflow_definitions"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "workflow_definitions_tenant" ON "workflow_definitions"
  AS PERMISSIVE FOR ALL
  USING ("tenant_id" = current_org_id())
  WITH CHECK ("tenant_id" = current_org_id());

ALTER TABLE "workflow_runs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workflow_runs_bypass" ON "workflow_runs"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "workflow_runs_tenant" ON "workflow_runs"
  AS PERMISSIVE FOR ALL
  USING ("tenant_id" = current_org_id())
  WITH CHECK ("tenant_id" = current_org_id());

ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenants_bypass" ON "tenants"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "tenants_tenant" ON "tenants"
  AS PERMISSIVE FOR ALL
  USING ("id" = current_org_id())
  WITH CHECK ("id" = current_org_id());

ALTER TABLE "organization_invitations" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organization_invitations_bypass" ON "organization_invitations"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "organization_invitations_tenant" ON "organization_invitations"
  AS PERMISSIVE FOR ALL
  USING ("organization_id" = current_org_id())
  WITH CHECK ("organization_id" = current_org_id());

-- ── Auth bootstrap table — RLS enabled, deliberately NOT tenant-filtered ──────
--
-- auth_sessions carries activeOrganizationId (Better Auth's organization
-- plugin populates it when the user calls setActiveOrganization(); the
-- tenant bridge middleware reads it off the row to call runWithTenant()).
-- That column matches this migration's own inclusion criterion, but a
-- tenant-restrictive USING clause here would be actively wrong: the whole
-- point of this table is to let the app find the caller's session and, from
-- it, learn which tenant to switch into — before app.current_tenant_id has
-- any value to filter by. Gating it on current_org_id() would make session
-- bootstrap (and therefore every login) query zero rows.
--
-- This mirrors infra/data/database/policies/rls.sql's own "auth_sessions_rls"
-- policy, which is also USING (true) for the same reason. RLS is still
-- enabled (not skipped) for defense-in-depth: a role with no policy that
-- applies to it sees nothing at all, so this stays an explicit, reviewed
-- allow-all rather than a silent gap in coverage. Same connection/role
-- caveat as everywhere else in this migration — enforcement (such as it is
-- here, i.e. none beyond "RLS is on") only starts once APP_DB_ROLE points a
-- non-bypass role at the app's transactions (P1.3).
ALTER TABLE "auth_sessions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_sessions_bypass" ON "auth_sessions"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "auth_sessions_allow_all" ON "auth_sessions"
  AS PERMISSIVE FOR ALL
  USING (true)
  WITH CHECK (true);

-- ── Non-standard tables — split SELECT from write ─────────────────────────────

-- cofounder_profiles: the pool is intentionally discoverable — SELECT exposes
-- every ACTIVE profile to every tenant regardless of ownership; writes stay
-- restricted to the owning tenant's own row. The FOR ALL write policy also
-- grants SELECT on the owner's own (possibly inactive) row — permissive
-- policies OR together, so the net effect is "active OR mine", matching
-- infra/data/database/policies/rls.sql's cofounder_profiles_select/_write.
ALTER TABLE "cofounder_profiles" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cofounder_profiles_bypass" ON "cofounder_profiles"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "cofounder_profiles_select" ON "cofounder_profiles"
  AS PERMISSIVE FOR SELECT
  USING ("is_active" = true OR "tenant_id" = current_org_id());

CREATE POLICY "cofounder_profiles_write" ON "cofounder_profiles"
  AS PERMISSIVE FOR ALL
  USING ("tenant_id" = current_org_id())
  WITH CHECK ("tenant_id" = current_org_id());

-- tenant_transfer_journals: a tenant reads rows it sent or received; it
-- writes rows only from itself (form-team / personal-to-workspace transfer).
-- The async provisioning worker that fills toTenantId/applies the transfer
-- runs as a BYPASSRLS service role, so it is unaffected by the write policy
-- being scoped to the sender.
ALTER TABLE "tenant_transfer_journals" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_transfer_journals_bypass" ON "tenant_transfer_journals"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "tenant_transfer_journals_select" ON "tenant_transfer_journals"
  AS PERMISSIVE FOR SELECT
  USING ("from_tenant_id" = current_org_id() OR "to_tenant_id" = current_org_id());

CREATE POLICY "tenant_transfer_journals_write" ON "tenant_transfer_journals"
  AS PERMISSIVE FOR ALL
  USING ("from_tenant_id" = current_org_id())
  WITH CHECK ("from_tenant_id" = current_org_id());
