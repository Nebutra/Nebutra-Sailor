#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const coveragePackages = [
  { name: "@nebutra/preset", path: "packages/ops/preset" },
  { name: "@nebutra/alerting", path: "packages/platform/alerting" },
  { name: "@nebutra/rate-limit", path: "packages/platform/rate-limit" },
  { name: "@nebutra/billing", path: "packages/commerce/billing" },
  { name: "@nebutra/audit", path: "packages/iam/audit" },
  { name: "@nebutra/identity", path: "packages/iam/identity" },
];

const [command, ...argv] = process.argv.slice(2);

try {
  switch (command) {
    case "coverage":
      runCoverage(parseFlags(argv));
      break;
    case "knip":
      runKnip(parseFlags(argv));
      break;
    case "sbom":
      runSbom(parseFlags(argv));
      break;
    default:
      usage();
      process.exit(command ? 1 : 0);
  }
} catch (error) {
  annotate("error", error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function parseFlags(args) {
  const flags = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    const [rawKey, inlineValue] = arg.slice(2).split("=", 2);
    const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

    if (inlineValue !== undefined) {
      flags[key] = inlineValue;
      continue;
    }

    const next = args[index + 1];
    if (next === undefined || next.startsWith("--")) {
      flags[key] = "true";
      continue;
    }

    flags[key] = next;
    index += 1;
  }

  return flags;
}

function runCoverage(flags) {
  const baseRef = flags.base || process.env.COVERAGE_BASE_REF || process.env.TURBO_BASE_REF || "";
  const outFile = flags.out || "artifacts/advisory/coverage-gate.json";
  const summaryFile = flags.summary || process.env.GITHUB_STEP_SUMMARY || "";
  const forceAll = parseBoolean(flags.all || process.env.COVERAGE_FORCE_ALL || "false");
  const changedFiles = forceAll ? ["*"] : getChangedFiles(baseRef);
  const changedFileList = changedFiles ?? [];
  const results = [];

  if (!forceAll && changedFiles === null) {
    annotate(
      "warning",
      "Coverage gate could not resolve changed package files; recording a neutral advisory result.",
    );
  }

  for (const pkg of coveragePackages) {
    const touched =
      forceAll ||
      changedFileList.some((file) => file === pkg.path || file.startsWith(`${pkg.path}/`));

    if (!touched) {
      results.push({ ...pkg, state: "skipped", reason: "unchanged" });
      continue;
    }

    if (!existsSync(join(pkg.path, "package.json"))) {
      results.push({ ...pkg, state: "skipped", reason: "missing package.json" });
      continue;
    }

    if (!hasPackageScript(pkg.name, "test:coverage")) {
      results.push({ ...pkg, state: "skipped", reason: "no test:coverage script" });
      continue;
    }

    console.log(`::group::Coverage gate: ${pkg.name}`);
    const result = spawnSync("pnpm", ["--filter", pkg.name, "run", "test:coverage"], {
      stdio: "inherit",
      env: { ...process.env, CI: "true" },
    });
    console.log("::endgroup::");

    const status = result.status ?? 1;
    results.push({
      ...pkg,
      state: status === 0 ? "passed" : "failed",
      exitCode: status,
      reason: status === 0 ? "threshold satisfied" : "coverage threshold or test command failed",
    });
  }

  const failed = results.filter((result) => result.state === "failed");
  const ran = results.filter((result) => result.state === "passed" || result.state === "failed");
  const payload = {
    gate: "coverage",
    baseRef: baseRef || null,
    forceAll,
    changedFileCount: changedFileList[0] === "*" ? null : changedFileList.length,
    ran: ran.length,
    failed: failed.length,
    state: failed.length > 0 ? "failed" : "passed",
    results,
  };

  writeJson(outFile, payload);
  appendSummary(summaryFile, renderCoverageSummary(payload));

  if (failed.length > 0) {
    annotate("error", `${failed.length} touched core package coverage gate(s) failed.`);
    process.exit(1);
  }
}

function runKnip(flags) {
  const logFile = flags.log || "knip-report.txt";
  const outFile = flags.out || "artifacts/advisory/knip-gate.json";
  const summaryFile = flags.summary || process.env.GITHUB_STEP_SUMMARY || "";
  const status = parseInteger(flags.status ?? process.env.KNIP_STATUS ?? "0", "status");
  const budget = parseOptionalInteger(
    flags.maxReportLines ?? process.env.KNIP_MAX_REPORT_LINES,
    "max report lines",
  );
  const reportLines = countReportLines(logFile);

  let state = status === 0 ? "passed" : "advisory";
  const reasons = [];

  if (status !== 0) {
    reasons.push("knip exited non-zero");
  }

  if (status !== 0 && reportLines === 0) {
    state = "failed";
    reasons.push("no compact report lines were captured");
  }

  if (budget !== null && reportLines > budget) {
    state = "failed";
    reasons.push(`compact report line budget exceeded (${reportLines} > ${budget})`);
  }

  const payload = {
    gate: "dead-code",
    tool: "knip",
    state,
    status,
    reportLines,
    budget,
    reasons,
  };

  writeJson(outFile, payload);
  appendSummary(summaryFile, renderKnipSummary(payload));

  if (state === "failed") {
    annotate("error", reasons.join("; ") || "Knip advisory gate failed.");
    process.exit(1);
  }

  if (state === "advisory") {
    annotate("warning", "Knip reported cleanup candidates. See the advisory artifact for details.");
  }
}

function runSbom(flags) {
  const file = flags.file || "sbom.cdx.json";
  const outFile = flags.out || "artifacts/advisory/sbom-gate.json";
  const summaryFile = flags.summary || process.env.GITHUB_STEP_SUMMARY || "";

  if (!existsSync(file)) {
    throw new Error(`SBOM file was not generated: ${file}`);
  }

  const sbom = JSON.parse(readFileSync(file, "utf8"));
  const componentCount = Array.isArray(sbom.components) ? sbom.components.length : 0;
  const serviceCount = Array.isArray(sbom.services) ? sbom.services.length : 0;
  const dependencyCount = Array.isArray(sbom.dependencies) ? sbom.dependencies.length : 0;
  const evidenceCount = componentCount + serviceCount + dependencyCount;
  const validFormat = sbom.bomFormat === "CycloneDX" && typeof sbom.specVersion === "string";
  const state = validFormat && evidenceCount > 0 ? "passed" : "failed";
  const reasons = [];

  if (!validFormat) {
    reasons.push("SBOM is not a CycloneDX JSON document");
  }

  if (evidenceCount === 0) {
    reasons.push("SBOM contains no components, services, or dependencies");
  }

  const payload = {
    gate: "sbom",
    state,
    bomFormat: sbom.bomFormat || null,
    specVersion: sbom.specVersion || null,
    componentCount,
    serviceCount,
    dependencyCount,
    reasons,
  };

  writeJson(outFile, payload);
  appendSummary(summaryFile, renderSbomSummary(payload));

  if (state === "failed") {
    annotate("error", reasons.join("; ") || "SBOM validation failed.");
    process.exit(1);
  }
}

function hasPackageScript(packageName, scriptName) {
  const result = spawnSync(
    "pnpm",
    [
      "--filter",
      packageName,
      "exec",
      "node",
      "-e",
      `const pkg = require(process.cwd() + "/package.json"); process.exit(pkg.scripts?.[${JSON.stringify(scriptName)}] ? 0 : 1);`,
    ],
    { stdio: "ignore" },
  );

  return result.status === 0;
}

function getChangedFiles(baseRef) {
  if (!baseRef) {
    return null;
  }

  const result = spawnSync(
    "git",
    ["diff", "--name-only", "--diff-filter=ACMRT", `${baseRef}...HEAD`],
    {
      encoding: "utf8",
    },
  );

  if (result.status !== 0) {
    annotate("warning", `Unable to compute changed files from ${baseRef}: ${result.stderr.trim()}`);
    return null;
  }

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function countReportLines(file) {
  if (!existsSync(file)) {
    return 0;
  }

  return readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0).length;
}

function renderCoverageSummary(payload) {
  const rows = payload.results
    .map(
      (result) =>
        `| \`${result.name}\` | ${result.state} | \`${result.path}\` | ${result.reason} |`,
    )
    .join("\n");

  return `### Coverage gate\n\nBase ref: \`${payload.baseRef || "unresolved"}\`\n\n| Package | State | Path | Reason |\n|---|---:|---|---|\n${rows}\n`;
}

function renderKnipSummary(payload) {
  const budget = payload.budget === null ? "not set" : String(payload.budget);
  const reasons = payload.reasons.length > 0 ? payload.reasons.join("; ") : "none";

  return `### Dead-code advisory gate\n\n| Tool | State | Exit code | Compact report lines | Budget | Reason |\n|---|---:|---:|---:|---:|---|\n| Knip | ${payload.state} | ${payload.status} | ${payload.reportLines} | ${budget} | ${reasons} |\n`;
}

function renderSbomSummary(payload) {
  const reasons = payload.reasons.length > 0 ? payload.reasons.join("; ") : "none";

  return `### SBOM gate\n\n| State | Format | Components | Services | Dependencies | Reason |\n|---|---|---:|---:|---:|---|\n| ${payload.state} | ${payload.bomFormat || "unknown"} ${payload.specVersion || ""} | ${payload.componentCount} | ${payload.serviceCount} | ${payload.dependencyCount} | ${reasons} |\n`;
}

function writeJson(file, payload) {
  ensureParent(file);
  writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`);
}

function appendSummary(file, markdown) {
  if (!file) {
    return;
  }

  ensureParent(file);
  writeFileSync(file, `${markdown}\n`, { flag: "a" });
}

function ensureParent(file) {
  const directory = dirname(file);
  if (directory && directory !== ".") {
    mkdirSync(directory, { recursive: true });
  }
}

function parseBoolean(value) {
  return value === true || value === "true" || value === "1" || value === "yes";
}

function parseInteger(value, label) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return parsed;
}

function parseOptionalInteger(value, label) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = parseInteger(value, label);
  if (parsed < 0) {
    throw new Error(`Invalid ${label}: ${value}`);
  }

  return parsed;
}

function annotate(level, message) {
  const escaped = String(message)
    .replaceAll("%", "%25")
    .replaceAll("\r", "%0D")
    .replaceAll("\n", "%0A");
  console.log(`::${level}::${escaped}`);
}

function usage() {
  console.log(`Usage:
  node scripts/ci/advisory-gate.mjs coverage --base <git-ref>
  node scripts/ci/advisory-gate.mjs knip --status <exit-code> --log knip-report.txt [--max-report-lines <n>]
  node scripts/ci/advisory-gate.mjs sbom --file sbom.cdx.json
`);
}
