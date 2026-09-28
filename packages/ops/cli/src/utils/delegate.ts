// @brand-exempt: this is a low-level CLI infra error message (project-root
// resolution failure), not user-facing brand/marketing copy — pulling in
// @nebutra/brand/metadata here would be a layering inversion for a string
// used before any project/brand context exists.
import { spawn } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, parse, resolve } from "node:path";
import pc from "picocolors";
import { configError } from "./errors";

export interface DelegateOptions {
  /** The command to run (e.g., "pnpm", "npx", "docker") */
  command: string;
  /** Arguments to pass */
  args: string[];
  /** Working directory (defaults to monorepo root) */
  cwd?: string;
  /** Environment variable overrides */
  env?: Record<string, string>;
  /** Whether to inherit stdio (true for interactive, false for capture) */
  interactive?: boolean;
  /** Description for status messages */
  label?: string;
  /** Dry-run mode — show what would be run without executing */
  dryRun?: boolean;
  /**
   * Kill the child and resolve (never hang forever) if it hasn't exited
   * after this many milliseconds. Use for anything that can block on a
   * network resource (a database connection, an interactive npx install
   * prompt) with no built-in timeout of its own.
   */
  timeoutMs?: number;
}

export interface DelegateResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  /** True when the process was killed after exceeding `timeoutMs`. */
  timedOut?: boolean;
}

/**
 * Thrown when no project root can be located. Never let this hang a command —
 * callers should either let it bubble to `runCommand`/`reportCommandError` or
 * use `findMonorepoRootOrExit()` to fail fast with a clear message.
 */
export class ProjectRootNotFoundError extends Error {
  constructor(startDir: string) {
    super(
      `Could not find a Nebutra project root above ${startDir} ` +
        `(looked for nebutra.config.json, pnpm-workspace.yaml, or a package.json with "workspaces"). ` +
        "Run this command inside a Sailor project, or scaffold one with `npx create-sailor my-app`.",
    );
    this.name = "ProjectRootNotFoundError";
  }
}

function packageJsonHasWorkspaces(pkgPath: string): boolean {
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    return Boolean(pkg.workspaces);
  } catch {
    return false;
  }
}

/**
 * Resolve the current project's root directory by walking UP from the
 * caller's working directory (never from the CLI's own install location —
 * when `nebutra` is installed globally or via `npx`, its files live under
 * node_modules and have nothing to do with the project being inspected).
 *
 * Marker precedence: `nebutra.config.json` (most specific — a Sailor
 * project's own marker) > `pnpm-workspace.yaml` > `package.json` with a
 * `workspaces` field.
 *
 * Throws `ProjectRootNotFoundError` when nothing is found — commands must
 * either propagate that (it renders as a clear, actionable message via
 * `runCommand`/`reportCommandError`) or call `findMonorepoRootOrExit()`.
 * This function must never silently fall back to an unrelated directory.
 */
export function findMonorepoRoot(startDir: string = process.cwd()): string {
  let current = resolve(startDir);
  const { root: fsRoot } = parse(current);

  for (;;) {
    let files: string[] = [];
    try {
      files = readdirSync(current);
    } catch {
      files = [];
    }

    if (files.includes("nebutra.config.json")) {
      return current;
    }

    if (files.includes("pnpm-workspace.yaml")) {
      return current;
    }

    if (
      files.includes("package.json") &&
      packageJsonHasWorkspaces(resolve(current, "package.json"))
    ) {
      return current;
    }

    if (current === fsRoot) {
      break;
    }

    current = dirname(current);
  }

  throw new ProjectRootNotFoundError(resolve(startDir));
}

/**
 * Same resolution as `findMonorepoRoot`, but exits immediately with a
 * structured, actionable error instead of throwing when no project root is
 * found. Use this at command entry points that are not already wrapped in
 * `runCommand`, so a missing project root fails fast instead of surfacing as
 * an unhandled rejection or (worse) hanging on a downstream `npx`/db call.
 */
export function findMonorepoRootOrExit(startDir?: string): string {
  try {
    return findMonorepoRoot(startDir);
  } catch (error) {
    if (error instanceof ProjectRootNotFoundError) {
      configError(error.message, "Run inside a Sailor project, or `npx create-sailor my-app`.");
    }
    throw error;
  }
}

/**
 * Delegate execution to an external command.
 * In dry-run mode, outputs the command that would be run as JSON.
 * In interactive mode, inherits stdio for TTY pass-through.
 * In capture mode, collects stdout/stderr for structured processing.
 */
