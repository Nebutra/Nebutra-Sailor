-- =============================================================================
-- Enable Row-Level Security (RLS) for multi-tenant data isolation
--
-- Strategy:
--   • Application code sets `app.current_org_id` at the start of each request
--     via a Prisma middleware / connection-level SET.
--   • Each tenant-scoped table has a USING policy that compares
--     organization_id to the session variable.
--   • A superuser/service-role BYPASS policy lets migrations and admin tools
--     access all rows without setting the variable.
--
-- Usage in Prisma middleware (packages/db/src/middleware/rls.ts):
--   await prisma.$executeRaw`
--     SELECT set_config('app.current_org_id', ${orgId}, true)
--   `;
-- =============================================================================

-- ── Helper function — safe getter with empty-string fallback ─────────────────
-- Returns the current org ID session variable, or '' if not set (no match).
CREATE OR REPLACE FUNCTION current_org_id() RETURNS text
  LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(current_setting('app.current_org_id', true), '')
$$;

-- =============================================================================
-- organizations
-- =============================================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Superusers / service role bypass (for migrations, admin scripts, seeds)
CREATE POLICY organizations_bypass ON organizations
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true);

-- Tenant read — org can see itself
CREATE POLICY organizations_tenant_read ON organizations
  AS PERMISSIVE FOR SELECT
  USING (id = current_org_id());

-- Tenant write — org can only update itself
CREATE POLICY organizations_tenant_write ON organizations
  AS PERMISSIVE FOR UPDATE
  USING (id = current_org_id());

-- =============================================================================
-- api_keys
-- =============================================================================
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY api_keys_bypass ON api_keys
  AS PERMISSIVE FOR ALL TO postgres USING (true);

CREATE POLICY api_keys_tenant ON api_keys
  AS PERMISSIVE FOR ALL
  USING (organization_id = current_org_id());

-- =============================================================================
-- organization_members
-- =============================================================================
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY organization_members_bypass ON organization_members
  AS PERMISSIVE FOR ALL TO postgres USING (true);

CREATE POLICY organization_members_tenant ON organization_members
  AS PERMISSIVE FOR ALL
  USING (organization_id = current_org_id());

-- =============================================================================
-- contents
-- =============================================================================
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;

CREATE POLICY contents_bypass ON contents
  AS PERMISSIVE FOR ALL TO postgres USING (true);

CREATE POLICY contents_tenant ON contents
  AS PERMISSIVE FOR ALL
  USING (organization_id = current_org_id());

-- =============================================================================
-- products
-- =============================================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY products_bypass ON products
  AS PERMISSIVE FOR ALL TO postgres USING (true);

CREATE POLICY products_tenant ON products
  AS PERMISSIVE FOR ALL
  USING (organization_id = current_org_id());

-- =============================================================================
-- orders
-- =============================================================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY orders_bypass ON orders
  AS PERMISSIVE FOR ALL TO postgres USING (true);

CREATE POLICY orders_tenant ON orders
  AS PERMISSIVE FOR ALL
  USING (organization_id = current_org_id());

-- =============================================================================
-- integrations
-- =============================================================================
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY integrations_bypass ON integrations
  AS PERMISSIVE FOR ALL TO postgres USING (true);

CREATE POLICY integrations_tenant ON integrations
  AS PERMISSIVE FOR ALL
  USING (organization_id = current_org_id());

-- =============================================================================
-- wallets
-- =============================================================================
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY wallets_bypass ON wallets
  AS PERMISSIVE FOR ALL TO postgres USING (true);

CREATE POLICY wallets_tenant ON wallets
  AS PERMISSIVE FOR ALL
  USING (organization_id = current_org_id());

-- =============================================================================
-- nfts
-- =============================================================================
ALTER TABLE nfts ENABLE ROW LEVEL SECURITY;

CREATE POLICY nfts_bypass ON nfts
  AS PERMISSIVE FOR ALL TO postgres USING (true);

CREATE POLICY nfts_tenant ON nfts
  AS PERMISSIVE FOR ALL
  USING (organization_id = current_org_id());

-- =============================================================================
-- tenant_usage
-- =============================================================================
ALTER TABLE tenant_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_usage_bypass ON tenant_usage
  AS PERMISSIVE FOR ALL TO postgres USING (true);

CREATE POLICY tenant_usage_tenant ON tenant_usage
  AS PERMISSIVE FOR ALL
  USING (organization_id = current_org_id());

-- =============================================================================
-- users — not tenant-scoped (global identity), no RLS
-- content_translations — scoped via contents FK, no direct org column
-- content_embeddings   — scoped via contents FK, no direct org column
-- user_activities      — scoped via user FK, no direct org column
-- =============================================================================
