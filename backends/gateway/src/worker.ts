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

export default {
  fetch(request: Request, env: GatewayEnv, executionContext?: GatewayExecutionContext) {
    resolveDatabaseUrl(env);
    return app.fetch(request, env, executionContext);
  },
};
