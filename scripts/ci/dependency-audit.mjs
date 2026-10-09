import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parse } from "yaml";

const BRACES_PATCH_HASH = "13c4825fd82e10f8e05ecb8cca3b2a30c38a241ce5c6bf78647fe35c72e1b60c";

export function verifyBracesPatch(options = {}) {
  const patch = options.patch ?? readFileSync("patches/braces@3.0.3.patch");
  const lock = parse(options.lockfile ?? readFileSync("pnpm-lock.yaml", "utf8"));
  const workspace = parse(options.workspace ?? readFileSync("pnpm-workspace.yaml", "utf8"));
  if (
    createHash("sha256").update(patch).digest("hex") !== BRACES_PATCH_HASH ||
    lock.patchedDependencies?.["braces@3.0.3"] !== BRACES_PATCH_HASH ||
    workspace.patchedDependencies?.["braces@3.0.3"] !== "patches/braces@3.0.3.patch" ||
    Object.keys(lock.snapshots ?? {}).some(
      (key) =>
        key.startsWith("braces@3.0.3") && key !== `braces@3.0.3(patch_hash=${BRACES_PATCH_HASH})`,
    )
  ) {
    throw new Error("Braces security patch missing, changed or not applied in lockfile");
  }
  const testResult =
    options.testResult ??
    spawnSync(process.execPath, ["--test", "scripts/ci/braces-patch.test.mjs"], {
      encoding: "utf8",
      timeout: 30_000,
    });
  if (testResult.status !== 0) throw new Error("Braces security regression tests failed");
  return { verified: true, sha256: BRACES_PATCH_HASH };
}

export function applyLocalPatches(result, evidence) {
  const counts = { ...result.counts };
  const remediated = [];
  for (const [id, advisory] of Object.entries(result.report.advisories)) {
    if (
      evidence.verified &&
      advisory.module_name === "braces" &&
      advisory.github_advisory_id === "GHSA-vfj7-8cjw-p6xm" &&
      advisory.severity === "high" &&
      advisory.findings?.length > 0 &&
      advisory.findings.every((finding) => finding.version === "3.0.3")
    ) {
      counts.high--;
      remediated.push({ id, ghsa: advisory.github_advisory_id, patchSha256: evidence.sha256 });
    }
  }
  return { ...result, counts, blocking: counts.high + counts.critical, remediated };
}

export function evaluateAudit(report) {
  if (!report || report.error || !report.advisories || typeof report.advisories !== "object") {
    throw new Error("Missing advisory report");
  }
  const metadata = report.metadata?.vulnerabilities;
  const counts = { info: 0, low: 0, moderate: 0, high: 0, critical: 0 };
  for (const severity of ["info", "low", "moderate", "high", "critical"]) {
    if (!Number.isSafeInteger(metadata?.[severity]) || metadata[severity] < 0) {
      throw new Error(`Invalid vulnerability count: ${severity}`);
    }
  }
  // pnpm 11 filters ignored entries from advisories, but leaves metadata totals
  // unchanged. Count the remaining advisory records; never subtract ignores
  // from already filtered entries or parse the human-readable summary.
  for (const advisory of Object.values(report.advisories)) {
    if (!advisory || !Object.hasOwn(counts, advisory.severity)) {
      throw new Error("Invalid advisory severity");
    }
    counts[advisory.severity]++;
  }
  for (const severity of Object.keys(counts)) {
    if (counts[severity] > metadata[severity]) throw new Error("Inconsistent advisory counts");
  }
  return { counts, blocking: counts.high + counts.critical, report };
}

export function runAudit(execute, attempts = 3) {
  let reason;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const result = execute();
      if (result.error || ![0, 1].includes(result.status)) {
        throw new Error("Audit process failed");
      }
      return evaluateAudit(JSON.parse(result.stdout));
    } catch (error) {
      reason = error.message;
    }
  }
  throw new Error(
    `Dependency audit did not produce a usable report after ${attempts} attempts: ${reason}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const full = process.argv.includes("--all");
  const outIndex = process.argv.indexOf("--out");
  const output =
    outIndex === -1 ? "artifacts/security/pnpm-audit.json" : process.argv[outIndex + 1];
  try {
    const raw = runAudit(() =>
      spawnSync("pnpm", ["audit", ...(full ? [] : ["--prod"]), "--json"], {
        encoding: "utf8",
        timeout: 120_000,
        maxBuffer: 32 * 1024 * 1024,
      }),
    );
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, `${JSON.stringify(raw.report, null, 2)}\n`);
    const result = applyLocalPatches(raw, verifyBracesPatch());
    writeFileSync(
      `${output}.evaluation.json`,
      `${JSON.stringify({ rawCounts: raw.counts, activeCounts: result.counts, remediated: result.remediated }, null, 2)}\n`,
    );
    console.info(
      `Raw dependency audit: ${JSON.stringify(raw.counts)}; locally patched: ${result.remediated.length}`,
    );
    console.info(`Dependency audit: ${JSON.stringify(result.counts)}`);
    if (process.env.GITHUB_OUTPUT) {
      writeFileSync(
        process.env.GITHUB_OUTPUT,
        `vuln_count=${result.counts.moderate + result.blocking}\n`,
        { flag: "a" },
      );
    }
    if (!full && result.blocking > 0) {
      console.error(
        `::error::${result.counts.high} high and ${result.counts.critical} critical production advisories`,
      );
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`::error::${error.message}`);
    process.exitCode = 1;
  }
}
