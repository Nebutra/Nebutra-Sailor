-- RLS for public.auth_device_codes (created by 20260925010000_add_auth_device_codes).
--
-- Same posture as auth_sessions (20260903000000_rls_full_tenant_coverage):
-- RLS on for defense-in-depth with an explicit, reviewed allow-all — rows are
-- keyed by device/user code and read only by the auth center. Kept out of the
-- table migration because that one was already applied in production; every
-- statement here tolerates a re-run.

ALTER TABLE "public"."auth_device_codes" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_device_codes_bypass" ON "public"."auth_device_codes";
CREATE POLICY "auth_device_codes_bypass" ON "public"."auth_device_codes"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "auth_device_codes_allow_all" ON "public"."auth_device_codes";
CREATE POLICY "auth_device_codes_allow_all" ON "public"."auth_device_codes"
  AS PERMISSIVE FOR ALL
  USING (true)
  WITH CHECK (true);
