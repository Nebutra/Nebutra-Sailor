/**
 * Types for the parts of `generate-frontier-models.mjs` that TypeScript imports.
 *
 * Only `TIER_MATCHERS` is consumed — by `frontier-rules-parity.test.ts`, which
 * checks that the generator selects by the same patterns the runtime resolver
 * uses. The rest of the script is a CLI and has no TS callers.
 */

export declare const TIER_MATCHERS: Record<string, { include: string; exclude: string }>;
