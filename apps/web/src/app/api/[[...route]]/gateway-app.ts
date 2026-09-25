import "server-only";

/**
 * GATEWAY_MODE controls whether this Next app mounts the Hono gateway
 * in-process (Sailor Convergence ADR §6).
 *
 * - "embedded" (default): the gateway app is built and served from within
 *   this Next process, under the same /api/* origin — the shape a freshly
 *   scaffolded template runs.
 * - "external": nothing is mounted here; unmatched /api/* paths 404. This
 *   is Nebutra's own production shape — the gateway runs standalone
 *   (Cloudflare Workers edge + Fly origin, apps/web is a separate Fly app),
 *   and the browser already reaches it directly via
 *   NEXT_PUBLIC_API_GATEWAY_URL / NEXT_PUBLIC_API_URL
 *   (see src/lib/api/browser-client.ts) — nothing in this Next server ever
 *   proxies to the gateway today, so external mode has nothing to forward.
 */
export type GatewayMode = "embedded" | "external";

export function resolveGatewayMode(env: NodeJS.ProcessEnv = process.env): GatewayMode {
  return env.GATEWAY_MODE === "external" ? "external" : "embedded";
}

export interface MountedGatewayApp {
  fetch: (request: Request) => Response | Promise<Response>;
}

/**
 * Lazily builds the gateway app the first time a request needs it, and
 * reuses that instance for the life of this server process (same
 * module-scope-cache pattern the standalone entry gets from ESM's
 * once-per-process import semantics).
 *
 * `startWorkers: false` — see backends/gateway/src/app.ts. This Next
 * process must not host the queue-backed completion/para-agent workers;
 * queued/background work in embedded mode flows through the QStash webhook
 * delivery route (backends/gateway/src/routes/queue/delivery.ts), which is
 * mounted by this same app and processes one job per HTTP delivery.
 */
let gatewayAppPromise: Promise<MountedGatewayApp> | null = null;

export function getEmbeddedGatewayApp(): Promise<MountedGatewayApp> {
  if (!gatewayAppPromise) {
    gatewayAppPromise = import("@nebutra/gateway/app").then(({ createGatewayApp }) =>
      createGatewayApp({ startWorkers: false }).then(({ app }) => app),
    );
  }
  return gatewayAppPromise;
}
