import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const script = new URL("./python-dependency-audit.sh", import.meta.url).pathname;
function audit({ compileFailure = false, auditStatus = 0, report = clean, second = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), "python-audit-"));
  try {
    mkdirSync(join(root, "bin"));
    for (const name of second ? ["a", "b"] : ["a"]) {
      mkdirSync(join(root, "backends/python", name), { recursive: true });
      writeFileSync(join(root, "backends/python", name, "pyproject.toml"), "[project]\n");
    }
    const programs = {
      uv: `#!/bin/sh\ncase "$*" in *python/b/*) exit 2;; esac\n${compileFailure ? "exit 2" : 'while [ "$1" != "-o" ]; do shift; done\nprintf "example==1.0\\n" > "$2"'}\n`,
      "pip-audit": `#!/bin/sh\nprintf "called\\n" >> "$AUDIT_CALLS"\nwhile [ "$1" != "--output" ]; do shift; done\nprintf '%s' "$AUDIT_REPORT" > "$2"\nexit "$AUDIT_STATUS"\n`,
    };
    for (const [name, contents] of Object.entries(programs)) {
      writeFileSync(join(root, "bin", name), contents);
      chmodSync(join(root, "bin", name), 0o755);
    }
    const result = spawnSync("bash", [script], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${join(root, "bin")}:${process.env.PATH}`,
        AUDIT_REPORT: typeof report === "string" ? report : JSON.stringify(report),
        AUDIT_STATUS: String(auditStatus),
        AUDIT_CALLS: join(root, "calls"),
        GITHUB_OUTPUT: join(root, "output"),
      },
    });
    let output = "";
    let calls = "";
    try {
      output = readFileSync(join(root, "output"), "utf8");
    } catch {}
    try {
      calls = readFileSync(join(root, "calls"), "utf8");
    } catch {}
    return { ...result, output, calls };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
const clean = { dependencies: [{ name: "example", version: "1.0", vulns: [] }], fixes: [] };
test("valid clean report is required to report no Python vulnerabilities", () => {
  const result = audit();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.output, /failed=0/);
});
test("dependency compilation errors fail before any audit", () => {
  const result = audit({ compileFailure: true });
  assert.notEqual(result.status, 0);
  assert.equal(result.calls, "");
});
test("a second service cannot reuse the first service's requirements", () => {
  const result = audit({ second: true });
  assert.notEqual(result.status, 0);
  assert.equal(result.calls, "called\n");
});
test("audit operational failures fail even with a clean report", () => {
  assert.notEqual(audit({ auditStatus: 2 }).status, 0);
});
test("missing, malformed and skipped dependency reports fail closed", () => {
  for (const report of [
    "",
    "bad json",
    {},
    { dependencies: [] },
    {
      dependencies: [{ name: "example", skip_reason: "unsupported" }],
    },
  ])
    assert.notEqual(audit({ report }).status, 0);
});
test("vulnerability findings are retained and signal the notification step", () => {
  const result = audit({
    auditStatus: 1,
    report: {
      dependencies: [{ name: "example", version: "1.0", vulns: [{ id: "PYSEC-example" }] }],
    },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.output, /failed=1/);
});
test("nonzero audit without vulnerability findings is not a clean scan", () => {
  assert.notEqual(audit({ auditStatus: 1 }).status, 0);
});
