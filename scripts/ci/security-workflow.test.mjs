import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parse } from "yaml";

const workflowFile = new URL("../../.github/workflows/security-regressions.yml", import.meta.url);
test("security regressions run independently on main and pull requests with read-only permissions", () => {
  const workflow = parse(readFileSync(workflowFile, "utf8"));
  assert.deepEqual(workflow.on.push.branches, ["main"]);
  assert.deepEqual(workflow.on.pull_request.branches, ["main"]);
  assert.ok(workflow.on.push.paths.includes(".github/workflows/**"));
  assert.ok(workflow.on.pull_request.paths.includes(".github/workflows/**"));
  assert.deepEqual(workflow.permissions, { contents: "read" });
  assert.ok(workflow.concurrency.group.startsWith("security-regressions-"));
  assert.ok(workflow.jobs.security["timeout-minutes"] <= 15);
});

test("the fast gate audits dependencies and replays RLS attacks against a real PostgreSQL service", () => {
  const workflow = parse(readFileSync(workflowFile, "utf8"));
  const job = workflow.jobs.security;
  assert.equal(job.services.postgres.env.POSTGRES_DB, "rls_test");
  const audit = job.steps.find((step) => step.run === "node scripts/ci/dependency-audit.mjs");
  assert.ok(audit);
  assert.equal(audit["continue-on-error"], undefined);
  const rls = job.steps.find((step) => step.run?.includes("rls-dual-tenant-attack.test.ts"));
  assert.ok(rls.run.includes("rls-migration-coverage.test.ts"));
  assert.equal(
    rls.env.RLS_ATTACK_DATABASE_URL,
    "postgresql://postgres:postgres@localhost:5432/rls_test",
  );
  assert.equal(rls["continue-on-error"], undefined);
});
