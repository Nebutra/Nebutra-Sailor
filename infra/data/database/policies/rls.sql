-- Model-2 RLS (auto-generated from FK graph). app_user = non-bypassrls runtime role.
CREATE OR REPLACE FUNCTION public.current_tenant_id() RETURNS text LANGUAGE sql STABLE AS $f$ SELECT COALESCE(current_setting('app.current_tenant_id', true), '') $f$;

ALTER TABLE "public"."access_invite_codes" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "access_invite_codes_rls" ON "public"."access_invite_codes";
CREATE POLICY "access_invite_codes_rls" ON "public"."access_invite_codes" AS PERMISSIVE FOR ALL TO app_user USING ("tenant_id" = public.current_tenant_id());

ALTER TABLE "public"."access_invite_redemptions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "access_invite_redemptions_rls" ON "public"."access_invite_redemptions";
CREATE POLICY "access_invite_redemptions_rls" ON "public"."access_invite_redemptions" AS PERMISSIVE FOR ALL TO app_user USING ("tenant_id" = public.current_tenant_id());

ALTER TABLE "public"."agent_rollout_lines" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agent_rollout_lines_rls" ON "public"."agent_rollout_lines";
CREATE POLICY "agent_rollout_lines_rls" ON "public"."agent_rollout_lines" AS PERMISSIVE FOR ALL TO app_user USING ("tenant_id" = public.current_tenant_id());

ALTER TABLE "public"."ai_request_logs" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_request_logs_rls" ON "public"."ai_request_logs";
CREATE POLICY "ai_request_logs_rls" ON "public"."ai_request_logs" AS PERMISSIVE FOR ALL TO app_user USING ("tenant_id" = public.current_tenant_id());

ALTER TABLE "public"."api_keys" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "api_keys_rls" ON "public"."api_keys";
CREATE POLICY "api_keys_rls" ON "public"."api_keys" AS PERMISSIVE FOR ALL TO app_user USING ("tenant_id" = public.current_tenant_id());

ALTER TABLE "public"."atelier_canvas" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "atelier_canvas_rls" ON "public"."atelier_canvas";
CREATE POLICY "atelier_canvas_rls" ON "public"."atelier_canvas" AS PERMISSIVE FOR ALL TO app_user USING ("tenant_id" = public.current_tenant_id());

ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs_rls" ON "public"."audit_logs";
CREATE POLICY "audit_logs_rls" ON "public"."audit_logs" AS PERMISSIVE FOR ALL TO app_user USING ("tenant_id" = public.current_tenant_id());

ALTER TABLE "public"."auth_accounts" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_accounts_rls" ON "public"."auth_accounts";
CREATE POLICY "auth_accounts_rls" ON "public"."auth_accounts" AS PERMISSIVE FOR ALL TO app_user USING (true);

ALTER TABLE "public"."auth_sessions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_sessions_rls" ON "public"."auth_sessions";
CREATE POLICY "auth_sessions_rls" ON "public"."auth_sessions" AS PERMISSIVE FOR ALL TO app_user USING (true);

ALTER TABLE "public"."auth_users" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_users_rls" ON "public"."auth_users";
CREATE POLICY "auth_users_rls" ON "public"."auth_users" AS PERMISSIVE FOR ALL TO app_user USING (true);

ALTER TABLE "public"."auth_verifications" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_verifications_rls" ON "public"."auth_verifications";
CREATE POLICY "auth_verifications_rls" ON "public"."auth_verifications" AS PERMISSIVE FOR ALL TO app_user USING (true);

ALTER TABLE "public"."chat_sessions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chat_sessions_rls" ON "public"."chat_sessions";
CREATE POLICY "chat_sessions_rls" ON "public"."chat_sessions" AS PERMISSIVE FOR ALL TO app_user USING ("tenant_id" = public.current_tenant_id());

