/**
 * Market — which legal market a deployment serves, read from env.
 *
 * The one switch for mainland-China surfaces (CLAUDE.md, ADR 2026-09-24 §3):
 *
 *   NEBUTRA_LOCALE=cn
 *
 * Server code reads `NEBUTRA_LOCALE`. Client bundles cannot see a non-public
 * variable, so the apps mirror it to `NEXT_PUBLIC_NEBUTRA_LOCALE` in their
 * `next.config.ts` (`env`), and this module reads that name as a literal so
 * Next inlines it. The older names stay as aliases: `NEBUTRA_REGION` and
 * `NEXT_PUBLIC_REGION`.
 *
 * Precedence: NEBUTRA_LOCALE → NEXT_PUBLIC_NEBUTRA_LOCALE → NEBUTRA_REGION →
 * NEXT_PUBLIC_REGION. The first one that parses wins; an unparseable value is
 * skipped rather than read as "global".
 *
 * Pure: no fetch, no geo-IP, no `navigator`. Safe on server, client and tests.
 */

export type MarketRegion = "cn-mainland" | "cn-hk-mo-tw" | "overseas" | "unknown";

/** The env names, in precedence order. */
export const MARKET_ENV_KEYS = [
  "NEBUTRA_LOCALE",
  "NEXT_PUBLIC_NEBUTRA_LOCALE",
  "NEBUTRA_REGION",
  "NEXT_PUBLIC_REGION",
] as const;

export type MarketEnv = Partial<Record<(typeof MARKET_ENV_KEYS)[number], string | undefined>>;

const REGIONS: readonly MarketRegion[] = ["cn-mainland", "cn-hk-mo-tw", "overseas", "unknown"];

/** Parse one value; `undefined` when it names no market. */
export function parseMarket(value: string | undefined): MarketRegion | undefined {
  if (!value) return undefined;
  const v = value.toLowerCase().trim();
  if (!v) return undefined;
  if ((REGIONS as readonly string[]).includes(v) && v !== "unknown") return v as MarketRegion;
  if (v === "cn" || v === "china" || v === "mainland" || v === "zh-cn") return "cn-mainland";
  if (["hk", "mo", "tw", "hkt", "hkmotw"].includes(v)) return "cn-hk-mo-tw";
  if (["global", "intl", "us", "eu", "world", "overseas"].includes(v)) return "overseas";
  return undefined;
}

/** Read one variable; a bundle with no `process` throws, which reads as unset. */
function read(get: () => string | undefined): string | undefined {
  try {
    return get();
  } catch {
    return undefined;
  }
}

/**
 * Read the market variables from `process.env`. Each name is written out as a
 * literal `process.env.X` so Next (`env` in next.config) and Vite (`define`)
 * can inline the public ones into a client bundle, where `process` itself may
 * not exist.
 */
function processMarketEnv(): MarketEnv {
  return {
    NEBUTRA_LOCALE: read(() => process.env.NEBUTRA_LOCALE),
    NEXT_PUBLIC_NEBUTRA_LOCALE: read(() => process.env.NEXT_PUBLIC_NEBUTRA_LOCALE),
    NEBUTRA_REGION: read(() => process.env.NEBUTRA_REGION),
    NEXT_PUBLIC_REGION: read(() => process.env.NEXT_PUBLIC_REGION),
  };
}

/** The market this deployment serves. `"unknown"` when nothing is set. */
export function detectMarket(env: MarketEnv = processMarketEnv()): MarketRegion {
  for (const key of MARKET_ENV_KEYS) {
    const parsed = parseMarket(env[key]);
    if (parsed) return parsed;
  }
  return "unknown";
}

/** `true` for mainland China only; HK/MO/TW has different rails and rules. */
export function isMainlandMarket(env?: MarketEnv): boolean {
  return detectMarket(env) === "cn-mainland";
}
