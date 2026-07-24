/**
 * API protocol enablement for the gateway.
 *
 * Production contract:
 *   - **REST/OpenAPI is always on** (canonical public surface).
 *   - tRPC / oRPC are **optional internal adapters** (same domain procedures).
 *   - Default when env is empty: REST only.
 *
 * Resolution precedence (first that applies wins):
 *   1. `API_PROTOCOLS` — canonical comma list, e.g. `"rest,trpc"` (preferred).
 *   2. `NEBUTRA_API_PROTOCOLS` — preset/scaffold alias (same format as #1).
 *   3. Legacy `ENABLE_TRPC` / `ENABLE_ORPC` — **deprecated**, remove by 2026-10-01.
 *
 * `resolveEnabledProtocols` takes its env source as an argument so it is unit
 * testable without mutating `process.env`.
 */

export type ApiProtocol = "rest" | "trpc" | "orpc";

/** Soft sunset for legacy ENABLE_* booleans. */
export const LEGACY_PROTOCOL_FLAGS_SUNSET = "2026-10-01";

const OPTIONAL_PROTOCOLS: readonly ApiProtocol[] = ["trpc", "orpc"];

function parseProtocolList(raw: string | undefined): ApiProtocol[] | null {
  if (raw == null || raw.trim() === "") return null;
  const out: ApiProtocol[] = [];
  for (const value of raw
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean)) {
    if (value === "rest" || value === "trpc" || value === "orpc") {
      out.push(value);
    }
  }
  return out;
}

export function resolveEnabledProtocols(
  envSource: Record<string, string | undefined> = process.env,
): Set<ApiProtocol> {
  // REST is the always-on canonical contract.
  const enabled = new Set<ApiProtocol>(["rest"]);

  // 1–2. Canonical list (API_PROTOCOLS preferred; NEBUTRA_API_PROTOCOLS from preset).
  const list =
    parseProtocolList(envSource.API_PROTOCOLS) ??
    parseProtocolList(envSource.NEBUTRA_API_PROTOCOLS);

  if (list && list.length > 0) {
    for (const protocol of list) {
      enabled.add(protocol);
    }
    return enabled;
  }

  // 3. Legacy boolean flags — deprecated; do not use in new deploys.
  const legacyTrpc = envSource.ENABLE_TRPC === "true";
  const legacyOrpc = envSource.ENABLE_ORPC === "true";
  if (legacyTrpc) enabled.add("trpc");
  if (legacyOrpc) enabled.add("orpc");
  if ((legacyTrpc || legacyOrpc) && typeof console !== "undefined") {
    console.warn(
      `[gateway] ENABLE_TRPC/ENABLE_ORPC are deprecated (remove by ${LEGACY_PROTOCOL_FLAGS_SUNSET}). ` +
        `Set API_PROTOCOLS instead (e.g. API_PROTOCOLS=rest,trpc).`,
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
