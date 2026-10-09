import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

function lint(allowed) {
  const fixture = mkdtempSync(join(tmpdir(), "typography-scan-"));
  try {
    for (const directory of ["apps/demo/src", "apps/demo/.next", "packages/design", "bin"]) {
      mkdirSync(join(fixture, directory), { recursive: true });
    }
    writeFileSync(join(fixture, "apps/demo/src/page.tsx"), '<div className="text-[11px]" />');
    writeFileSync(join(fixture, "apps/demo/.next/generated.ts"), '<div className="text-[99px]" />');
    // Model find's nonzero status during .next churn: old code converted this
    // into an empty scan, incorrectly reporting every allowlist entry as stale.
    const find = join(fixture, "bin/find");
    writeFileSync(find, '#!/bin/sh\necho "find: .next disappeared" >&2\nexit 1\n');
    chmodSync(find, 0o755);
    writeFileSync(
      join(fixture, "governance.config.json"),
      JSON.stringify({
        arbitraryTypography: {
          allowlist: allowed ? [{ file: "apps/demo/src/page.tsx", count: 1 }] : [],
        },
      }),
    );
    return spawnSync(
      process.execPath,
      [new URL("./lint-arbitrary-typography.mjs", import.meta.url).pathname],
      {
        cwd: fixture,
        encoding: "utf8",
        env: { ...process.env, PATH: `${join(fixture, "bin")}:${process.env.PATH}` },
      },
    );
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}
test("source scan survives build directory churn and excludes generated output", () => {
  const result = lint(true);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /1 pre-existing/);
});
test("source violations still block when a shell finder would fail", () => {
  const result = lint(false);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /apps\/demo\/src\/page.tsx: 1 found/);
});
