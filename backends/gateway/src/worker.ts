import app from "./index.js";

type GatewayFetch = typeof app.fetch;
type GatewayEnv = NonNullable<Parameters<GatewayFetch>[1]>;
type GatewayExecutionContext = Parameters<GatewayFetch>[2];

/**
 * Hyperdrive arrives as a binding on `env`, not through `process.env` the way
 * vars and secrets do. `@nebutra/db` builds its pg.Pool lazily from
 * `process.env.DATABASE_URL`, so the binding has to be copied across before
 * the first query constructs that pool — once it exists the connection string
 * is already baked in.
 *
 * Hyperdrive wins over a plain DATABASE_URL when both are present: on Workers
 * a direct connection string opens a fresh Postgres connection per isolate,
 * which is what exhausts the server's connection slots under load. Off Workers
 * the binding is absent and DATABASE_URL is used unchanged.
 */
interface HyperdriveBinding {
  connectionString: string;
}

function resolveDatabaseUrl(env: GatewayEnv): void {
  const hyperdrive = (env as { HYPERDRIVE?: HyperdriveBinding }).HYPERDRIVE;
  if (!hyperdrive?.connectionString) return;
  if (process.env.DATABASE_URL === hyperdrive.connectionString) return;
  process.env.DATABASE_URL = hyperdrive.connectionString;
}

/**
 * Retention purge, on a Cron Trigger rather than CI.
 *
 * The alternative was a scheduled GitHub Action, which would have meant
 * putting a production database admin credential into GitHub secrets purely
 * so an external runner could reach Postgres. The Worker already holds a
 * connection through Hyperdrive, so running it here adds no credential
 * surface at all — and Cron Triggers are scheduled, where Actions cron is
 * explicitly best-effort and skews under load.
 *
 * What gets deleted is data, not code: `public.retention_policies` drives it,
 * so changing a window is an UPDATE, not a deploy. The function deletes in
 * bounded batches, so it never holds a lock long enough to trip the 10s
 * lock_timeout or become the idle-in-transaction problem it exists to avoid.
 */
async function purgeExpiredRows(env: GatewayEnv): Promise<void> {
  const hyperdrive = (env as { HYPERDRIVE?: HyperdriveBinding }).HYPERDRIVE;
  const connectionString = hyperdrive?.connectionString ?? process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("[retention] no database connection available; skipping purge");
    return;
  }

  const { Client } = await import("pg");
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const result = await client.query<{ purged_table: string; rows_deleted: string }>(
      "SELECT purged_table, rows_deleted FROM public.purge_expired_rows()",
    );
    for (const row of result.rows) {
      // console.warn, not log: the project bans console.log, and a Worker
      // cannot use @nebutra/logger here without pulling its Sentry transport
      // into the bundle. These lines are the only record a cron run leaves.
      console.warn(`[retention] ${row.purged_table}: ${row.rows_deleted}`);
    }
    if (result.rows.length === 0) {
      console.warn("[retention] nothing past its window");
    }
  } finally {
    await client.end();
  }
}

export default {
  fetch(request: Request, env: GatewayEnv, executionContext?: GatewayExecutionContext) {
    resolveDatabaseUrl(env);
    return app.fetch(request, env, executionContext);
  },

  scheduled(_event: unknown, env: GatewayEnv, ctx: { waitUntil: (p: Promise<unknown>) => void }) {
    resolveDatabaseUrl(env);
    ctx.waitUntil(
      purgeExpiredRows(env).catch((err) => {
        console.error("[retention] purge failed", err);
      }),
    );
  },
};
