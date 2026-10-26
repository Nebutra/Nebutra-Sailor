import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { parse } from "yaml";

const workflow = parse(
  readFileSync(new URL("../../.github/workflows/deploy-ecs.yml", import.meta.url), "utf8"),
);
const detector = workflow.jobs["detect-changes"];
const resolver = detector.steps.find((step) => step.id === "resolve");
const defaults = Object.fromEntries(
  Object.keys(resolver.env)
    .filter((key) => key.startsWith("F_"))
    .map((key) => [key, "false"]),
);

function resolveTargets(overrides = {}) {
  const directory = mkdtempSync(join(tmpdir(), "deploy-ecs-targets-"));
  const output = join(directory, "output");
  try {
    const result = spawnSync("bash", ["-e", "-u", "-o", "pipefail", "-c", resolver.run], {
      env: {
        ...process.env,
        ...defaults,
        EVENT_NAME: "workflow_dispatch",
        INPUT_APPS: "",
        ...overrides,
        GITHUB_OUTPUT: output,
      },
      encoding: "utf8",
      timeout: 10_000,
    });
    const values = existsSync(output)
      ? Object.fromEntries(
          readFileSync(output, "utf8")
            .trim()
            .split("\n")
            .filter(Boolean)
            .map((line) => {
              const index = line.indexOf("=");
              return [line.slice(0, index), line.slice(index + 1)];
            }),
        )
      : {};
    return { ...result, values };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("shared push changes deploy active VM apps without reviving retired kuanlan", () => {
  const result = resolveTargets({
    ...Object.fromEntries(Object.keys(defaults).map((key) => [key, "true"])),
    EVENT_NAME: "push",
    F_KUANLAN: "true",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.values.kuanlan, undefined);
  assert.deepEqual(
    JSON.parse(result.values.next_matrix)
      .map((item) => item.app)
      .sort(),
    ["design", "forge", "pebble", "router"],
  );
  assert.equal(result.values.api, "true");
  assert.equal(result.values.any, "true");
});

test("manual autodetection ignores a stale retired-app filter", () => {
  const result = resolveTargets({ F_KUANLAN: "true" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.values.any, "false");
  assert.equal(result.values.next_any, "false");
  assert.deepEqual(JSON.parse(result.values.next_matrix), []);
});

test("explicit requests for a retired app fail before emitting deployment outputs", () => {
  for (const input of ["kuanlan", "router,kuanlan"]) {
    const result = resolveTargets({ INPUT_APPS: input });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /Unsupported apps:.*kuanlan/);
    assert.deepEqual(result.values, {});
  }
});

test("manual selection still builds and deploys the requested active apps", () => {
  const result = resolveTargets({ INPUT_APPS: "router, design api" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.values.api, "true");
  assert.equal(result.values.forge, "false");
  assert.equal(result.values.any, "true");
  assert.deepEqual(
    JSON.parse(result.values.next_matrix)
      .map((item) => item.app)
      .sort(),
    ["design", "router"],
  );
});

test("retired apps have no deploy outputs, smoke probes or DNS restoration step", () => {
  assert.equal(detector.outputs.kuanlan, undefined);
  const steps = Object.values(workflow.jobs).flatMap((job) => job.steps ?? []);
  const smoke = steps.find((step) => step.id === "smoke");
  assert.ok(smoke);
  assert.doesNotMatch(smoke.run, /kuanlan/);
  assert.ok(steps.every((step) => !/Point kuanlan DNS/.test(step.name ?? "")));
});
