/**
 * Scaffold-marker signing-key registry (Phase 2 of the dual-license model).
 *
 * The first entry (`KEYS[0]`) is ALWAYS the current signing key — new
 * scaffold-meta files are signed with it and record its `id` in
 * `meta.signingKeyId`. Older entries stay in the array so that
 * `verifyScaffoldMeta` can still validate markers emitted by prior releases.
 *
 * Adding a new key (rotation):
 *  1. PREPEND a new entry at index 0 with a fresh `id` (e.g. `v2`, `v3`, ...).
 *  2. Set `retiredAt` on the previously-current entry (now at index 1).
 *  3. Bump `create-sailor` minor — new scaffolds use the new key; old
 *     `scaffold-meta.json` files continue to verify because the registry
 *     still contains the retired key.
 *  4. NEVER remove an entry whose `retiredAt` is unset OR less than ~2 years
 *     ago — doing so would break verification of every project scaffolded
 *     under that key.
 *
 * Why a "secret" in source? This is a public marker, not a credential — it
 * proves the marker was emitted by an official release of `create-sailor`.
 * Rotation is about defence-in-depth (e.g. retiring a key whose semantics
 * change), not secret hygiene.
 *
 * Cross-reference: `license-emit.ts` reads from this module. The CLI's
 * `nebutra license verify` command also imports from here.
 */

export interface SigningKey {
  /** Stable identifier embedded in scaffold-meta.json as `signingKeyId`. */
  id: string;
  /** HMAC-SHA256 key. Treat as semi-public (see file header). */
  key: string;
  /**
   * ISO-8601 timestamp when this key stopped being used for new signatures.
   * Absent on the current key (index 0). Present on every retired key.
   */
  retiredAt?: string;
}

/**
 * Ordered registry. Index 0 is the CURRENT signing key.
 * Append (or rather, prepend) only — never remove an active or recently
 * retired entry.
 */
export const KEYS: readonly SigningKey[] = [
  {
    id: "v1",
    key: "nebutra-sailor:scaffold-marker:v1",
  },
];

/** Returns the key currently used to sign new scaffold markers. */
export function getCurrentKey(): SigningKey {
  const current = KEYS[0];
  if (!current) {
    throw new Error("license-signing-keys: registry is empty — at least one key is required.");
  }
  return current;
}

/**
 * Look up a key by id. Returns `undefined` for unknown ids so callers can
 * surface a clear "unknown signing key" error rather than crashing.
 */
export function findKeyById(id: string | undefined): SigningKey | undefined {
  if (!id) return undefined;
  return KEYS.find((k) => k.id === id);
}
