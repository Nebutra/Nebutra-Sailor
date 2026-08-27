import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

// Fixture tests for the config-driven brand-literal lint engine.
// Proves:
//   (a) a new brand literal in a governed path → exit 1
//   (b) a file in the allowlist → exit 0 (grandfathered)
//   (c) a stale allowlist entry (file no longer has literals) → exit 1

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Repo root: tests/architecture/governance → up 3 levels.
const REPO_ROOT = path.resolve(__dirname, "../../..");
const ENGINE_PATH = path.join(REPO_ROOT, "scripts/governance/lint-brand-literals.mjs");

interface RunResult {
  status: number;
  stdout: string;
  stderr: string;
}

function runEngine(cwd: string): RunResult {
  try {
    const stdout = execFileSync("node", [ENGINE_PATH], {
      cwd,
      encoding: "utf-8",
      env: { ...process.env, LANG: "en_US.UTF-8", LC_ALL: "en_US.UTF-8" },
    });
    return { status: 0, stdout, stderr: "" };
  } catch (error) {
    const e = error as { status?: number; stdout?: string; stderr?: string };
    return { status: e.status ?? 1, stdout: e.stdout ?? "", stderr: e.stderr ?? "" };
  }
}

function writeFile(dir: string, relPath: string, contents: string) {
  const full = path.join(dir, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, contents, "utf-8");
}

function writeGovernance(dir: string, cfg: Record<string, unknown>) {
  fs.writeFileSync(
    path.join(dir, "governance.config.json"),
    JSON.stringify(cfg, null, 2) + "\n",
    "utf-8",
  );
}

describe("lint-brand-literals engine (fixture tests)", () => {
  let targetDir: string | undefined;

  afterEach(() => {
    if (targetDir) {
      fs.rmSync(targetDir, { force: true, recursive: true });
      targetDir = undefined;
    }
  });

  it("(a) new brand literal in governed path → exit 1", () => {
    targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "brand-lit-new-"));
    // File in apps/ (governed) with a raw "Nebutra" literal.
    writeFile(
      targetDir,
      "apps/web/src/app/page.tsx",
      `export default function Page() {
  return <h1>Nebutra Dashboard</h1>;
}
`,
    );
    // Empty allowlist — this file is NOT grandfathered.
    writeGovernance(targetDir, {
      brandLiterals: { allowlist: [] },
    });

    const result = runEngine(targetDir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("apps/web/src/app/page.tsx");
  });

  it("(b) allowlisted file with brand literal → exit 0 (grandfathered)", () => {
    targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "brand-lit-allow-"));
    writeFile(
      targetDir,
      "apps/web/src/app/page.tsx",
      `export default function Page() {
  return <h1>Nebutra Dashboard</h1>;
}
`,
    );
    // Allowlist contains the file — it is grandfathered.
    writeGovernance(targetDir, {
      brandLiterals: { allowlist: ["apps/web/src/app/page.tsx"] },
    });

    const result = runEngine(targetDir);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("brand-literals");
  });

  it("(c) stale allowlist entry (file migrated, no longer has literals) → exit 1", () => {
    targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "brand-lit-stale-"));
    // File has been migrated — no raw brand literals remaining.
    writeFile(
      targetDir,
      "apps/web/src/app/page.tsx",
      `import { brand } from "@nebutra/brand/metadata";
export default function Page() {
  return <h1>{brand.name} Dashboard</h1>;
}
`,
    );
    // Allowlist still contains the migrated file — stale entry.
    writeGovernance(targetDir, {
      brandLiterals: { allowlist: ["apps/web/src/app/page.tsx"] },
    });

    const result = runEngine(targetDir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("apps/web/src/app/page.tsx");
  });
});
