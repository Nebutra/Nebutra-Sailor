/**
 * POST /api/license/verify
 *
 * Verifies a posted `scaffold-meta.json` against the scaffold-marker
 * signing-key registry. Returns the same shape as `nebutra license verify`:
 *
 *   { valid, tier, cliVersion, scaffoldedAt, projectName, reason }
 *
 * Useful for the marketing site to render a "Verify your license" widget
 * — paste the JSON, get a green/red answer.
 *
 * Phase 2 STUB: this route deliberately duplicates the verifier inline
 * so the landing bundle stays self-contained (no workspace import
 * from `create-sailor` or `nebutra`-cli, both of which are binary
 * packages). If we add a shared verification library later, replace the
 * inline implementation with that import.
 *
 * Source-of-truth cross-reference:
 *   packages/ops/create-sailor/src/utils/license-emit.ts
 *   packages/ops/create-sailor/src/utils/license-signing-keys.ts
 *   packages/ops/cli/src/utils/scaffold-meta-verify.ts
 */

import { createHmac } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// ──────────────────────────────────────────────────────────────────────
// Mirror of the signing-key registry. Must stay in sync with:
//   packages/ops/create-sailor/src/utils/license-signing-keys.ts
// (drift caught by tests in those packages, not here — this route is a
// passive reader.)
// ──────────────────────────────────────────────────────────────────────
const KEYS = [{ id: "v1", key: "nebutra-sailor:scaffold-marker:v1" }] as const;
const FALLBACK_KEY_ID = "v1";

const ScaffoldMetaSchema = z.object({
  schemaVersion: z.literal(1),
  cliVersion: z.string(),
  scaffoldedAt: z.string(),
  projectName: z.string(),
  nonce: z.string(),
  signature: z.string(),
  signingKeyId: z.string().optional(),
  purpose: z.string().optional(),
  license: z
    .object({
      tier: z.literal("independent"),
      file: z.string(),
      upgradeUrl: z.string(),
    })
    .optional(),
});

type VerifyReason = "ok" | "schema_mismatch" | "unknown_signing_key" | "signature_mismatch";

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

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        valid: false,
        reason: "schema_mismatch",
        message: "Request body is not valid JSON.",
      },
      { status: 400 },
    );
  }

  const parsed = ScaffoldMetaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        valid: false,
        tier: null,
        cliVersion: null,
        scaffoldedAt: null,
        projectName: null,
        reason: "schema_mismatch" as VerifyReason,
        message: "scaffold-meta.json does not match the expected schema.",
      },
      { status: 200 }, // verification result, not a request error
    );
  }

  const meta = parsed.data;
  const keyId = meta.signingKeyId ?? FALLBACK_KEY_ID;
  const signingKey = KEYS.find((k) => k.id === keyId);

  if (!signingKey) {
    return NextResponse.json({
      valid: false,
      tier: meta.license?.tier ?? null,
      cliVersion: meta.cliVersion,
      scaffoldedAt: meta.scaffoldedAt,
      projectName: meta.projectName,
      signingKeyId: keyId,
      reason: "unknown_signing_key" as VerifyReason,
    });
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
  const valid = expected === meta.signature;

  return NextResponse.json({
    valid,
    tier: meta.license?.tier ?? null,
    cliVersion: meta.cliVersion,
    scaffoldedAt: meta.scaffoldedAt,
    projectName: meta.projectName,
    signingKeyId: keyId,
    reason: (valid ? "ok" : "signature_mismatch") as VerifyReason,
  });
}

// GET returns a small description so curl-poking the endpoint is friendly.
export async function GET() {
  return NextResponse.json({
    name: "Nebutra-Sailor license verifier",
    method: "POST",
    contentType: "application/json",
    body: "Paste your project's `.nebutra/scaffold-meta.json` as the request body.",
    docs: "https://github.com/Nebutra/Nebutra-Sailor/blob/main/docs/legal/CLA.md",
  });
}
