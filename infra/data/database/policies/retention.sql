-- Retention for the append-only tables.
--
-- Every table below grows monotonically by design and had no purge path, so
-- each one was an open-ended storage commitment. Storage is the bill that
-- accumulates quietly: nothing alerts, the number just goes up every month.
--
-- Idempotent. Creates a config table, a purge function, and nothing that runs
-- on its own — call `SELECT public.purge_expired_rows();` from a schedule.
--
--   psql "$ADMIN_URL" -f retention.sql
--
-- Windows are set to defensible defaults, not aggressive ones. Change a row in
-- `retention_policies` to change a window; no code deploy needed.

CREATE TABLE IF NOT EXISTS public.retention_policies (
  table_name   text PRIMARY KEY,
  keep_days    integer NOT NULL CHECK (keep_days > 0),
  time_column  text    NOT NULL DEFAULT 'created_at',
  enabled      boolean NOT NULL DEFAULT true,
  note         text
);

-- SOC 2 commonly expects a year of audit history, and audit_logs is the one
-- table here where deleting early has a compliance cost rather than just a
-- convenience cost. Everything else is operational exhaust.
INSERT INTO public.retention_policies (table_name, keep_days, time_column, note) VALUES
  ('audit_logs',            365, 'created_at',  'Compliance evidence — do not shorten without a compliance review'),
  ('ai_request_logs',        90, 'created_at',  'Debugging and abuse investigation; usage totals live in metering'),
  ('webhook_events',         30, 'created_at',  'Delivery attempts; redelivery windows are far shorter'),
  ('usage_ledger_entries',  400, 'occurred_at', 'Billing evidence — must outlive the longest dispute window'),
  ('auth_sessions',           7, 'expires_at',  'Purge on expiry, not creation — an expired session is dead weight immediately'),
  ('desktop_auth_sessions',   7, 'expires_at',  'Same'),
  ('automation_runs',        90, 'created_at',  'Run history'),
  ('workflow_runs',          90, 'created_at',  'Run history')
ON CONFLICT (table_name) DO NOTHING;

-- Deletes in bounded batches. A single unbounded DELETE on a large table takes
-- a long lock, and with lock_timeout at 10s it would simply fail forever
-- without ever making progress. Batching also keeps each transaction short
-- enough that it never becomes the idle-in-transaction problem it is meant to
-- prevent.
CREATE OR REPLACE FUNCTION public.purge_expired_rows(
  batch_size integer DEFAULT 5000,
  max_batches integer DEFAULT 200
)
RETURNS TABLE(purged_table text, rows_deleted bigint)
LANGUAGE plpgsql
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

-- The purge role needs DELETE on the governed tables. The application role
-- already has it; grant EXECUTE so a scheduled job can run as the app rather
-- than needing admin credentials in CI.
DO $$
DECLARE r text;
BEGIN
  FOR r IN SELECT rolname FROM pg_roles WHERE rolname = current_setting('app.purge_role', true)
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.purge_expired_rows(integer, integer) TO %I', r);
  END LOOP;
END $$;

COMMENT ON FUNCTION public.purge_expired_rows IS
  'Deletes rows past their retention window in bounded batches. Driven by public.retention_policies.';
