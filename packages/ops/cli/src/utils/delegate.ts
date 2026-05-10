import { spawn } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pc from "picocolors";

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
}

export interface DelegateResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

/**
 * Resolve the monorepo root directory by walking up the tree
 * looking for pnpm-workspace.yaml or package.json with workspaces
 */
export function findMonorepoRoot(): string {
  const filename = fileURLToPath(import.meta.url);
  const startDir = dirname(filename);

  let current = startDir;
  const root = "/";

  while (current !== root) {
    try {
      const files = readdirSync(current);

      // Check for pnpm-workspace.yaml (most reliable marker)
      if (files.includes("pnpm-workspace.yaml")) {
        return current;
      }

      // Check for package.json with workspaces field
      if (files.includes("package.json")) {
        const pkgPath = resolve(current, "package.json");
        const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
        if (pkg.workspaces) {
          return current;
        }
      }
    } catch {
      // Continue walking up
    }

    current = dirname(current);
  }

  // Fallback: return the directory containing node_modules/.pnpm
  const dirWithNodeModules = startDir.split("/packages/")[0];
  return dirWithNodeModules || startDir;
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
    cwd = findMonorepoRoot(),
    env = {},
    interactive = false,
    label = command,
    dryRun = false,
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
      const code = exitCode ?? 1;

      // Print status message only for non-interactive execution
      if (!interactive && !process.env.NEBUTRA_QUIET) {
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
      });
    });

    child.on("error", (error) => {
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
    interactive: true,
    label: `docker compose ${subcommand}`,
  });
}

/**
 * Convenience: run npx/prisma
 */
export async function prismaRun(
  subcommand: string,
  opts?: { args?: string[]; dryRun?: boolean; interactive?: boolean },
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
  });
}
