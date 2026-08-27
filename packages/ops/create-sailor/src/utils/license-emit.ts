import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCAFFOLD_META_FILENAME = "scaffold-meta.json";
const SCAFFOLD_META_DIR = ".nebutra";

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

/**
 * `.nebutra/scaffold-meta.json` — an unsigned provenance breadcrumb.
 *
 * Until 2026-07-26 this file was HMAC-signed, because its presence and a valid
 * signature were what conferred the Independent Developer License instead of
 * AGPL copyleft. Scaffolded projects are now MIT unconditionally, so the
 * marker grants nothing, gates nothing, and is worthless to forge. The
 * signature, nonce and key registry were removed along with the tier they
 * protected.
 *
 * What is left is useful for support triage — "which CLI version produced
 * this project, and when" — and nothing else. Deleting the file costs the
 * project no rights.
 *
 * Markers written by create-sailor <= 1.8.4 additionally carry `signature`,
 * `nonce` and `signingKeyId`. Those fields are ignored, not rejected.
 */
export interface ScaffoldMeta {
  schemaVersion: 1;
  cliVersion: string;
  scaffoldedAt: string;
  projectName: string;
  /** Explains the file to whoever finds it in the repo. */
  purpose: string;
  license: {
    /**
     * `mit-scaffold` since 2026-07-26. `independent` is the legacy value from
     * create-sailor <= 1.8.2, when scaffolded projects carried the retired
     * Independent Developer License. Readers should accept both.
     */
    tier: "mit-scaffold" | "independent";
    file: "LICENSE";
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
 *  - Writes `.nebutra/scaffold-meta.json` with version + timestamp. Unsigned
 *    by design — it grants no rights, so there is nothing to protect.
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

  // 3. Write the provenance marker. Unsigned by design — see ScaffoldMeta.
  const meta: ScaffoldMeta = {
    schemaVersion: 1,
    cliVersion: options.cliVersion,
    scaffoldedAt: new Date().toISOString(),
    projectName: options.projectName,
    purpose:
      "Records which `create-sailor` version produced this project, for support triage. Provenance only: the MIT licence in LICENSE applies unconditionally and does not depend on this file. Deleting it costs you nothing.",
    license: {
      tier: "mit-scaffold",
      file: "LICENSE",
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
