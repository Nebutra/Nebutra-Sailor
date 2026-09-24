/**
 * Scaffold execution — one fixed pipeline, no choices.
 *
 * Every scaffold is the same converged stack (ADR 2026-09-24 Sailor
 * convergence): the template is copied whole, nothing is pruned, and which
 * vendor runs each capability is decided later by the keys in the env.
 */

import { execFileSync } from "node:child_process";
import pc from "picocolors";
import updateNotifier from "update-notifier";
import { showDone } from "../ui/done";
import { emitScaffoldCompleted } from "../utils/analytics-emit";
import { applyComplianceTemplates } from "../utils/compliance";
import { defaultConfig, writeNebutraConfig } from "../utils/config";
import { injectEnv } from "../utils/env";
import { generateEnvSecrets } from "../utils/env-secrets";
import { type CloneProgressEvent, cloneTemplate, formatBytes } from "../utils/git";
import { applyGovernanceLints } from "../utils/governance-lints";
import { emitScaffoldLicense } from "../utils/license-emit";
import { updatePackageJson } from "../utils/npm";
import { applyScaffoldExtras } from "../utils/scaffold-extras";
import { generateSeedData } from "../utils/seed";
import { generateWelcomePage } from "../utils/welcome";
import { VERSION } from "../version";
import type { CliOptions, JsonEvent } from "./types";

// ---------------------------------------------------------------------------
// JSON event helper (local to scaffold — same logic as original index.ts)
// ---------------------------------------------------------------------------

function emitJson(useJson: boolean, payload: JsonEvent): void {
  if (useJson) process.stdout.write(JSON.stringify(payload) + "\n");
}

// ---------------------------------------------------------------------------
// runScaffold — exported main entry
// ---------------------------------------------------------------------------

export interface ScaffoldContext {
  resolvedTarget: string;
  projectName: string;
  resolvedPm: string;
  opts: CliOptions;
  useJson: boolean;
  startedAt: number;
  /**
   * Reports the top-level entries the clone newly created inside the target.
   * The SIGINT handler removes exactly these on cleanup, rather than the whole
   * target directory (which may be a cwd full of the user's own files).
   */
  reportCreatedEntries?: (entries: string[]) => void;
}

/**
 * Live one-line progress for the template download.
 *
 * Without this the terminal is silent for the whole transfer — tens of seconds
 * to several minutes on a large archive — which reads as a hang and is exactly
 * when people reach for Ctrl+C.
 */
function createCloneReporter(useJson: boolean): (event: CloneProgressEvent) => void {
  let lastRender = 0;
  const isTty = process.stdout.isTTY === true;

  const line = (text: string): void => {
    if (!isTty) {
      process.stdout.write(`  ${text}\n`);
      return;
    }
    process.stdout.write(`\r\u001b[2K  ${text}`);
  };

  return (event) => {
    if (useJson) {
      emitJson(true, {
        event: "step",
        step: "clone",
        status: "start",
        phase: event.phase,
        source: event.source,
        receivedBytes: event.receivedBytes,
        totalBytes: event.totalBytes,
        attempt: event.attempt,
      });
      return;
    }

    switch (event.phase) {
      case "resolve":
        line(pc.dim(`Resolving ${event.source}…`));
        break;
      case "download": {
        const now = Date.now();
        // Throttle: a 126 MB body arrives in thousands of chunks.
        if (event.receivedBytes && now - lastRender < 120) return;
        lastRender = now;
        const got = formatBytes(event.receivedBytes ?? 0);
        const of = event.totalBytes ? ` / ${formatBytes(event.totalBytes)}` : "";
        const pct =
          event.totalBytes && event.receivedBytes
            ? ` (${Math.floor((event.receivedBytes / event.totalBytes) * 100)}%)`
            : "";
        line(pc.dim(`Downloading template  ${got}${of}${pct}`));
        break;
      }
      case "retry":
        if (isTty) process.stdout.write("\r\u001b[2K");
        process.stdout.write(
          pc.yellow(`  ⚠ ${event.reason} — retrying (attempt ${event.attempt}/3)\n`),
        );
        break;
      case "extract":
        line(pc.dim("Extracting template…"));
        break;
      case "strip":
        line(pc.dim("Stripping template-only files…"));
        break;
      case "install":
        line(pc.dim("Writing project files…"));
        break;
    }
  };
}

