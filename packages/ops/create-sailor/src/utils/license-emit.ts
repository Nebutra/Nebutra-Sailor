import { createHmac, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findKeyById, getCurrentKey } from "./license-signing-keys";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCAFFOLD_META_FILENAME = "scaffold-meta.json";
const SCAFFOLD_META_DIR = ".nebutra";

/**
 * Phase 2: the signing key is no longer hardcoded here — it lives in
 * `./license-signing-keys.ts` so future create-sailor releases can rotate
 * the key without breaking verification of older scaffolds.
 *
 * Back-compat: scaffold-meta.json files emitted by Phase 1 do NOT have a
 * `signingKeyId` field. `verifyScaffoldMeta` falls back to the `v1` key when
 * the field is absent (see VERIFY_FALLBACK_KEY_ID).
 */
const VERIFY_FALLBACK_KEY_ID = "v1";

export interface LicenseEmitOptions {
  projectName: string;
  cliVersion: string;
  /**
   * Where to look for the LICENSE-SCAFFOLD.md template. Defaults to the
   * template that ships inside create-sailor.
   */
  templatesRoot?: string;
}

function resolveTemplatesRoot(explicit?: string): string {
  if (explicit) return explicit;
  const candidates = [
    path.join(__dirname, "..", "templates"),
    path.join(__dirname, "..", "..", "templates"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

export interface ScaffoldMeta {
  schemaVersion: 1;
  cliVersion: string;
  scaffoldedAt: string;
  projectName: string;
  nonce: string;
  /**
   * HMAC over `cliVersion|scaffoldedAt|projectName|nonce`. Lets future tools
   * verify that this project was scaffolded by an official CLI release.
   */
  signature: string;
  /**
   * ID of the signing key in `license-signing-keys.ts` that produced
   * `signature`. Added in Phase 2 (create-sailor >= 1.7.1). When absent
   * (Phase 1 markers), verification assumes "v1".
   */
  signingKeyId?: string;
  /**
   * Marker explaining what this file does — so a human reading the repo
   * understands its purpose.
   */
  purpose: string;
  license: {
    /**
     * `mit-scaffold` since 2026-07-26. `independent` is the legacy value
     * emitted by create-sailor <= 1.8.2, when scaffolded projects carried the
     * now-retired Independent Developer License. Verifiers must keep accepting
     * it — those projects exist and their marker files are signed and valid.
     */
    tier: "mit-scaffold" | "independent";
    file: "LICENSE";
    upgradeUrl: string;
  };
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

/**
 * Emit the scaffolded project's MIT LICENSE + the
 * `.nebutra/scaffold-meta.json` marker into the scaffold target.
 *
 * Behaviour:
 *  - Writes `LICENSE` (MIT) — overwrites the upstream repository licence,
 *    because the scaffolded project is MIT, not FSL. Scaffolded output is
 *    distributed as part of the MIT-published `create-sailor` package.
 *  - Preserves the upstream licence text at `LICENSE-UPSTREAM-REFERENCE.md`
 *    so users can read the terms the monorepo itself is under.
 *  - Writes `.nebutra/scaffold-meta.json` with version + timestamp + HMAC,
 *    signed with the CURRENT key from `license-signing-keys.ts`.
 *  - Adds a one-line license notice at the top of the project's README.
 */
export function emitScaffoldLicense(
  targetDir: string,
  options: LicenseEmitOptions,
): { wrote: string[] } {
  const wrote: string[] = [];
  const templatesRoot = resolveTemplatesRoot(options.templatesRoot);

  // 1. Move the upstream repository licence aside (only if it exists). The
  // scaffolded project is MIT; the upstream terms (FSL today, AGPL for
  // pre-2026-07-26 checkouts) become a reference document for users who want
  // to know what the monorepo itself is under.
  const upstreamLicense = path.join(targetDir, "LICENSE");
  if (fs.existsSync(upstreamLicense)) {
    const head = fs.readFileSync(upstreamLicense, "utf-8").slice(0, 256);
    const looksUpstream =
      /GNU AFFERO GENERAL PUBLIC LICENSE/i.test(head) || /Functional Source License/i.test(head);
    if (looksUpstream) {
      fs.renameSync(upstreamLicense, path.join(targetDir, "LICENSE-UPSTREAM-REFERENCE.md"));
      wrote.push("LICENSE-UPSTREAM-REFERENCE.md (preserved upstream licence)");
    }
  }

  // 2. Write the scaffolded project's MIT LICENSE.
  const scaffoldSrc = path.join(templatesRoot, "LICENSE-SCAFFOLD.md");
  if (!fs.existsSync(scaffoldSrc)) {
    throw new Error(`LICENSE-SCAFFOLD.md template missing at ${scaffoldSrc}; cannot emit license.`);
  }
  fs.copyFileSync(scaffoldSrc, path.join(targetDir, "LICENSE"));
  wrote.push("LICENSE");

  // 3. Write the signed scaffold marker.
  const scaffoldedAt = new Date().toISOString();
  const nonce = randomBytes(12).toString("hex");
  const currentKey = getCurrentKey();
  const signature = computeSignature(
    {
      cliVersion: options.cliVersion,
      scaffoldedAt,
      projectName: options.projectName,
      nonce,
    },
    currentKey.key,
  );
  const meta: ScaffoldMeta = {
    schemaVersion: 1,
    cliVersion: options.cliVersion,
    scaffoldedAt,
    projectName: options.projectName,
    nonce,
    signature,
    signingKeyId: currentKey.id,
    purpose:
      "Marks this project as scaffolded by the official `create-sailor` CLI. Provenance only — the MIT licence in LICENSE applies unconditionally and does not depend on this file or its signature.",
    license: {
      tier: "mit-scaffold",
      file: "LICENSE",
      upgradeUrl: "https://nebutra.com/get-license",
    },
  };
  const metaDir = path.join(targetDir, SCAFFOLD_META_DIR);
  fs.mkdirSync(metaDir, { recursive: true });
  fs.writeFileSync(
    path.join(metaDir, SCAFFOLD_META_FILENAME),
    `${JSON.stringify(meta, null, 2)}\n`,
  );
  wrote.push(`${SCAFFOLD_META_DIR}/${SCAFFOLD_META_FILENAME}`);

  // 4. Inject a license notice at the top of README.md if one exists. We
  // skip silently if the file is missing — scaffolders may emit READMEs
  // later in the flow.
  const readmePath = path.join(targetDir, "README.md");
  if (fs.existsSync(readmePath)) {
    const existing = fs.readFileSync(readmePath, "utf-8");
    if (!existing.includes("Scaffolded by `create-sailor`")) {
      const notice = `> **License notice:** Scaffolded by \`create-sailor\`. The Nebutra-Sailor
> code in this project is [MIT licensed](./LICENSE) — commercial use, closed
> source, no fee, no attribution required. The upstream monorepo is
> FSL-1.1-ALv2 — see \`LICENSE-UPSTREAM-REFERENCE.md\`.\n\n`;
      fs.writeFileSync(readmePath, notice + existing);
      wrote.push("README.md (prepended license notice)");
    }
  }

  return { wrote };
}

/**
 * Reasons a verification can fail. Useful for the CLI's `license verify`
 * command and the marketing-site verification endpoint.
 */
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

/**
 * Detailed verification — preferred for new callers. Returns `{ valid,
 * reason }` so the CLI can show a precise diagnostic.
 */
export function verifyScaffoldMetaDetailed(meta: ScaffoldMeta | null | undefined): VerifyResult {
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
 * Verify a scaffold marker's signature. Returns true when the marker is
 * present, well-formed, and signed with a known key.
 *
 * Kept for backward compatibility with Phase 1 callers — new code should
 * prefer `verifyScaffoldMetaDetailed`.
 */
export function verifyScaffoldMeta(meta: ScaffoldMeta | null | undefined): boolean {
  return verifyScaffoldMetaDetailed(meta).valid;
}
