import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

// Fixture tests for the config-driven microcopy 七禁令 lint engine.
// Proves:
//   (a) a new violation in a governed path => exit 1
//   (b) an allowlisted file with a violation => exit 0 (grandfathered)
//   (c) a stale allowlist entry (file migrated, no longer has violations) => exit 1
//   (d) @microcopy-exempt hatch suppresses enforcement => exit 0

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Repo root: tests/architecture/governance -> up 3 levels.
const REPO_ROOT = path.resolve(__dirname, "../../..");
const ENGINE_PATH = path.join(REPO_ROOT, "scripts/governance/lint-microcopy.mjs");

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

const BASE_CONFIG = {
  microcopyRules: {
    scanRoots: ["apps/web/src"],
    excludePaths: ["/api/", "\\.test\\.tsx?$", "/__tests__/"],
    bannedPatterns: [
      { pattern: "No [A-Za-z].*(yet|available)", label: "禁七: empty state lacks a 母题" },
      { pattern: "暂无", label: "禁七: 空白状态禁用「暂无」" },
    ],
    allowlist: [],
  },
};

describe("lint-microcopy engine (fixture tests)", () => {
  let targetDir: string | undefined;

  afterEach(() => {
    if (targetDir) {
      fs.rmSync(targetDir, { force: true, recursive: true });
      targetDir = undefined;
    }
  });

  it("(a) new violation in governed path => exit 1", () => {
    targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "mc-new-"));
    writeFile(
      targetDir,
      "apps/web/src/components/empty-state.tsx",
      `export function EmptyState() {
  return <p>No items yet.</p>;
}
`,
    );
    writeGovernance(targetDir, { ...BASE_CONFIG });

    const result = runEngine(targetDir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("apps/web/src/components/empty-state.tsx");
  });

  it("(b) allowlisted file with violation => exit 0 (grandfathered)", () => {
    targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "mc-allow-"));
    writeFile(
      targetDir,
      "apps/web/src/components/empty-state.tsx",
      `export function EmptyState() {
  return <p>No items yet.</p>;
}
`,
    );
    writeGovernance(targetDir, {
      microcopyRules: {
        ...BASE_CONFIG.microcopyRules,
        allowlist: ["apps/web/src/components/empty-state.tsx"],
      },
    });

    const result = runEngine(targetDir);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("microcopy:");
  });

  it("(c) stale allowlist entry (file migrated, no violations) => exit 1", () => {
    targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "mc-stale-"));
    // File has been migrated — no banned patterns remaining.
    writeFile(
      targetDir,
      "apps/web/src/components/empty-state.tsx",
      `import { useTranslations } from "next-intl";
export function EmptyState() {
  const t = useTranslations("startupOs.emptyState");
  return <p>{t("items")}</p>;
}
`,
    );
    // Allowlist still contains the migrated file — stale entry.
    writeGovernance(targetDir, {
      microcopyRules: {
        ...BASE_CONFIG.microcopyRules,
        allowlist: ["apps/web/src/components/empty-state.tsx"],
      },
    });

    const result = runEngine(targetDir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("apps/web/src/components/empty-state.tsx");
  });

  it("(d) @microcopy-exempt hatch suppresses enforcement => exit 0", () => {
    targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "mc-exempt-"));
    // File has the escape hatch comment.
    writeFile(
      targetDir,
      "apps/web/src/components/debug-panel.tsx",
      `// @microcopy-exempt: debug surface, not user-facing creative copy
export function DebugPanel() {
  return <p>No debug data available yet.</p>;
}
`,
    );
    writeGovernance(targetDir, { ...BASE_CONFIG });

    const result = runEngine(targetDir);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("microcopy:");
  });
});