export async function runScaffold(ctx: ScaffoldContext): Promise<void> {
  const { resolvedTarget, projectName, resolvedPm, opts, useJson, startedAt } = ctx;
  const config = defaultConfig();

  // -- clone --
  emitJson(useJson, { event: "step", step: "clone", status: "start" });
  const clone = await cloneTemplate(resolvedTarget, {
    onProgress: createCloneReporter(useJson),
  });
  ctx.reportCreatedEntries?.(clone.createdEntries);
  if (useJson) {
    emitJson(true, {
      event: "step",
      step: "clone",
      status: "ok",
      source: clone.source,
      bytes: clone.bytes,
    });
  } else {
    if (process.stdout.isTTY === true) process.stdout.write("\r\u001b[2K");
    process.stdout.write(
      pc.green(`  ✓ Template ready`) +
        pc.dim(` (${formatBytes(clone.bytes)} from ${clone.source})\n`),
    );
  }

  // -- package.json --
  emitJson(useJson, { event: "step", step: "package", status: "start" });
  await updatePackageJson(resolvedTarget, projectName);
  emitJson(useJson, { event: "step", step: "package", status: "ok" });

  // -- nebutra.config.json --
  emitJson(useJson, { event: "step", step: "config", status: "start" });
  await writeNebutraConfig(resolvedTarget, config);
  emitJson(useJson, { event: "step", step: "config", status: "ok" });

  // -- governance lints --
  // Wire the generalized, config-driven governance lints into the output's
  // `pnpm lint`. Writes governance.config.json with
  // scaffold-layout defaults (shrink-only ratchet allowlists) and patches the root
  // package.json "lint" script. The lint *.mjs files themselves arrive via the
  // cloned template (scripts/governance/**).
  emitJson(useJson, { event: "step", step: "governance-lints", status: "start" });
  const governance = await applyGovernanceLints(resolvedTarget);
  emitJson(useJson, {
    event: "step",
    step: "governance-lints",
    status: "ok",
    lints: governance.lints,
  });

  // -- compliance boilerplate --
  // Footer, cookie banner, privacy policy and terms. Mainland-China surfaces
  // (ICP, AIGC disclosure) live in @nebutra/china-compliance and switch on at
  // runtime with NEBUTRA_LOCALE=cn — they are not a scaffold decision.
  await applyComplianceTemplates(resolvedTarget, "global");
  emitJson(useJson, { event: "step", step: "compliance", status: "ok" });

  await generateEnvSecrets(resolvedTarget);
  await generateSeedData(resolvedTarget);
  await generateWelcomePage(resolvedTarget, { projectName });

  // -- env --
  const envDefaults = {
    databaseUrl: "postgresql://postgres:postgres@localhost:5432/nebutra",
  };
  emitJson(useJson, { event: "step", step: "env", status: "start" });
  await injectEnv(resolvedTarget, envDefaults);
  emitJson(useJson, { event: "step", step: "env", status: "ok" });

  // -- scaffold extras --
  emitJson(useJson, { event: "step", step: "scaffold-extras", status: "start" });
  const extras = await applyScaffoldExtras(resolvedTarget, { projectName });
  emitJson(useJson, {
    event: "step",
    step: "scaffold-extras",
    status: "ok",
    applied: extras.applied,
    skipped: extras.skipped,
  });

  // -- license --
  // MIT LICENSE + scaffold marker. Replaces the upstream repository LICENSE
  // inside the scaffolded project; the upstream text is preserved as
  // LICENSE-UPSTREAM-REFERENCE.md so the monorepo's own terms stay visible.
  emitJson(useJson, { event: "step", step: "license", status: "start" });
  try {
    const licenseEmit = emitScaffoldLicense(resolvedTarget, {
      projectName,
      cliVersion: VERSION,
    });
    emitJson(useJson, {
      event: "step",
      step: "license",
      status: "ok",
      tier: "mit-scaffold",
      wrote: licenseEmit.wrote,
    });
    if (!useJson) {
      process.stdout.write(
        pc.dim(
          `  License: MIT — commercial use, closed source, no fee, no attribution.\n` +
            `           Upstream terms preserved as LICENSE-UPSTREAM-REFERENCE.md.\n`,
        ),
      );
    }
  } catch (err) {
    // License emit must not block scaffolding. Log and continue so the
    // user still gets a working project; they can re-run with --no-install
    // and inspect the scaffold to recover.
    emitJson(useJson, {
      event: "step",
      step: "license",
      status: "warn",
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // -- install --
  const shouldInstall = opts.install !== false;
  if (shouldInstall) {
    const installProgram = resolvedPm === "bun" ? "bun" : resolvedPm;
    const installArgs = ["install"];
    if (useJson) {
      emitJson(true, { event: "step", step: "install", pm: resolvedPm, status: "start" });
    } else {
      process.stdout.write(pc.dim(`  Installing dependencies with ${resolvedPm}…\n`));
    }
    try {
      execFileSync(installProgram, installArgs, {
        cwd: resolvedTarget,
        stdio: useJson ? "ignore" : "inherit",
      });
      emitJson(useJson, { event: "step", step: "install", status: "ok" });
      if (!useJson) {
        process.stdout.write(pc.green(`  ✓ Dependencies installed (${resolvedPm})\n`));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (useJson) {
        emitJson(true, { event: "step", step: "install", status: "error", error: msg });
      } else {
        process.stdout.write(
          pc.yellow(
            `\n  ⚠ Install failed — the project files are ready, but deps are incomplete.\n` +
              `    Fix: ${pc.cyan(`cd ${resolvedTarget} && ${resolvedPm} install`)}\n\n`,
          ),
        );
      }
      // Non-fatal — project was still scaffolded.
    }
  } else {
    emitJson(useJson, { event: "step", step: "install", status: "skip" });
  }

  // -- git init --
  const shouldGit = opts.git !== false;
  if (shouldGit) {
    if (useJson) emitJson(true, { event: "step", step: "git-init", status: "start" });
    try {
      execFileSync("git", ["init", "-q"], { cwd: resolvedTarget, stdio: "ignore" });
      execFileSync("git", ["add", "-A"], { cwd: resolvedTarget, stdio: "ignore" });
      execFileSync(
        "git",
        [
          "-c",
          "user.email=you@example.com",
          "-c",
          "user.name=You",
          "commit",
          "-q",
          "-m",
          "chore: initial scaffold from create-sailor",
        ],
        { cwd: resolvedTarget, stdio: "ignore" },
      );
      emitJson(useJson, { event: "step", step: "git-init", status: "ok" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (useJson) {
        emitJson(true, { event: "step", step: "git-init", status: "error", error: msg });
      } else {
        process.stdout.write(pc.yellow(`  ⚠ git init skipped — not fatal.\n`));
      }
      // Non-fatal — user can init git manually.
    }
  } else {
    emitJson(useJson, { event: "step", step: "git-init", status: "skip" });
  }

  const elapsedSec = Math.max(1, Math.round((Date.now() - startedAt) / 1000));

  // Phase 0 telemetry — fire-and-forget. Respects NEBUTRA_TELEMETRY=0.
  emitScaffoldCompleted({
    template_version: VERSION,
    package_manager: resolvedPm,
    duration_ms: Date.now() - startedAt,
  });

  if (useJson) {
    emitJson(true, {
      event: "done",
      status: "ok",
      elapsedSec,
      targetDir: resolvedTarget,
    });
  } else {
    showDone({
      elapsedSec,
      targetDir: resolvedTarget,
      packageManager: resolvedPm,
      skippedInstall: opts.install === false,
    });
  }

  // Update notifier (non-blocking)
  try {
    updateNotifier({
      pkg: { name: "create-sailor", version: VERSION },
      updateCheckInterval: 1000 * 60 * 60 * 24,
    }).notify({ defer: false, isGlobal: true });
  } catch {
    // swallow — non-critical
  }
}
