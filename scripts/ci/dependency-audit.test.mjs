import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyLocalPatches,
  evaluateAudit,
  runAudit,
  verifyBracesPatch,
} from "./dependency-audit.mjs";

const report = (counts = {}) => ({
  advisories: Object.fromEntries(
    Object.entries(counts).flatMap(([severity, count]) =>
      Array.from({ length: Number.isSafeInteger(count) && count > 0 ? count : 0 }, (_, i) => [
        `${severity}-${i}`,
        { severity },
      ]),
    ),
  ),
  metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0, ...counts } },
});

test("blocks critical even when high is zero", () => {
  assert.equal(evaluateAudit(report({ critical: 1 })).blocking, 1);
});
test("uses already filtered JSON counts without subtracting ignores again", () => {
  assert.equal(evaluateAudit({ ...report({ high: 2 }), ignored: { high: 2 } }).blocking, 2);
  assert.equal(evaluateAudit({ ...report({ high: 2 }), advisories: {} }).blocking, 0);
});
test("moderate is reported without failing the production high gate", () => {
  assert.equal(evaluateAudit(report({ moderate: 7 })).blocking, 0);
});
test("rejects incomplete, malformed, negative and nonnumeric reports", () => {
  for (const value of [
    {},
    { error: "registry unavailable" },
    report({ high: -1 }),
    report({ high: "0" }),
    report({ critical: null }),
  ]) {
    assert.throws(() => evaluateAudit(value));
  }
});
test("retries transport failure, then accepts a real report", () => {
  let calls = 0;
  const result = runAudit(() =>
    ++calls === 1
      ? { status: 1, stdout: "invalid JSON", stderr: "socket timeout" }
      : { status: 0, stdout: JSON.stringify(report()), stderr: "" },
  );
  assert.equal(calls, 2);
  assert.equal(result.blocking, 0);
});
test("a nonzero advisory exit still evaluates high and critical", () => {
  const result = runAudit(() => ({
    status: 1,
    stdout: JSON.stringify(report({ high: 3, critical: 2 })),
    stderr: "",
  }));
  assert.equal(result.blocking, 5);
});
test("persistent registry failure and unexpected process status fail closed", () => {
  assert.throws(() => runAudit(() => ({ status: 1, stdout: "", stderr: "503" })), /usable report/);
  assert.throws(
    () => runAudit(() => ({ status: 2, stdout: JSON.stringify(report()), stderr: "" })),
    /usable report/,
  );
});

test("local remediation requires the exact locked patch and regression suite", () => {
  assert.equal(verifyBracesPatch().verified, true);
  for (const options of [
    { patch: "changed" },
    { lockfile: "patchedDependencies: {}" },
    { workspace: "patchedDependencies: {}" },
    { testResult: { status: 1 } },
  ])
    assert.throws(() => verifyBracesPatch(options));
});

test("local patch only treats its exact advisory and vulnerable version", () => {
  const advisory = {
    severity: "high",
    module_name: "braces",
    github_advisory_id: "GHSA-vfj7-8cjw-p6xm",
    findings: [{ version: "3.0.3" }],
  };
  const input = { ...report({ high: 1 }), advisories: { 1: advisory } };
  assert.equal(applyLocalPatches(evaluateAudit(input), { verified: true }).blocking, 0);
  assert.equal(applyLocalPatches(evaluateAudit(input), { verified: false }).blocking, 1);
  for (const change of [
    { module_name: "other" },
    { github_advisory_id: "new-advisory" },
    { findings: [{ version: "3.0.4" }] },
    { findings: [] },
  ]) {
    assert.equal(
      applyLocalPatches(
        evaluateAudit({ ...input, advisories: { 1: { ...advisory, ...change } } }),
        { verified: true },
      ).blocking,
      1,
    );
  }
});
