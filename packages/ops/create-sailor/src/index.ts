#!/usr/bin/env node

/**
 * create-sailor — CLI entry point.
 *
 * Responsibilities:
 *   1. Commander registration (via buildProgram)
 *   2. Input validation / pre-checks (pnpm, --help, --dry-run)
 *   3. Project location — the only question the scaffold ever asks
 *   4. Scaffold execution (one fixed pipeline; ADR 2026-09-24 Sailor convergence)
 *
 * All domain logic lives in src/steps/*.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { buildProgram } from "./steps/cli-setup";
import { runScaffold } from "./steps/scaffold";
import { type CliOptions, detectPm, type JsonEvent } from "./steps/types";
import { showBanner } from "./ui/banner";
import { showHelp } from "./ui/help";
import { maybeShowFirstRunBanner } from "./utils/first-run";
import {
  DEFAULT_PROJECT_NAME,
  describeUnsafeTarget,
  promptProjectTarget,
  resolveTargetFromInput,
} from "./utils/project-target";
import { VERSION } from "./version";

// ---------------------------------------------------------------------------
// JSON event helper
// ---------------------------------------------------------------------------

function emitJson(useJson: boolean, payload: JsonEvent): void {
  if (useJson) process.stdout.write(JSON.stringify(payload) + "\n");
}

// ---------------------------------------------------------------------------
// Dry-run plan printer
// ---------------------------------------------------------------------------

function printDryRunPlan(
  useJson: boolean,
  resolvedTarget: string,
  resolvedPm: string,
  opts: CliOptions,
): void {
  const plan = [
    `copy template → ${resolvedTarget}`,
    "write nebutra.config.json (capabilities; providers come from env keys)",
    "write governance.config.json + wire pnpm lint",
    "inject compliance boilerplate (footer, cookie banner, privacy, terms)",
    "copy backends/gateway, infra, e2e, tests, deploy (Dockerfile.web + docker-compose)",
    "generate secrets, seed script and welcome page",
    "inject .env.local (local Postgres, Better Auth)",
    "write MIT scaffold license",
    opts.install === false ? "skip install" : `run ${resolvedPm} install`,
    opts.git === false ? "skip git init" : "run git init",
  ];

  if (useJson) {
    for (const action of plan) emitJson(true, { event: "plan", action });
    emitJson(true, { event: "done", dryRun: true });
  } else {
    process.stdout.write("\n" + pc.bold("Dry run — planned actions:\n"));
    for (const line of plan) process.stdout.write(`  • ${line}\n`);
    process.stdout.write(pc.dim("\nNo files were written.\n"));
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function run(): Promise<void> {
  const program = buildProgram();
  program.parse(process.argv);
  const opts = program.opts<CliOptions>();
  const [nameArg] = program.args;

  if (opts.help) {
    showHelp();
    process.exit(0);
  }

  const useJson = Boolean(opts.json);
  const isDry = Boolean(opts.dryRun);
  const autoYes = Boolean(opts.yes);
  const nonInteractive = autoYes || !process.stdin.isTTY;

  if (!useJson) {
    // Show telemetry opt-out banner once per machine (no-op on subsequent
    // runs because of the shared ~/.config/nebutra/first-run-acked marker).
    maybeShowFirstRunBanner();
    showBanner();
  }
  emitJson(useJson, { event: "start", version: VERSION });

  // Pre-check: the scaffolded project uses pnpm workspaces + Turborepo and
  // assumes pnpm 10+. Fail loud now so users don't get a half-installed
  // project. Override with `--pm npm` only if you know the workspace deps
  // won't resolve.
  if (!opts.pm) {
    try {
      execSync("pnpm --version", { stdio: "ignore" });
    } catch {
      if (!useJson) {
        process.stderr.write(
          `\n${pc.red("✘")} ${pc.bold("pnpm is required")} but was not found on PATH.\n` +
            `\nThe scaffold uses pnpm workspaces + Turborepo. Install pnpm first:\n` +
            `  ${pc.cyan("npm i -g pnpm@10")}\n` +
            `\nThen retry: ${pc.cyan("pnpm dlx create-sailor@latest")}\n` +
            `(or pass ${pc.dim("--pm=npm")} if you know workspace:* won't resolve in your setup)\n\n`,
        );
      }
      emitJson(useJson, { event: "error", code: "PNPM_MISSING" });
      process.exit(1);
    }
  }

  // ---- Project location resolution ----
  // Interactive: pick "new folder" vs "current directory" (smart default from
  // cwd emptiness). Non-interactive / --yes: ./my-app. CLI arg: name or path.
  const cancel = (): never => {
    process.stdout.write(pc.red("✘ Cancelled\n"));
    process.exit(130);
  };

  let resolvedTarget: string;
  let projectName: string;

  if (nameArg) {
    try {
      const resolved = resolveTargetFromInput(nameArg);
      resolvedTarget = resolved.targetDir;
      projectName = resolved.projectName;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(`\n${pc.red("✘")} ${msg}\n\n`);
      emitJson(useJson, { event: "error", code: "INVALID_PROJECT_NAME", message: msg });
      process.exit(1);
    }
  } else if (nonInteractive) {
    const resolved = resolveTargetFromInput(DEFAULT_PROJECT_NAME);
    resolvedTarget = resolved.targetDir;
    projectName = resolved.projectName;
  } else {
    const resolved = await promptProjectTarget({ onCancel: cancel });
    resolvedTarget = resolved.targetDir;
    projectName = resolved.projectName;
    if (!useJson) {
      process.stdout.write(pc.dim(`  → ${resolved.absoluteDir}\n`));
    }
  }

  // Hard stop, whatever route produced the target: scaffolding writes a
  // monorepo and cleans up after itself on failure or Ctrl+C, so a home
  // directory or filesystem root can never be the destination. Applies to
  // `create-sailor .` and `create-sailor ~` just as much as to the prompts.
  {
    const unsafe = describeUnsafeTarget(path.resolve(resolvedTarget));
    if (unsafe) {
      const msg =
        `Refusing to scaffold into ${unsafe} (${path.resolve(resolvedTarget)}).\n` +
        `  Create a folder for the project instead:  ${pc.cyan("create-sailor my-app")}`;
      if (!useJson) process.stderr.write(`\n${pc.red("✘")} ${msg}\n\n`);
      emitJson(useJson, { event: "error", code: "UNSAFE_TARGET_DIR", message: msg });
      process.exit(1);
    }
  }

  const resolvedPm = opts.pm ?? detectPm();

  // ---- Dry run ----
  if (isDry) {
    printDryRunPlan(useJson, resolvedTarget, resolvedPm, opts);
    process.exit(0);
  }

  // ---- SIGINT handler ----
  // Only ever removes entries the scaffold itself created (reported by
  // cloneTemplate), and only when it created the target directory outright.
  // It must not `rm -rf resolvedTarget`: with `resolvedTarget === "."` that is
  // the user's cwd, including everything that was in it beforehand.
  const targetExistedBefore = fs.existsSync(resolvedTarget);
  let createdEntries: string[] = [];
  const scaffoldCreatedEntries = (): string[] => createdEntries;
  const onInterrupt = async () => {
    process.stdout.write("\n" + pc.red("✘ Cancelled\n"));

    const created = scaffoldCreatedEntries();
    if (created.length === 0 && targetExistedBefore) {
      process.exit(130);
    }

    const removable = targetExistedBefore
      ? created.map((name) => path.join(resolvedTarget, name))
      : [resolvedTarget];

    const cleanup = await p.confirm({
      message: targetExistedBefore
        ? `Remove the ${removable.length} item${removable.length === 1 ? "" : "s"} added to ${resolvedTarget}?`
        : `Remove the partial install at ${resolvedTarget}?`,
      initialValue: true,
    });

    if (cleanup === true) {
      for (const entry of removable) {
        try {
          fs.rmSync(entry, { recursive: true, force: true });
        } catch {
          // Best-effort cleanup — never fail the exit path.
        }
      }
      process.stdout.write(pc.dim(`  ✓ Cleaned up ${resolvedTarget}\n`));
    }
    process.exit(130);
  };
  process.on("SIGINT", onInterrupt);

  // ---- Scaffold execution ----
  try {
    await runScaffold({
      resolvedTarget,
      projectName,
      resolvedPm,
      opts,
      useJson,
      startedAt: Date.now(),
      reportCreatedEntries: (entries) => {
        createdEntries = entries;
      },
    });
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (useJson) {
      emitJson(true, { event: "error", message });
    } else {
      process.stdout.write(pc.red(`\n✘ Failed: ${message}\n`));
    }
    process.exit(1);
  }
}

run().catch((err) => {
  process.stderr.write(String(err) + "\n");
  process.exit(1);
});
