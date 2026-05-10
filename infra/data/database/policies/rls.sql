-- ============================================
-- Row Level Security (RLS) Policies
-- Multi-tenant isolation by organization_id
-- ============================================

-- Enable RLS on all tenant-scoped tables
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_usage ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Helper function: Get current tenant from JWT
-- ============================================
CREATE OR REPLACE FUNCTION auth.tenant_id()
RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('app.current_tenant_id', true),
    (current_setting('request.jwt.claims', true)::json->>'org_id')
  );
$$ LANGUAGE SQL STABLE;

-- ============================================
-- Contents
-- ============================================
CREATE POLICY "tenant_isolation" ON contents
  FOR ALL
  USING (organization_id = auth.tenant_id())
  WITH CHECK (organization_id = auth.tenant_id());

-- ============================================
-- Content Translations
-- ============================================
CREATE POLICY "tenant_isolation" ON content_translations
  FOR ALL
  USING (
    content_id IN (SELECT id FROM contents WHERE organization_id = auth.tenant_id())
  );

-- ============================================
-- Content Embeddings
-- ============================================
CREATE POLICY "tenant_isolation" ON content_embeddings
  FOR ALL
  USING (
    content_id IN (SELECT id FROM contents WHERE organization_id = auth.tenant_id())
  );

-- ============================================
-- Products
-- ============================================
CREATE POLICY "tenant_isolation" ON products
  FOR ALL
  USING (organization_id = auth.tenant_id())
  WITH CHECK (organization_id = auth.tenant_id());

-- ============================================
-- Orders
-- ============================================
CREATE POLICY "tenant_isolation" ON orders
  FOR ALL
  USING (organization_id = auth.tenant_id())
  WITH CHECK (organization_id = auth.tenant_id());

-- ============================================
-- Order Items
-- ============================================
CREATE POLICY "tenant_isolation" ON order_items
  FOR ALL
  USING (
    order_id IN (SELECT id FROM orders WHERE organization_id = auth.tenant_id())
  );

-- ============================================
-- Integrations
-- ============================================
CREATE POLICY "tenant_isolation" ON integrations
  FOR ALL
  USING (organization_id = auth.tenant_id())
  WITH CHECK (organization_id = auth.tenant_id());

-- ============================================
-- Wallets
-- ============================================
CREATE POLICY "tenant_isolation" ON wallets
  FOR ALL
  USING (organization_id = auth.tenant_id())
  WITH CHECK (organization_id = auth.tenant_id());

-- ============================================
-- NFTs
-- ============================================
CREATE POLICY "tenant_isolation" ON nfts
  FOR ALL
  USING (organization_id = auth.tenant_id())
  WITH CHECK (organization_id = auth.tenant_id());

-- ============================================
-- Tenant Usage
-- ============================================
CREATE POLICY "tenant_isolation" ON tenant_usage
  FOR ALL
  USING (organization_id = auth.tenant_id())
  WITH CHECK (organization_id = auth.tenant_id());

-- ============================================
-- AI Requests
-- ============================================
ALTER TABLE ai_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON ai_requests
  FOR ALL
  USING (organization_id = auth.tenant_id())
  WITH CHECK (organization_id = auth.tenant_id());

-- ============================================
-- User Preferences (RecSys)
-- ============================================
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON user_preferences
  FOR ALL
  USING (organization_id = auth.tenant_id())
  WITH CHECK (organization_id = auth.tenant_id());

-- ============================================
-- Recommendations (RecSys)
-- ============================================
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON recommendations
  FOR ALL
  USING (organization_id = auth.tenant_id())
  WITH CHECK (organization_id = auth.tenant_id());

-- ============================================
-- Feature Flags (Global - no tenant isolation)
-- ============================================
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Feature flags are global, readable by all authenticated users
CREATE POLICY "read_all" ON feature_flags
  FOR SELECT
  USING (true);

-- Only admins can modify (enforced at app level)
CREATE POLICY "admin_write" ON feature_flags
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- Feature Flag Overrides (Tenant-scoped)
-- ============================================
ALTER TABLE feature_flag_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON feature_flag_overrides
  FOR ALL
  USING (
    organization_id IS NULL OR organization_id = auth.tenant_id()
  )
  WITH CHECK (
    organization_id IS NULL OR organization_id = auth.tenant_id()
  );

-- ============================================
-- Audit Logs (Tenant-scoped, read-only for users)
-- ============================================
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Tenants can only read their own audit logs
CREATE POLICY "tenant_read" ON audit_logs
  FOR SELECT
  USING (
    organization_id IS NULL OR organization_id = auth.tenant_id()
  );

-- Only service role can write audit logs
CREATE POLICY "service_write" ON audit_logs
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- Helper function: Set tenant context
-- ============================================
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id TEXT)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_id, true);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Service role bypass (for backend services)
-- ============================================
-- Backend services should use service_role key which bypasses RLS
-- Or set: SET LOCAL role TO 'service_role';
