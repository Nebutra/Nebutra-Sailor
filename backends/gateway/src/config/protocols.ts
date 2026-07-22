/**
 * API protocol enablement for the gateway.
 *
 * REST/OpenAPI is the canonical public contract and is ALWAYS on. tRPC and oRPC
 * are opt-in alternative protocols that mirror the preset-system vocabulary
 * (`@nebutra/preset` → `ApiProtocolId = "rest" | "orpc" | "trpc"`), so a
 * `defineConfig({ apiProtocols: ["rest", "trpc"] })` choice and the deployed
 * gateway speak the same language.
 *
 * Resolution precedence (first that applies wins):
 *   1. `API_PROTOCOLS` env — comma list, e.g. `"rest,trpc,orpc"` (canonical).
 *   2. Legacy `ENABLE_TRPC` / `ENABLE_ORPC` booleans — back-compat only.
 *   3. Default — REST only.
 *
 * `resolveEnabledProtocols` takes its env source as an argument so it is unit
 * testable without mutating `process.env`.
 */

export type ApiProtocol = "rest" | "trpc" | "orpc";

const OPTIONAL_PROTOCOLS: readonly ApiProtocol[] = ["trpc", "orpc"];

export function resolveEnabledProtocols(
  envSource: Record<string, string | undefined> = process.env,
): Set<ApiProtocol> {
  // REST is the always-on canonical contract.
  const enabled = new Set<ApiProtocol>(["rest"]);

  // 1. Canonical `API_PROTOCOLS` comma list.
  const list = envSource.API_PROTOCOLS?.split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (list && list.length > 0) {
    for (const protocol of list) {
      if (protocol === "rest" || protocol === "trpc" || protocol === "orpc") {
        enabled.add(protocol);
      }
    }
    return enabled;
  }

  // 2. Legacy boolean flags (back-compat with the pre-`API_PROTOCOLS` gateway).
  // Prefer `API_PROTOCOLS=rest,trpc` (etc.) for new deploys. These booleans remain
  // only so rolling deploys with older env files do not silently drop tRPC/oRPC.
  const legacyTrpc = envSource.ENABLE_TRPC === "true";
  const legacyOrpc = envSource.ENABLE_ORPC === "true";
  if (legacyTrpc) enabled.add("trpc");
  if (legacyOrpc) enabled.add("orpc");
  if ((legacyTrpc || legacyOrpc) && typeof console !== "undefined") {
    console.warn(
      "[gateway] ENABLE_TRPC/ENABLE_ORPC are deprecated; set API_PROTOCOLS instead (e.g. API_PROTOCOLS=rest,trpc).",
    );
  }

  return enabled;
}

/** Protocols enabled for this process (resolved once at import time). */
export const enabledProtocols = resolveEnabledProtocols();

export const isTrpcEnabled = enabledProtocols.has("trpc");
export const isOrpcEnabled = enabledProtocols.has("orpc");

/** Optional (non-REST) protocols that are currently enabled — handy for logging. */
export const enabledOptionalProtocols = OPTIONAL_PROTOCOLS.filter((protocol) =>
  enabledProtocols.has(protocol),
);
