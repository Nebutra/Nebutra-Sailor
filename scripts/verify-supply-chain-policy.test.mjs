import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const root = new URL("../", import.meta.url).pathname;
function check(change) {
  const fixture = mkdtempSync(join(tmpdir(), "nebutra-policy-"));
  try {
    mkdirSync(join(fixture, "scripts"));
    mkdirSync(join(fixture, ".github/workflows"), { recursive: true });
    for (const file of ["package.json", "pnpm-workspace.yaml", ".npmrc"])
      cpSync(join(root, file), join(fixture, file));
    cpSync(
      join(root, "scripts/verify-supply-chain-policy.mjs"),
      join(fixture, "scripts/verify-supply-chain-policy.mjs"),
    );
    // Resolve the same YAML parser without scanning the repository's dependencies.
    symlinkSync(join(root, "node_modules"), join(fixture, "node_modules"), "dir");
    writeFileSync(join(fixture, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    const path = join(fixture, "pnpm-workspace.yaml");
    writeFileSync(path, change(readFileSync(path, "utf8")));
    return spawnSync(process.execPath, [join(fixture, "scripts/verify-supply-chain-policy.mjs")], {
      encoding: "utf8",
    });
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}
test("reviewed pnpm 11 install policy passes", () => assert.equal(check((s) => s).status, 0));
for (const [name, change] of [
  [
    "unreviewed lifecycle package",
    (s) => s.replace("allowBuilds:", "allowBuilds:\n  unreviewed: true"),
  ],
  ["wildcard lifecycle allowlist", (s) => s.replace("allowBuilds:", 'allowBuilds:\n  "*": true')],
  ["missing approved package", (s) => s.replace("  esbuild: true\n", "")],
  [
    "stale dependency checks disabled",
    (s) => s.replace("verifyDepsBeforeRun: error", "verifyDepsBeforeRun: false"),
  ],
  ["global build permission inherited", (s) => s.replace("dangerouslyAllowAllBuilds: false\n", "")],
]) {
  test(`rejects ${name}`, () => assert.equal(check(change).status, 1));
}
