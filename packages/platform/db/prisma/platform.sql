-- =============================================================================
-- platform.sql — the database objects Prisma cannot express
-- =============================================================================
-- Hand-maintained, and the only hand-written SQL in the database layer. Keep it
-- small: tables and columns belong in schema.prisma, access rules in `/// @rls`
-- comments there. What is left is functions and role settings.
--
-- Idempotent. `pnpm db:deploy` runs it after `prisma migrate deploy` and
-- before prisma/generated/rls.sql, in one transaction, on every deploy — so an
-- edit here reaches every database on its next deploy with no migration file.
--
-- The runtime role is read from the `nebutra.app_role` setting the deploy
-- command passes (APP_DB_ROLE, default app_user). Everything that names it is
-- skipped when that role does not exist yet — creating a login role needs a
-- password, which is provisioning (scripts/provision-fresh-database.sh), not
-- deployment.
-- =============================================================================

-- Retention sweep, driven by public.retention_policies -----------------------
CREATE OR REPLACE FUNCTION public.purge_expired_rows(
  batch_size integer DEFAULT 5000,
  max_batches integer DEFAULT 200
)
RETURNS TABLE(purged_table text, rows_deleted bigint)
LANGUAGE plpgsql
-- SECURITY DEFINER so the purge works when the caller is the application role.
-- The connection the scheduled Worker uses is deliberately a role that cannot
-- bypass RLS; without this the DELETEs would see no rows and silently purge
-- nothing while reporting success. search_path is pinned because a DEFINER
-- function that resolves objects through the caller's path is a privilege
-- escalation.
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  policy   record;
  deleted  bigint;
  total    bigint;
  batches  integer;
BEGIN
  FOR policy IN
    SELECT p.table_name, p.keep_days, p.time_column
    FROM public.retention_policies p
    WHERE p.enabled
      AND to_regclass('public.' || quote_ident(p.table_name)) IS NOT NULL
    ORDER BY p.table_name
  LOOP
    -- A policy naming a column the table does not have would abort the whole
    -- run and leave every later table unpurged. Report it and keep going;
    -- storage growth on one table beats no purge at all.
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = policy.table_name
        AND column_name = policy.time_column
    ) THEN
      purged_table := policy.table_name || ' (SKIPPED: no column ' || policy.time_column || ')';
      rows_deleted := 0;
      RETURN NEXT;
      CONTINUE;
    END IF;

    total := 0;
    batches := 0;

    LOOP
      EXECUTE format(
        'DELETE FROM public.%I WHERE ctid IN (
           SELECT ctid FROM public.%I
           WHERE %I < now() - ($1 || '' days'')::interval
           LIMIT $2
         )',
        policy.table_name, policy.table_name, policy.time_column
      ) USING policy.keep_days, batch_size;

      GET DIAGNOSTICS deleted = ROW_COUNT;
      total := total + deleted;
      batches := batches + 1;

      EXIT WHEN deleted < batch_size OR batches >= max_batches;
    END LOOP;

    IF total > 0 THEN
      purged_table := policy.table_name;
      rows_deleted := total;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_rows(integer, integer) FROM PUBLIC;

-- The runtime role: table access, then role-level guardrails ------------------
DO $$
DECLARE
  app_role text := coalesce(nullif(current_setting('nebutra.app_role', true), ''), 'app_user');
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = app_role) THEN
    RAISE NOTICE 'role % does not exist yet; skipping its grants and guardrails', app_role;
    RETURN;
  END IF;

  -- Row-level security decides which rows; these decide which tables at all.
  EXECUTE format('GRANT USAGE ON SCHEMA public, better_auth TO %I', app_role);
  EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO %I', app_role);
  EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA better_auth TO %I', app_role);
  EXECUTE format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO %I', app_role);
  EXECUTE format('GRANT EXECUTE ON FUNCTION public.purge_expired_rows(integer, integer) TO %I', app_role);

  -- Role-level, not call-site level: getTenantDb sets statement_timeout, but a
  -- raw client or a future code path that forgets inherits nothing. Defaults on
  -- the role cover every session it opens.
  EXECUTE format('ALTER ROLE %I SET statement_timeout = %L', app_role, '30s');
  EXECUTE format('ALTER ROLE %I SET idle_in_transaction_session_timeout = %L', app_role, '60s');
  EXECUTE format('ALTER ROLE %I SET lock_timeout = %L', app_role, '10s');
  EXECUTE format('ALTER ROLE %I SET idle_session_timeout = %L', app_role, '15min');
  -- A leaking loop cannot take every slot the plan allows.
  EXECUTE format('ALTER ROLE %I CONNECTION LIMIT 50', app_role);
END $$;
