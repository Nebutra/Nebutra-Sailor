import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

// Fixture test for the generalized, config-driven `lint-no-raw-inputs` script
// that create-sailor ships into scaffolded projects. Proves it:
//   (a) passes on a clean fixture,
//   (b) catches an injected raw <input> violation,
//   (c) honors governance.config.json (custom scanRoots + whitelist),
//   (d) falls back to scaffold-layout defaults when config is absent.

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Repo root: packages/ops/create-sailor/src/steps/__tests__ → up 6 levels.
const REPO_ROOT = path.resolve(__dirname, "../../../../../..");
const LINT_SCRIPT = path.join(REPO_ROOT, "scripts/governance/lint-no-raw-inputs.mjs");

interface RunResult {
  status: number;
  stdout: string;
  stderr: string;
}

/** Run the generalized lint with the fixture dir as cwd (where it reads config). */
function runLint(cwd: string): RunResult {
  try {
    const stdout = execFileSync("node", [LINT_SCRIPT], {
      cwd,
      encoding: "utf-8",
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
  fs.writeFileSync(full, contents);
}

describe("generalized lint-no-raw-inputs (config-driven)", () => {
  let targetDir: string | undefined;

  afterEach(() => {
    if (targetDir) {
      fs.rmSync(targetDir, { force: true, recursive: true });
      targetDir = undefined;
    }
  });

  it("(a) passes on a clean fixture using default config", () => {
    targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "gov-lint-clean-"));
    writeFile(
      targetDir,
      "apps/web/src/app/page.tsx",
      `import { Input } from "@nebutra/ui/primitives";
export default function Page() {
  return <Input name="email" />;
}
`,
    );
    // A native opt-out must NOT be flagged.
    writeFile(
      targetDir,
      "apps/web/src/app/form.tsx",
      `export function Form() {
  return <input data-allow-native type="hidden" name="orgId" value="x" />;
}
`,
    );

    const result = runLint(targetDir);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("No raw <input>");
  });

  it("(b) catches an injected raw <input> violation", () => {
    targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "gov-lint-violation-"));
    writeFile(
      targetDir,
      "apps/web/src/app/page.tsx",
      `export default function Page() {
  return <input type="text" name="email" />;
}
`,
    );

    const result = runLint(targetDir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("raw form-control violation");
    expect(result.stderr).toContain("apps/web/src/app/page.tsx");
    // Default primitivesImport surfaced in the fix message.
    expect(result.stderr).toContain("@nebutra/ui/primitives");
  });

  it("(c) honors governance.config.json — custom scanRoots, whitelist, and primitivesImport", () => {
    targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "gov-lint-config-"));

    // Config: scan only "frontend/", whitelist a vendored dir, custom primitives pkg.
    writeFile(
      targetDir,
      "governance.config.json",
      JSON.stringify(
        {
          rawInputs: {
            scanRoots: ["frontend"],
            primitivesImport: "@acme/ui/primitives",
            whitelist: ["/vendor/"],
          },
        },
        null,
        2,
      ),
    );

    // Violation OUTSIDE scanRoots (apps/) — must be ignored because config
    // restricts scanning to frontend/.
    writeFile(
      targetDir,
      "apps/web/src/app/ignored.tsx",
      `export const X = () => <input type="text" />;\n`,
    );
    // Violation in a whitelisted path under the scanned root — must be ignored.
    writeFile(
      targetDir,
      "frontend/vendor/legacy.tsx",
      `export const Y = () => <input type="text" />;\n`,
    );
    // Real violation in the scanned root, non-whitelisted — must be caught.
    writeFile(
      targetDir,
      "frontend/src/page.tsx",
      `export const Z = () => <select><option>a</option></select>;\n`,
    );

    const result = runLint(targetDir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("frontend/src/page.tsx");
    // Custom primitives package surfaced from config.
    expect(result.stderr).toContain("@acme/ui/primitives");
    // The out-of-root and whitelisted files were NOT reported.
    expect(result.stderr).not.toContain("apps/web/src/app/ignored.tsx");
    expect(result.stderr).not.toContain("frontend/vendor/legacy.tsx");
  });

  it("(c2) honors a whitelist that exempts the only violation → clean pass", () => {
    targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "gov-lint-config-pass-"));
    writeFile(
      targetDir,
      "governance.config.json",
      JSON.stringify({ rawInputs: { whitelist: ["/legacy/"] } }, null, 2),
    );
    writeFile(
      targetDir,
      "apps/web/src/legacy/old.tsx",
      `export const O = () => <textarea name="bio" />;\n`,
    );

    const result = runLint(targetDir);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("No raw <input>");
  });

  it("(d) falls back to scaffold-layout defaults when governance.config.json is absent", () => {
    targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "gov-lint-default-"));
    // No governance.config.json written. Default scanRoots=["apps"].
    writeFile(
      targetDir,
      "apps/web/src/app/page.tsx",
      `export default () => <textarea name="bio" />;\n`,
    );
    // Default whitelist exempts test files.
    writeFile(
      targetDir,
      "apps/web/src/app/page.test.tsx",
      `export const T = () => <input type="text" />;\n`,
    );

    const result = runLint(targetDir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("apps/web/src/app/page.tsx");
    // Test file exempt by default whitelist.
    expect(result.stderr).not.toContain("page.test.tsx");
  });
});