export async function delegate(options: DelegateOptions): Promise<DelegateResult> {
  const {
    command,
    args,
    cwd = findMonorepoRootOrExit(),
    env = {},
    interactive = false,
    label = command,
    dryRun = false,
    timeoutMs,
  } = options;

  // Dry-run mode: output command as JSON and return early
  if (dryRun) {
    const dryRunOutput = {
      mode: "dry-run",
      timestamp: new Date().toISOString(),
      command,
      args,
      cwd,
      env: Object.keys(env).length > 0 ? env : undefined,
    };

    process.stdout.write(JSON.stringify(dryRunOutput, null, 2) + "\n");

    return {
      exitCode: 0,
      stdout: JSON.stringify(dryRunOutput),
      stderr: "",
    };
  }

  // Status message for interactive execution
  if (interactive && !process.env.NEBUTRA_QUIET) {
    process.stderr.write(pc.cyan(`→ ${label}: ${command} ${args.join(" ")}\n`));
  }

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env: {
        ...process.env,
        ...env,
      },
      stdio: interactive ? "inherit" : ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    let timedOut = false;

    const timer =
      timeoutMs && timeoutMs > 0
        ? setTimeout(() => {
            timedOut = true;
            process.stderr.write(
              pc.red(`✖ ${label} timed out after ${timeoutMs}ms — killing the process\n`),
            );
            child.kill("SIGTERM");
            // Give it a moment to exit gracefully, then force-kill.
            setTimeout(() => {
              if (!settled) child.kill("SIGKILL");
            }, 2000).unref();
          }, timeoutMs)
        : undefined;
    timer?.unref();

    // Collect output in non-interactive mode
    if (!interactive) {
      child.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr?.on("data", (data) => {
        stderr += data.toString();
      });
    }

    child.on("close", (exitCode) => {
      settled = true;
      if (timer) clearTimeout(timer);
      const code = timedOut ? 124 : (exitCode ?? 1);

      // Print status message only for non-interactive execution
      if (!interactive && !process.env.NEBUTRA_QUIET && !timedOut) {
        if (code === 0) {
          process.stderr.write(pc.green(`✓ ${label} completed\n`));
        } else {
          process.stderr.write(pc.red(`✖ ${label} failed with exit code ${code}\n`));
        }
      }

      resolve({
        exitCode: code,
        stdout,
        stderr,
        timedOut,
      });
    });

    child.on("error", (error) => {
      settled = true;
      if (timer) clearTimeout(timer);
      process.stderr.write(pc.red(`✖ Failed to execute ${command}: ${error.message}\n`));

      resolve({
        exitCode: 1,
        stdout,
        stderr: error.message,
      });
    });
  });
}

/**
 * Convenience: run a pnpm script
 */
export async function pnpmRun(
  script: string,
  opts?: {
    filter?: string;
    args?: string[];
    dryRun?: boolean;
    interactive?: boolean;
  },
): Promise<DelegateResult> {
  const args = ["run"];

  if (opts?.filter) {
    args.push("--filter", opts.filter);
  }

  args.push(script);

  if (opts?.args) {
    args.push("--", ...opts.args);
  }

  return delegate({
    command: "pnpm",
    args,
    dryRun: opts?.dryRun,
    interactive: opts?.interactive ?? true,
    label: `pnpm run ${script}`,
  });
}

/**
 * Convenience: run a turbo task
 */
export async function turboRun(
  task: string,
  opts?: { filter?: string; dryRun?: boolean },
): Promise<DelegateResult> {
  const args = ["run", task];

  if (opts?.filter) {
    args.push("--filter", opts.filter);
  }

  return delegate({
    command: "turbo",
    args,
    dryRun: opts?.dryRun,
    interactive: true,
    label: `turbo run ${task}`,
  });
}

/**
 * Convenience: run docker compose
 */
export async function dockerCompose(
  subcommand: string,
  opts?: {
    profile?: string;
    file?: string;
    dryRun?: boolean;
    /** Defaults to true (progress streamed to the terminal). Pass false when the
     * caller needs to parse `stdout` (e.g. `ps --format json`). */
    interactive?: boolean;
    timeoutMs?: number;
  },
): Promise<DelegateResult> {
  const args = ["compose"];

  if (opts?.profile) {
    args.push("--profile", opts.profile);
  }

  if (opts?.file) {
    args.push("-f", opts.file);
  }

  args.push(...subcommand.split(" "));

  return delegate({
    command: "docker",
    args,
    dryRun: opts?.dryRun,
    interactive: opts?.interactive ?? true,
    label: `docker compose ${subcommand}`,
    timeoutMs: opts?.timeoutMs,
  });
}

/**
 * Convenience: run npx/prisma
 */
export async function prismaRun(
  subcommand: string,
  opts?: { args?: string[]; dryRun?: boolean; interactive?: boolean; timeoutMs?: number },
): Promise<DelegateResult> {
  const args = ["prisma", subcommand];

  if (opts?.args) {
    args.push(...opts.args);
  }

  return delegate({
    command: "npx",
    args,
    dryRun: opts?.dryRun,
    interactive: opts?.interactive ?? true,
    label: `prisma ${subcommand}`,
    timeoutMs: opts?.timeoutMs,
  });
}
