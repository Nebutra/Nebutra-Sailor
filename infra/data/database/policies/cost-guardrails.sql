-- Cost guardrails for the platform database.
--
-- Applied to the application role, not to individual call sites. @nebutra/db
-- already issues `SET LOCAL statement_timeout` inside getTenantDb, but that
-- only covers queries that go through getTenantDb — a raw client, a migration
-- script, a background job, or a future code path that forgets inherits
-- nothing. Role-level defaults apply to every session the role opens, so there
-- is no path that quietly opts out.
--
-- Idempotent. Safe to re-run, and safe to apply to a database that already has
-- traffic. Re-run after changing APP_DB_ROLE.
--
--   psql "$ADMIN_URL" -v role=app_user -f cost-guardrails.sql
--
-- Values are deliberately conservative; raise them when a real workload proves
-- it needs more, rather than starting permissive.

\set role :role

-- A runaway query bills CPU for as long as it runs. 30s matches
-- DB_STATEMENT_TIMEOUT_MS so the role-level floor and the application-level
-- setting agree; nothing legitimate in this codebase runs longer.
ALTER ROLE :"role" SET statement_timeout = '30s';

-- The expensive one. A client that opens a transaction and stops (crash, hung
-- await, paused debugger) holds its snapshot open indefinitely. That blocks
-- autovacuum from reclaiming dead rows across the whole database, so storage
-- grows and never comes back — and it pins one of the origin's limited
-- connections while doing it. 60s is long enough for any real transaction here.
ALTER ROLE :"role" SET idle_in_transaction_session_timeout = '60s';

-- Without this a single held lock turns into a queue of sessions all waiting,
-- each holding a connection, until the pool is exhausted. Fail the one query
-- instead of stalling everything behind it.
ALTER ROLE :"role" SET lock_timeout = '10s';

-- Same reasoning one level up: a session that connects and then goes silent
-- outside a transaction still occupies a connection slot.
ALTER ROLE :"role" SET idle_session_timeout = '15min';

-- Hard ceiling on connections this role can hold. Hyperdrive is configured
-- with an origin_connection_limit of 15 and ECS Origin runs a pg.Pool with
-- DB_POOL_MAX (default 10), so steady state is ~25. The cap exists so a
-- misconfigured deploy or a connection-leaking loop cannot consume every slot
-- the plan allows and lock out the rest of the platform.
-- Override with -v conn_limit=N when the topology grows.
\if :{?conn_limit}
\else
  \set conn_limit 50
\endif
ALTER ROLE :"role" CONNECTION LIMIT :conn_limit;

-- Report what is now in force, so applying this is self-verifying.
SELECT rolname AS role,
       rolconnlimit AS connection_limit,
       rolconfig AS session_defaults
FROM pg_roles
WHERE rolname = :'role';