ALTER TABLE "public"."code_redemptions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "code_redemptions_rls" ON "public"."code_redemptions";
CREATE POLICY "code_redemptions_rls" ON "public"."code_redemptions" AS PERMISSIVE FOR ALL TO app_user USING ("tenant_id" = public.current_tenant_id());

ALTER TABLE "public"."community_profiles" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "community_profiles_rls" ON "public"."community_profiles";
CREATE POLICY "community_profiles_rls" ON "public"."community_profiles" AS PERMISSIVE FOR ALL TO app_user USING (true);

ALTER TABLE "public"."connectors" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "connectors_rls" ON "public"."connectors";
CREATE POLICY "connectors_rls" ON "public"."connectors" AS PERMISSIVE FOR ALL TO app_user USING ("tenant_id" = public.current_tenant_id());

ALTER TABLE "public"."contact_submissions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contact_submissions_rls" ON "public"."contact_submissions";
CREATE POLICY "contact_submissions_rls" ON "public"."contact_submissions" AS PERMISSIVE FOR ALL TO app_user USING (true);

ALTER TABLE "public"."content_embeddings" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "content_embeddings_rls" ON "public"."content_embeddings";
CREATE POLICY "content_embeddings_rls" ON "public"."content_embeddings" AS PERMISSIVE FOR ALL TO app_user USING ("content_id" IN (SELECT "id" FROM "public"."contents" WHERE "tenant_id" = public.current_tenant_id()));

ALTER TABLE "public"."content_translations" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "content_translations_rls" ON "public"."content_translations";
CREATE POLICY "content_translations_rls" ON "public"."content_translations" AS PERMISSIVE FOR ALL TO app_user USING ("content_id" IN (SELECT "id" FROM "public"."contents" WHERE "tenant_id" = public.current_tenant_id()));

ALTER TABLE "public"."contents" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contents_rls" ON "public"."contents";
CREATE POLICY "contents_rls" ON "public"."contents" AS PERMISSIVE FOR ALL TO app_user USING ("tenant_id" = public.current_tenant_id());

ALTER TABLE "public"."cookie_consents" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cookie_consents_rls" ON "public"."cookie_consents";
CREATE POLICY "cookie_consents_rls" ON "public"."cookie_consents" AS PERMISSIVE FOR ALL TO app_user USING (true);

ALTER TABLE "public"."credit_balances" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "credit_balances_rls" ON "public"."credit_balances";
CREATE POLICY "credit_balances_rls" ON "public"."credit_balances" AS PERMISSIVE FOR ALL TO app_user USING ("tenant_id" = public.current_tenant_id());

ALTER TABLE "public"."credit_transactions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "credit_transactions_rls" ON "public"."credit_transactions";
CREATE POLICY "credit_transactions_rls" ON "public"."credit_transactions" AS PERMISSIVE FOR ALL TO app_user USING ("credit_balance_id" IN (SELECT "id" FROM "public"."credit_balances" WHERE "tenant_id" = public.current_tenant_id()));

ALTER TABLE "public"."customer_feature_overrides" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customer_feature_overrides_rls" ON "public"."customer_feature_overrides";
CREATE POLICY "customer_feature_overrides_rls" ON "public"."customer_feature_overrides" AS PERMISSIVE FOR ALL TO app_user USING ("tenant_id" = public.current_tenant_id());

ALTER TABLE "public"."customer_plan_versions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customer_plan_versions_rls" ON "public"."customer_plan_versions";
CREATE POLICY "customer_plan_versions_rls" ON "public"."customer_plan_versions" AS PERMISSIVE FOR ALL TO app_user USING ("tenant_id" = public.current_tenant_id());

ALTER TABLE "public"."customer_usage_limits" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customer_usage_limits_rls" ON "public"."customer_usage_limits";
CREATE POLICY "customer_usage_limits_rls" ON "public"."customer_usage_limits" AS PERMISSIVE FOR ALL TO app_user USING ("tenant_id" = public.current_tenant_id());

