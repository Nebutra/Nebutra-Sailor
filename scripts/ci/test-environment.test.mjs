import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { test } from "node:test";

const repo = resolve(import.meta.dirname, "../..");
const turbo = resolve(
  repo,
  "node_modules/.bin",
  process.platform === "win32" ? "turbo.cmd" : "turbo",
);
function plan(overrides = {}) {
  const result = spawnSync(
    turbo,
    ["test", "--filter=@nebutra/db", "--env-mode=strict", "--dry=json"],
    {
      cwd: repo,
      encoding: "utf8",
      env: {
        ...process.env,
        NETWORK_TESTS: "1",
        RLS_ATTACK_DATABASE_URL: "postgresql://probe@localhost/probe",
        ...overrides,
      },
      timeout: 30_000,
    },
  );
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout.slice(result.stdout.indexOf("{")));
  return report.tasks.find((task) => task.taskId === "@nebutra/db#test");
}

test("strict Turbo test jobs receive the CI network and real-Postgres opt-ins", () => {
  const task = plan();
  for (const name of ["NETWORK_TESTS", "RLS_ATTACK_DATABASE_URL"]) {
    assert.ok(
      task.environmentVariables.specified.env.includes(name),
      `${name} must reach the test process`,
    );
    assert.ok(task.environmentVariables.configured.some((value) => value.startsWith(`${name}=`)));
  }
});

test("real-Postgres and network tests cannot reuse a cache from an offline run", () => {
  const online = plan();
  assert.notEqual(plan({ NETWORK_TESTS: "0" }).hash, online.hash);
  assert.notEqual(plan({ RLS_ATTACK_DATABASE_URL: "" }).hash, online.hash);
});
