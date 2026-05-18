/**
 * Scaffold-meta HMAC verifier — used by `nebutra license verify`.
 *
 * SOURCE OF TRUTH:
 *   packages/ops/create-sailor/src/utils/license-emit.ts
 *   packages/ops/create-sailor/src/utils/license-signing-keys.ts
 *
 * This file is a DELIBERATE DUPLICATE of the verifier + key registry.
 * The CLI cannot import from `create-sailor` because:
 *   1. create-sailor is a published npm binary (no library exports, dts:false).
 *   2. Adding a workspace dep would pull the CLI's entire scaffolder graph
 *      into the CLI bundle.
 *
 * When rotating keys (see docs/legal/rotating-the-scaffold-key.md):
 *   1. Add the new entry to the registry in create-sailor's
 *      license-signing-keys.ts FIRST.
 *   2. Mirror the change here (prepend identical {id, key} entry).
 *   3. Both packages MUST agree on (a) the canonical signature input format
 *      and (b) the key registry. A drift would silently break verification.
 *
 * A unit test in tests/license-verify.test.ts pins the v1 key + canonical
 * string format so accidental drift is caught at test time.
 */

import { createHmac } from "node:crypto";

// ──────────────────────────────────────────────────────────────────────
// Registry (mirror of create-sailor/src/utils/license-signing-keys.ts)
// ──────────────────────────────────────────────────────────────────────

export interface SigningKey {
  id: string;
  key: string;
  retiredAt?: string;
}

/** Index 0 is the current key; later entries are retired but still verify. */
export const KEYS: readonly SigningKey[] = [
  {
    id: "v1",
    key: "nebutra-sailor:scaffold-marker:v1",
  },
];

const VERIFY_FALLBACK_KEY_ID = "v1";

function findKeyById(id: string | undefined): SigningKey | undefined {
  if (!id) return undefined;
  return KEYS.find((k) => k.id === id);
}

// ──────────────────────────────────────────────────────────────────────
// Meta shape (mirror of create-sailor's ScaffoldMeta)
// ──────────────────────────────────────────────────────────────────────

export interface ScaffoldMeta {
  schemaVersion: 1;
  cliVersion: string;
  scaffoldedAt: string;
  projectName: string;
  nonce: string;
  signature: string;
  signingKeyId?: string;
  purpose?: string;
  license?: {
    tier: "independent";
    file: string;
    upgradeUrl: string;
  };
}

export type VerifyReason =
  | "ok"
  | "missing_meta"
  | "schema_mismatch"
  | "unknown_signing_key"
  | "signature_mismatch";

export interface VerifyResult {
  valid: boolean;
  reason: VerifyReason;
}

function computeSignature(
  payload: {
    cliVersion: string;
    scaffoldedAt: string;
    projectName: string;
    nonce: string;
  },
  signingKey: string,
): string {
  const canonical = `${payload.cliVersion}|${payload.scaffoldedAt}|${payload.projectName}|${payload.nonce}`;
  return createHmac("sha256", signingKey).update(canonical).digest("hex");
}

export function verifyScaffoldMeta(meta: ScaffoldMeta | null | undefined): VerifyResult {
  if (!meta) return { valid: false, reason: "missing_meta" };
  if (meta.schemaVersion !== 1) return { valid: false, reason: "schema_mismatch" };
  if (
    typeof meta.cliVersion !== "string" ||
    typeof meta.scaffoldedAt !== "string" ||
    typeof meta.projectName !== "string" ||
    typeof meta.nonce !== "string" ||
    typeof meta.signature !== "string"
  ) {
    return { valid: false, reason: "schema_mismatch" };
  }
  const keyId = meta.signingKeyId ?? VERIFY_FALLBACK_KEY_ID;
  const signingKey = findKeyById(keyId);
  if (!signingKey) {
    return { valid: false, reason: "unknown_signing_key" };
  }
  const expected = computeSignature(
    {
      cliVersion: meta.cliVersion,
      scaffoldedAt: meta.scaffoldedAt,
      projectName: meta.projectName,
      nonce: meta.nonce,
    },
    signingKey.key,
  );
  if (expected !== meta.signature) {
    return { valid: false, reason: "signature_mismatch" };
  }
  return { valid: true, reason: "ok" };
}

/**
 * Human-readable reason text for the plain-output format of
 * `nebutra license verify`.
 */
export const REASON_TEXT: Record<VerifyReason, string> = {
  ok: "valid",
  missing_meta: ".nebutra/scaffold-meta.json not found",
  schema_mismatch: "scaffold-meta.json schema mismatch (corrupt or future format)",
  unknown_signing_key:
    "signed with an unknown key — upgrade `nebutra` to a newer release that recognises it",
  signature_mismatch: "signature does not match — file has been tampered with or hand-edited",
};