ALTER TABLE "public"."feature_definitions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "feature_definitions_rls" ON "public"."feature_definitions";
CREATE POLICY "feature_definitions_rls" ON "public"."feature_definitions" AS PERMISSIVE FOR ALL TO app_user USING (true);

ALTER TABLE "public"."feedback_reports" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "feedback_reports_rls" ON "public"."feedback_reports";
CREATE POLICY "feedback_reports_rls" ON "public"."feedback_reports" AS PERMISSIVE FOR ALL TO app_user USING ("tenant_id" = public.current_tenant_id());

ALTER TABLE "public"."integrations" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "integrations_rls" ON "public"."integrations";
CREATE POLICY "integrations_rls" ON "public"."integrations" AS PERMISSIVE FOR ALL TO app_user USING ("tenant_id" = public.current_tenant_id());

ALTER TABLE "public"."invoice_items" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invoice_items_rls" ON "public"."invoice_items";
CREATE POLICY "invoice_items_rls" ON "public"."invoice_items" AS PERMISSIVE FOR ALL TO app_user USING ("invoice_id" IN (SELECT "id" FROM "public"."invoices" WHERE "tenant_id" = public.current_tenant_id()));

ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invoices_rls" ON "public"."invoices";
CREATE POLICY "invoices_rls" ON "public"."invoices" AS PERMISSIVE FOR ALL TO app_user USING ("tenant_id" = public.current_tenant_id());

ALTER TABLE "public"."legal_documents" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "legal_documents_rls" ON "public"."legal_documents";
CREATE POLICY "legal_documents_rls" ON "public"."legal_documents" AS PERMISSIVE FOR ALL TO app_user USING (true);

ALTER TABLE "public"."licenses" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "licenses_rls" ON "public"."licenses";
CREATE POLICY "licenses_rls" ON "public"."licenses" AS PERMISSIVE FOR ALL TO app_user USING ("stripe_customer_id" IN (SELECT "stripe_id" FROM "public"."stripe_customers" WHERE "tenant_id" = public.current_tenant_id()));

ALTER TABLE "public"."model_configs" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "model_configs_rls" ON "public"."model_configs";
CREATE POLICY "model_configs_rls" ON "public"."model_configs" AS PERMISSIVE FOR ALL TO app_user USING (true);

ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notification_preferences_rls" ON "public"."notification_preferences";
CREATE POLICY "notification_preferences_rls" ON "public"."notification_preferences" AS PERMISSIVE FOR ALL TO app_user USING ("tenant_id" = public.current_tenant_id());

ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_rls" ON "public"."notifications";
CREATE POLICY "notifications_rls" ON "public"."notifications" AS PERMISSIVE FOR ALL TO app_user USING ("tenant_id" = public.current_tenant_id());

ALTER TABLE "public"."oauth_access_tokens" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "oauth_access_tokens_rls" ON "public"."oauth_access_tokens";
CREATE POLICY "oauth_access_tokens_rls" ON "public"."oauth_access_tokens" AS PERMISSIVE FOR ALL TO app_user USING ("client_id" IN (SELECT "id" FROM "public"."oauth_clients" WHERE "tenant_id" = public.current_tenant_id()));

ALTER TABLE "public"."oauth_authorizations" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "oauth_authorizations_rls" ON "public"."oauth_authorizations";
CREATE POLICY "oauth_authorizations_rls" ON "public"."oauth_authorizations" AS PERMISSIVE FOR ALL TO app_user USING ("client_id" IN (SELECT "id" FROM "public"."oauth_clients" WHERE "tenant_id" = public.current_tenant_id()));

