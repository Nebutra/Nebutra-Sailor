#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { classifyBuildWarnings, knownWarnings } from "./lib/web-release-warnings.mjs";

const repoRoot = process.cwd();
const artifactsDir = path.join(repoRoot, "artifacts");
const webBuildLog = path.join(artifactsDir, "web-release-build.log");
const WEB_BUILD_COMMAND = "next build --webpack";

const releaseEnv = {
  ...process.env,
  AUTH_PROVIDER: process.env.AUTH_PROVIDER ?? "clerk",
  NEXT_PUBLIC_AUTH_PROVIDER: process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? "clerk",
  NEXT_TELEMETRY_DISABLED: process.env.NEXT_TELEMETRY_DISABLED ?? "1",
};

function appendLog(buffer, content) {
  if (!content) return buffer;
  return `${buffer}${content.endsWith("\n") ? content : `${content}\n`}`;
}

function runStep(step) {
  process.stdout.write(`[web-release] ${step.name}: ${step.display}\n`);
  const result = spawnSync(step.command, step.args, {
    cwd: path.join(repoRoot, step.cwd ?? "."),
    env: releaseEnv,
    encoding: "utf8",
    shell: false,
  });

  let log = `\n# ${step.name}\n$ ${step.display}\n`;
  log = appendLog(log, result.stdout);
  log = appendLog(log, result.stderr);

  if (result.error) {
    return {
      ok: false,
      status: 1,
      log: appendLog(log, result.error.stack ?? result.error.message),
    };
  }

  return {
    ok: result.status === 0,
    status: result.status ?? 1,
    log,
  };
}

function printWarningSummary(classification) {
  if (classification.known.length > 0) {
    const ids = [...new Set(classification.known.map((warning) => warning.id))].join(", ");
    process.stdout.write(`[web-release] known dependency warnings: ${ids}\n`);
  }

  if (classification.unknown.length > 0) {
    process.stderr.write(
      [
        "[web-release] unknown dependency warning(s) detected. Either remove the warning or add a deliberate knownWarnings entry.",
        ...classification.unknown.map(
          (block, index) => `\n--- unknown warning ${index + 1} ---\n${block}`,
        ),
        "",
      ].join("\n"),
    );
  }
}

const steps = [
  {
    name: "Next type generation",
    command: "pnpm",
    args: ["--filter", "@nebutra/web", "exec", "next", "typegen"],
    display: "pnpm --filter @nebutra/web exec next typegen",
  },
  {
    name: "TypeScript typecheck",
    command: "pnpm",
    args: ["--filter", "@nebutra/web", "typecheck"],
    display: "pnpm --filter @nebutra/web typecheck",
  },
  {
    name: "Production web build",
    command: "pnpm",
    args: ["--filter", "@nebutra/web", "exec", "next", "build", "--webpack"],
    display: `pnpm --filter @nebutra/web exec ${WEB_BUILD_COMMAND}`,
  },
];

let fullLog = [
  "# Web release verification",
  `AUTH_PROVIDER=${releaseEnv.AUTH_PROVIDER}`,
  `NEXT_PUBLIC_AUTH_PROVIDER=${releaseEnv.NEXT_PUBLIC_AUTH_PROVIDER}`,
  `NEXT_TELEMETRY_DISABLED=${releaseEnv.NEXT_TELEMETRY_DISABLED}`,
  "",
].join("\n");

let status = 0;

process.stdout.write(`[web-release] warning governance entries: ${knownWarnings.length}\n`);

for (const step of steps) {
  const result = runStep(step);
  fullLog += result.log;

  if (!result.ok) {
    status = result.status;
    break;
  }
}

mkdirSync(artifactsDir, { recursive: true });
writeFileSync(webBuildLog, fullLog);
process.stdout.write(`[web-release] wrote ${path.relative(repoRoot, webBuildLog)}\n`);

if (status === 0) {
  const classification = classifyBuildWarnings(fullLog);
  printWarningSummary(classification);
  if (classification.unknown.length > 0) {
    status = 1;
  }
}

process.exit(status);
