import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { parse } from "yaml";

const workflowDir = new URL("../../.github/workflows/", import.meta.url);
test("workflow inputs, branch names and secrets never become shell source", () => {
  const unsafe = [];
  for (const file of readdirSync(workflowDir).filter((name) => /\.ya?ml$/.test(name))) {
    const workflow = parse(readFileSync(new URL(file, workflowDir), "utf8"));
    for (const [jobName, job] of Object.entries(workflow.jobs ?? {})) {
      for (const step of job.steps ?? []) {
        const expressions = step.run?.match(/\$\{\{[\s\S]*?\}\}/g) ?? [];
        if (
          expressions.some((expression) =>
            /\b(inputs\.|secrets\.|github\.(base_ref|head_ref)|github\.event\.(inputs\.|(pull_request|issue|comment)\.(title|body)))/.test(
              expression,
            ),
          )
        ) {
          unsafe.push(`${file}: ${jobName}: ${step.name}`);
        }
      }
    }
  }
  assert.deepEqual(unsafe, [], "Pass free-form values through env, then quote shell variables");
});

test("Lighthouse passes shell metacharacters as literal arguments", () => {
  const workflow = parse(readFileSync(new URL("lighthouse-dashboard.yml", workflowDir), "utf8"));
  const steps = workflow.jobs["lighthouse-dashboard"].steps;
  const directory = mkdtempSync(join(tmpdir(), "workflow-input-"));
  const payload = '$(printf injected > "$MARKER")';
  const values = {
    "inputs.before_ref": payload,
    "inputs.after_ref": 'ref"; printf injected > "$MARKER"; #',
    "inputs.runs": "3",
    "inputs.target_path": "/tenants",
    "github.run_id": "123",
    "github.run_attempt": "1",
  };
  const render = (source) =>
    String(source).replace(/\$\{\{\s*(.*?)\s*\}\}/g, (_, expression) => values[expression] ?? "");
  const output = join(directory, "output");
  const capture = join(directory, "arguments");
  const marker = join(directory, "marker");
  try {
    mkdirSync(join(directory, "scripts/lighthouse"), { recursive: true });
    writeFileSync(
      join(directory, "scripts/lighthouse/ci-dashboard-compare.sh"),
      '#!/bin/bash\nprintf "%s\\0" "$@" > "$CAPTURE"\n',
    );
    for (const name of ["Resolve inputs", "Run Lighthouse Compare"]) {
      const step = steps.find((item) => item.name === name);
      assert.ok(step);
      const env = Object.fromEntries(
        Object.entries(step.env ?? {}).map(([key, value]) => [key, render(value)]),
      );
      const result = spawnSync("bash", ["-e", "-o", "pipefail", "-c", render(step.run)], {
        cwd: directory,
        env: { ...process.env, ...env, GITHUB_OUTPUT: output, MARKER: marker, CAPTURE: capture },
        encoding: "utf8",
      });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(existsSync(marker), false, "Workflow data executed a shell command");
      for (const line of readFileSync(output, "utf8").trim().split("\n")) {
        const index = line.indexOf("=");
        values[`steps.refs.outputs.${line.slice(0, index)}`] = line.slice(index + 1);
      }
    }
    const args = readFileSync(capture, "utf8").split("\0");
    assert.equal(args[args.indexOf("--before-ref") + 1], payload);
    assert.equal(args[args.indexOf("--after-ref") + 1], values["inputs.after_ref"]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("Lighthouse rejects newlines that could forge step output keys", () => {
  const workflow = parse(readFileSync(new URL("lighthouse-dashboard.yml", workflowDir), "utf8"));
  const step = workflow.jobs["lighthouse-dashboard"].steps.find(
    (item) => item.name === "Resolve inputs",
  );
  const directory = mkdtempSync(join(tmpdir(), "workflow-output-"));
  const output = join(directory, "output");
  try {
    const result = spawnSync("bash", ["-e", "-o", "pipefail", "-c", step.run], {
      env: {
        ...process.env,
        BEFORE_REF: "HEAD\nruns=999",
        AFTER_REF: "HEAD",
        RUNS: "3",
        TARGET_PATH: "/tenants",
        GITHUB_OUTPUT: output,
      },
      encoding: "utf8",
    });
    assert.notEqual(result.status, 0);
    assert.equal(existsSync(output), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