ALTER TABLE "public"."oauth_clients" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "oauth_clients_rls" ON "public"."oauth_clients";
CREATE POLICY "oauth_clients_rls" ON "public"."oauth_clients" AS PERMISSIVE FOR ALL TO app_user USING ("tenant_id" = public.current_tenant_id());

ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "order_items_rls" ON "public"."order_items";
CREATE POLICY "order_items_rls" ON "public"."order_items" AS PERMISSIVE FOR ALL TO app_user USING ("order_id" IN (SELECT "id" FROM "public"."orders" WHERE "tenant_id" = public.current_tenant_id()));

ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orders_rls" ON "public"."orders";
CREATE POLICY "orders_rls" ON "public"."orders" AS PERMISSIVE FOR ALL TO app_user USING ("tenant_id" = public.current_tenant_id());

ALTER TABLE "public"."organization_invitations" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "organization_invitations_rls" ON "public"."organization_invitations";
CREATE POLICY "organization_invitations_rls" ON "public"."organization_invitations" AS PERMISSIVE FOR ALL TO app_user USING ("organization_id" = public.current_tenant_id());

ALTER TABLE "public"."organization_members" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "organization_members_rls" ON "public"."organization_members";
CREATE POLICY "organization_members_rls" ON "public"."organization_members" AS PERMISSIVE FOR ALL TO app_user USING ("organization_id" = public.current_tenant_id());

ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "organizations_rls" ON "public"."organizations";
CREATE POLICY "organizations_rls" ON "public"."organizations" AS PERMISSIVE FOR ALL TO app_user USING ("id" = public.current_tenant_id());

ALTER TABLE "public"."payment_methods" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payment_methods_rls" ON "public"."payment_methods";
CREATE POLICY "payment_methods_rls" ON "public"."payment_methods" AS PERMISSIVE FOR ALL TO app_user USING ("tenant_id" = public.current_tenant_id());

ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payments_rls" ON "public"."payments";
CREATE POLICY "payments_rls" ON "public"."payments" AS PERMISSIVE FOR ALL TO app_user USING ("tenant_id" = public.current_tenant_id());

ALTER TABLE "public"."plan_features" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plan_features_rls" ON "public"."plan_features";
CREATE POLICY "plan_features_rls" ON "public"."plan_features" AS PERMISSIVE FOR ALL TO app_user USING (true);

ALTER TABLE "public"."plan_usage_limits" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plan_usage_limits_rls" ON "public"."plan_usage_limits";
CREATE POLICY "plan_usage_limits_rls" ON "public"."plan_usage_limits" AS PERMISSIVE FOR ALL TO app_user USING (true);

ALTER TABLE "public"."pricing_plans" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pricing_plans_rls" ON "public"."pricing_plans";
CREATE POLICY "pricing_plans_rls" ON "public"."pricing_plans" AS PERMISSIVE FOR ALL TO app_user USING (true);

ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_rls" ON "public"."products";
CREATE POLICY "products_rls" ON "public"."products" AS PERMISSIVE FOR ALL TO app_user USING ("tenant_id" = public.current_tenant_id());

ALTER TABLE "public"."redemption_codes" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "redemption_codes_rls" ON "public"."redemption_codes";
CREATE POLICY "redemption_codes_rls" ON "public"."redemption_codes" AS PERMISSIVE FOR ALL TO app_user USING (true);

ALTER TABLE "public"."referrals" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "referrals_rls" ON "public"."referrals";
CREATE POLICY "referrals_rls" ON "public"."referrals" AS PERMISSIVE FOR ALL TO app_user USING (true);

ALTER TABLE "public"."skills" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "skills_rls" ON "public"."skills";
CREATE POLICY "skills_rls" ON "public"."skills" AS PERMISSIVE FOR ALL TO app_user USING (true);

ALTER TABLE "public"."sleptons_connections" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sleptons_connections_rls" ON "public"."sleptons_connections";
CREATE POLICY "sleptons_connections_rls" ON "public"."sleptons_connections" AS PERMISSIVE FOR ALL TO app_user USING (true);

