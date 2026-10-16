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
   * Where to look for the LICENSE-APACHE-2.0.txt template. Defaults to the
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

/** The verbatim Apache-2.0 text bundled with create-sailor. */
export const LICENSE_TEMPLATE_FILENAME = "LICENSE-APACHE-2.0.txt";

/**
 * `.nebutra/scaffold-meta.json` — an unsigned provenance breadcrumb.
 *
 * Until 2026-07-26 this file was HMAC-signed, because its presence and a valid
 * signature were what conferred the Independent Developer License instead of
 * AGPL copyleft. The marker has granted nothing since then: scaffolded
 * projects were MIT unconditionally from 2026-07-26 and are Apache-2.0
 * unconditionally from 2026-10-16 (ADR 2026-10-16 apache-2-relicense).
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
     * `apache-2.0` since 2026-10-16. Legacy values readers should still
     * accept: `mit-scaffold` (2026-07-26 → 2026-10-16) and `independent`
     * (create-sailor <= 1.8.2, the retired Independent Developer License).
     */
    tier: "apache-2.0" | "mit-scaffold" | "independent";
    file: "LICENSE";
  };
}

/**
 * The scaffolded project's `NOTICE`. Apache-2.0 §4(d) asks redistributors of
 * the source to carry the upstream attribution notices; this file is where
 * they live, and the project's own copyright line can be added above them.
 */
export function scaffoldNotice(projectName: string, cliVersion: string): string {
  return `${projectName}

This project was scaffolded with create-sailor ${cliVersion} from Nebutra Sailor.

Nebutra Sailor
Copyright 2025-2026 无锡云毓智能科技有限公司 (Wuxi Nebutra Intelligence Technology Co., Ltd.)
Licensed under the Apache License, Version 2.0 (see LICENSE).

"Nebutra" and "Sailor" are trademarks of 无锡云毓智能科技有限公司. The Apache
License does not grant permission to use them (section 6). Building and
selling your own product on this code, under your own name, needs no
permission.
`;
}

/**
 * Emit the scaffolded project's Apache-2.0 LICENSE + NOTICE and the
 * `.nebutra/scaffold-meta.json` marker into the scaffold target.
 *
 * Behaviour:
 *  - Writes `LICENSE` — the verbatim Apache-2.0 text, so GitHub and licence
 *    scanners detect it. Overwrites whatever the template carried: a mirror
 *    synced before 2026-10-16 still carries FSL text, and the project is
 *    Apache-2.0 regardless of which mirror it came from.
 *  - Writes `NOTICE` with the Nebutra Sailor attribution.
 *  - Removes licence files from earlier models (`LICENSE-COMMERCIAL.md`,
 *    `NOTICE.md`, `LICENSE-UPSTREAM-REFERENCE.md`) so the project root states
 *    one set of terms.
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

  // 1. Retire licence files from earlier models. A pre-2026-10-16 mirror
  // ships LICENSE-COMMERCIAL.md and an injected NOTICE.md; neither describes
  // terms this project is under.
  for (const legacy of ["LICENSE-COMMERCIAL.md", "NOTICE.md", "LICENSE-UPSTREAM-REFERENCE.md"]) {
    const legacyPath = path.join(targetDir, legacy);
    if (fs.existsSync(legacyPath)) {
      fs.rmSync(legacyPath);
      wrote.push(`${legacy} (removed — the project is Apache-2.0)`);
    }
  }

  // 2. Write the Apache-2.0 LICENSE and the NOTICE.
  const licenseSrc = path.join(templatesRoot, LICENSE_TEMPLATE_FILENAME);
  if (!fs.existsSync(licenseSrc)) {
    throw new Error(
      `${LICENSE_TEMPLATE_FILENAME} template missing at ${licenseSrc}; cannot emit license.`,
    );
  }
  fs.copyFileSync(licenseSrc, path.join(targetDir, "LICENSE"));
  wrote.push("LICENSE");
  fs.writeFileSync(
    path.join(targetDir, "NOTICE"),
    scaffoldNotice(options.projectName, options.cliVersion),
  );
  wrote.push("NOTICE");

  // 3. Write the provenance marker. Unsigned by design — see ScaffoldMeta.
  const meta: ScaffoldMeta = {
    schemaVersion: 1,
    cliVersion: options.cliVersion,
    scaffoldedAt: new Date().toISOString(),
    projectName: options.projectName,
    purpose:
      "Records which `create-sailor` version produced this project, for support triage. Provenance only: the Apache-2.0 licence in LICENSE applies unconditionally and does not depend on this file. Deleting it costs you nothing.",
    license: {
      tier: "apache-2.0",
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
  if (prependReadmeLicenseNotice(targetDir)) {
    wrote.push("README.md (prepended license notice)");
  }

  return { wrote };
}

/**
 * The one-line license notice at the top of README.md. Idempotent; returns
 * whether it wrote. Re-run after anything regenerates the README
 * (`brand:apply` renders it from README.template.md).
 */
export function prependReadmeLicenseNotice(targetDir: string): boolean {
  const readmePath = path.join(targetDir, "README.md");
  if (!fs.existsSync(readmePath)) return false;
  const existing = fs.readFileSync(readmePath, "utf-8");
  if (existing.includes("Scaffolded by `create-sailor`")) return false;
  const notice = `> **License notice:** Scaffolded by \`create-sailor\` from Nebutra Sailor, which
> is [Apache-2.0](./LICENSE) — commercial use, closed source, no fee. Keep
> \`LICENSE\` and \`NOTICE\` when you redistribute the source.\n\n`;
  fs.writeFileSync(readmePath, notice + existing);
  return true;
}
