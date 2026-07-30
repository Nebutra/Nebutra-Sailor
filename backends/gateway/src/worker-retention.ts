/**
 * Retention purge, on its own Worker.
 *
 * It lived on the full gateway, which cannot be deployed — so the Cron Trigger
 * was never actually scheduled and nothing has ever purged. Moving it to the
 * edge Worker would have been the shorter path, but that Worker deliberately
 * holds no database credential: it sits on api.nebutra.com serving public
 * traffic, and the reason it forwards every authenticated decision to the
 * origin is so a compromise there cannot reach data. Handing it Postgres to
 * save a file would undo that.
 *
 * So: one Worker, one binding, one job, no route. Nothing here is reachable
 * over HTTP.
 */

// @brand-exempt: hostnames appear only in the header comment describing the deploy topology.
// This Worker takes no hostname at runtime — it is cron-triggered and reaches Postgres through
// a Hyperdrive binding.

interface HyperdriveBinding {
  connectionString: string;
}

interface RetentionEnv {
  HYPERDRIVE?: HyperdriveBinding;
  DATABASE_URL?: string;
}

async function purgeExpiredRows(env: RetentionEnv): Promise<void> {
  const connectionString = env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL;
  if (!connectionString) {
    console.error("[retention] no database connection available; skipping purge");
    return;
  }

  const { Client } = await import("pg");
  const client = new Client({ connectionString });
  await client.connect();
  try {
    // Windows live in public.retention_policies, so changing one is an UPDATE
    // rather than a deploy. The function is SECURITY DEFINER because this
    // connects as the application role, which cannot bypass RLS — without that
    // the DELETEs would match nothing and report success.
    const result = await client.query<{ purged_table: string; rows_deleted: string }>(
      "SELECT purged_table, rows_deleted FROM public.purge_expired_rows()",
    );
    for (const row of result.rows) {
      // console.warn, not log: the project bans console.log, and pulling in
      // @nebutra/logger would drag its Sentry transport into the bundle.
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
  scheduled(_event: unknown, env: RetentionEnv, ctx: { waitUntil: (p: Promise<unknown>) => void }) {
    ctx.waitUntil(
      purgeExpiredRows(env).catch((err) => {
        console.error("[retention] purge failed", err);
      }),
    );
  },
};
