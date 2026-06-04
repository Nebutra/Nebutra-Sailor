import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

// Fixture test for the generalized, config-driven `lint-repository-seam` script
// (gate: database) that create-sailor ships into scaffolded projects. Proves it:
//   (a) passes on a clean fixture (no core-domain ORM bypass),
//   (b) catches an injected violation (direct ORM access in a core domain),
//   (c) honors governance.config.json — custom dbAccessors, an allowlist'd
//       bypass passes (shrink-only), a listed-but-fixed bypass fails,
//       and the // @seam-exempt escape hatch is preserved,
//   (d) falls back to scaffold-layout defaults when config is absent.

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Repo root: packages/ops/create-sailor/src/steps/__tests__ → up 6 levels.
const REPO_ROOT = path.resolve(__dirname, "../../../../../..");
const LINT_SCRIPT = path.join(REPO_ROOT, "scripts/governance/lint-repository-seam.mjs");

interface RunResult {
  status: number;
  stdout: string;
  stderr: string;
}

/** Run the generalized lint with the fixture dir as cwd (where it reads config + greps). */
function runLint(cwd: string): RunResult {
  try {
    const stdout = execFileSync("node", [LINT_SCRIPT], { cwd, encoding: "utf-8" });
    return { status: 0, stdout, stderr: "" };
  } catch (error) {
    const e = error as { status?: number; stdout?: string; stderr?: string };
    return { status: e.status ?? 1, stdout: e.stdout ?? "", stderr: e.stderr ?? "" };
  }
}

function writeFile(dir: string, relPath: string, contents: string) {
  const full = path.join(dir, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, contents);
}

// A core-domain path that the default coreDomains regexes match.
const CORE_FILE = "packages/commerce/billing/src/service.ts";

describe("generalized lint-repository-seam (config-driven, gate: database)", () => {
  let targetDir: string | undefined;

  afterEach(() => {
    if (targetDir) {
      fs.rmSync(targetDir, { force: true, recursive: true });
      targetDir = undefined;
    }
  });

  it("(a) passes on a clean fixture — core domain uses the seam, no direct ORM", () => {
    targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "seam-lint-clean-"));
    // Core-domain file references getTenantDb (so grep finds it) but routes
    // through a repository — no direct .findMany()/.create() etc.
    writeFile(
      targetDir,
      CORE_FILE,
      `import { getTenantDb } from "@nebutra/db";
import { invoiceRepository } from "@nebutra/repositories";
export async function listInvoices() {
  const db = getTenantDb();
  return invoiceRepository(db).list();
}
`,
    );
    // A non-core file with direct ORM access is intentionally ungoverned.
    writeFile(
      targetDir,
      "apps/web/src/lib/cms.ts",
      `import { getTenantDb } from "@nebutra/db";
export const posts = () => getTenantDb().post.findMany();
`,
    );

    const result = runLint(targetDir);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("repository-seam");
    expect(result.stdout).toContain("0 new");
  });

  it("(b) catches an injected violation — direct ORM access in a core domain", () => {
    targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "seam-lint-violation-"));
    writeFile(
      targetDir,
      CORE_FILE,
      `import { getTenantDb } from "@nebutra/db";
export async function listInvoices() {
  return getTenantDb().invoice.findMany();
}
`,
    );

    const result = runLint(targetDir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Repository-seam violation");
    expect(result.stderr).toContain(CORE_FILE);
  });

  it("(b2) the // @seam-exempt escape hatch suppresses a core-domain violation", () => {
    targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "seam-lint-exempt-"));
    writeFile(
      targetDir,
      CORE_FILE,
      `// @seam-exempt: raw SQL migration backfill
import { getTenantDb } from "@nebutra/db";
export async function backfill() {
  return getTenantDb().$executeRaw\`UPDATE invoice SET x = 1\`;
}
`,
    );

    const result = runLint(targetDir);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("repository-seam");
  });

  it("(c) honors an allowlist'd bypass (shrink-only) → passes", () => {
    targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "seam-lint-allow-"));
    writeFile(
      targetDir,
      "governance.config.json",
      JSON.stringify({ repositorySeam: { allowlist: [CORE_FILE] } }, null, 2),
    );
    writeFile(
      targetDir,
      CORE_FILE,
      `import { getTenantDb } from "@nebutra/db";
export const x = () => getTenantDb().invoice.findMany();
`,
    );

    const result = runLint(targetDir);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("1 known core-domain bypass");
  });

  it("(c2) a listed-but-fixed bypass fails (shrink-only ratchet)", () => {
    targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "seam-lint-fixed-"));
    // allowlist references a file that no longer bypasses → must fail.
    writeFile(
      targetDir,
      "governance.config.json",
      JSON.stringify({ repositorySeam: { allowlist: [CORE_FILE] } }, null, 2),
    );
    // The core file now routes through the seam (no direct ORM op).
    writeFile(
      targetDir,
      CORE_FILE,
      `import { getTenantDb } from "@nebutra/db";
import { invoiceRepository } from "@nebutra/repositories";
export const x = () => invoiceRepository(getTenantDb()).list();
`,
    );

    const result = runLint(targetDir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("no longer bypass the seam");
    expect(result.stderr).toContain(CORE_FILE);
  });

  it("(c3) honors a custom dbAccessor name from config", () => {
    targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "seam-lint-accessor-"));
    writeFile(
      targetDir,
      "governance.config.json",
      JSON.stringify({ repositorySeam: { dbAccessors: ["getOrgDb"] } }, null, 2),
    );
    // Uses the renamed accessor + direct ORM access in a core domain → caught.
    writeFile(
      targetDir,
      CORE_FILE,
      `import { getOrgDb } from "@acme/db";
export const x = () => getOrgDb().invoice.findMany();
`,
    );

    const result = runLint(targetDir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(CORE_FILE);
  });

  it("(d) falls back to scaffold-layout defaults when governance.config.json is absent", () => {
    targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "seam-lint-default-"));
    // No config file. Default coreDomains match a gateway billing route; default
    // dbAccessors include getTenantDb; empty allowlist → any bypass is NEW.
    writeFile(
      targetDir,
      "backends/gateway/src/routes/billing/index.ts",
      `import { getTenantDb } from "@nebutra/db";
export const handler = () => getTenantDb().subscription.update({ where: {}, data: {} });
`,
    );

    const result = runLint(targetDir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("backends/gateway/src/routes/billing/index.ts");
  });
});