ALTER TABLE "public"."sleptons_member_profiles" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sleptons_member_profiles_rls" ON "public"."sleptons_member_profiles";
CREATE POLICY "sleptons_member_profiles_rls" ON "public"."sleptons_member_profiles" AS PERMISSIVE FOR ALL TO app_user USING (true);

ALTER TABLE "public"."sleptons_products" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sleptons_products_rls" ON "public"."sleptons_products";
CREATE POLICY "sleptons_products_rls" ON "public"."sleptons_products" AS PERMISSIVE FOR ALL TO app_user USING (true);

ALTER TABLE "public"."sleptons_upvotes" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sleptons_upvotes_rls" ON "public"."sleptons_upvotes";
CREATE POLICY "sleptons_upvotes_rls" ON "public"."sleptons_upvotes" AS PERMISSIVE FOR ALL TO app_user USING (true);

ALTER TABLE "public"."stripe_customers" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stripe_customers_rls" ON "public"."stripe_customers";
CREATE POLICY "stripe_customers_rls" ON "public"."stripe_customers" AS PERMISSIVE FOR ALL TO app_user USING ("tenant_id" = public.current_tenant_id());

ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscriptions_rls" ON "public"."subscriptions";
CREATE POLICY "subscriptions_rls" ON "public"."subscriptions" AS PERMISSIVE FOR ALL TO app_user USING ("tenant_id" = public.current_tenant_id());

ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenants_rls" ON "public"."tenants";
CREATE POLICY "tenants_rls" ON "public"."tenants" AS PERMISSIVE FOR ALL TO app_user USING ("id" = public.current_tenant_id());

ALTER TABLE "public"."tenant_provider_keys" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_provider_keys_rls" ON "public"."tenant_provider_keys";
CREATE POLICY "tenant_provider_keys_rls" ON "public"."tenant_provider_keys" AS PERMISSIVE FOR ALL TO app_user USING ("tenant_id" = public.current_tenant_id());

ALTER TABLE "public"."threads" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "threads_rls" ON "public"."threads";
CREATE POLICY "threads_rls" ON "public"."threads" AS PERMISSIVE FOR ALL TO app_user USING ("tenant_id" = public.current_tenant_id());

ALTER TABLE "public"."usage_ledger_entries" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "usage_ledger_entries_rls" ON "public"."usage_ledger_entries";
CREATE POLICY "usage_ledger_entries_rls" ON "public"."usage_ledger_entries" AS PERMISSIVE FOR ALL TO app_user USING ("tenant_id" = public.current_tenant_id());

ALTER TABLE "public"."usage_limit_definitions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "usage_limit_definitions_rls" ON "public"."usage_limit_definitions";
CREATE POLICY "usage_limit_definitions_rls" ON "public"."usage_limit_definitions" AS PERMISSIVE FOR ALL TO app_user USING (true);

ALTER TABLE "public"."user_consents" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_consents_rls" ON "public"."user_consents";
CREATE POLICY "user_consents_rls" ON "public"."user_consents" AS PERMISSIVE FOR ALL TO app_user USING ("tenant_id" = public.current_tenant_id());

ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_profiles_rls" ON "public"."user_profiles";
CREATE POLICY "user_profiles_rls" ON "public"."user_profiles" AS PERMISSIVE FOR ALL TO app_user USING (true);

ALTER TABLE "public"."user_skills" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_skills_rls" ON "public"."user_skills";
CREATE POLICY "user_skills_rls" ON "public"."user_skills" AS PERMISSIVE FOR ALL TO app_user USING ("tenant_id" = public.current_tenant_id());

ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_rls" ON "public"."users";
CREATE POLICY "users_rls" ON "public"."users" AS PERMISSIVE FOR ALL TO app_user USING (true);

ALTER TABLE "public"."webhook_events" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "webhook_events_rls" ON "public"."webhook_events";
CREATE POLICY "webhook_events_rls" ON "public"."webhook_events" AS PERMISSIVE FOR ALL TO app_user USING (true);

