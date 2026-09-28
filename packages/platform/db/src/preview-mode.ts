/**
 * Whether `@nebutra/db` runs against the local preview database.
 *
 * A project scaffolded from the template has to start with no database to
 * set up. So when `DATABASE_URL` is unset (outside production) or explicitly
 * `pglite:` / `file:`, the client connects to the preview database instead:
 * PGlite — Postgres compiled to WASM — owned by one small process
 * (`scripts/preview-db.mjs`) and served on 127.0.0.1 over the ordinary
 * Postgres wire protocol. The client keeps using `pg` + `@prisma/adapter-pg`
 * exactly as in production; only the URL differs.
 *
 * Any other `DATABASE_URL` makes `previewDatabase` return `null`, and nothing
 * else here runs. This module imports nothing at load; the code that can start
 * the preview database (`preview-server.ts`) is imported on the first
 * connection, in preview mode only. Workers get `preview-mode.workerd.ts`
 * instead (the `#preview-db` import condition): `null` and a no-op.
 */

export const PREVIEW_DB_DEFAULT_PORT = 54329;

/** The role getTenantDb switches into; the preview bootstrap creates it. */
export const PREVIEW_DB_ROLE = "app_user";

export interface PreviewDatabase {
  /** Loopback wire endpoint of the preview database. */
  url: string;
  port: number;
  /** Runtime role for RLS when APP_DB_ROLE is not set. */
  role: string;
  /** Data directory named by a `pglite:<dir>` / `file:<dir>` URL, if any. */
  dataDir?: string;
}

type Env = Record<string, string | undefined>;

export function previewDatabase(env: Env): PreviewDatabase | null {
  const raw = (env.DATABASE_URL ?? "").trim();
  const explicit = /^(pglite|file):/i.test(raw);
  if (raw && !explicit) return null;
  // Implicit preview (no DATABASE_URL at all) never happens in production:
  // there, a missing DATABASE_URL stays the startup error it always was.
  if (!explicit && env.NODE_ENV === "production") return null;

  const port = Number(env.NEBUTRA_PREVIEW_DB_PORT) || PREVIEW_DB_DEFAULT_PORT;
  const dataDir = explicit ? raw.replace(/^(pglite|file):(\/\/)?/i, "") || undefined : undefined;
  return {
    url: `postgresql://postgres:postgres@127.0.0.1:${port}/postgres?sslmode=disable`,
    port,
    role: PREVIEW_DB_ROLE,
    ...(dataDir ? { dataDir } : {}),
  };
}

/** The slice of `pg.Pool` this touches. */
interface ConnectablePool {
  connect: (...args: never[]) => unknown;
}

type ConnectCallback = (error: Error | undefined, client?: unknown, done?: () => void) => void;

/**
 * Hold the pool's first connection until the preview database answers,
 * starting it if nobody has. `pg.Pool#query` calls `this.connect(callback)`;
 * PrismaPg calls `connect()` — both go through here.
 */
export function awaitPreviewDatabase(pool: ConnectablePool, preview: PreviewDatabase): void {
  let ready: Promise<void> | undefined;
  const ensure = () => {
    ready ??= import("#preview-db-server")
      .then(({ ensurePreviewDatabase }) => ensurePreviewDatabase(preview))
      .catch((error: unknown) => {
        ready = undefined;
        throw error;
      });
    return ready;
  };
  const connect = (pool.connect as (...args: unknown[]) => unknown).bind(pool);
  pool.connect = ((callback?: ConnectCallback) => {
    if (!callback) return ensure().then(() => connect());
    ensure().then(
      () => connect(callback),
      (error: Error) => callback(error, undefined, () => undefined),
    );
    return undefined;
  }) as ConnectablePool["connect"];
}
