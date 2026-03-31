import * as p from "@clack/prompts";
import pc from "picocolors";
import { delegate, pnpmRun, turboRun } from "../utils/delegate.js";
import { ExitCode } from "../utils/exit-codes.js";

interface DevOptions {
  app?: string;
  preset?: string;
  dryRun?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  format?: string;
}

interface BuildOptions extends DevOptions {
  strict?: boolean;
}

interface LintOptions extends DevOptions {
  fix?: boolean;
}

interface TypecheckOptions extends DevOptions {
  // no additional options for typecheck
}

/**
 * List of valid app filters for turbo dev
 */
const VALID_APPS = [
  "landing-page",
  "web",
  "storybook",
  "api-gateway",
  "design-docs",
  "studio",
  "docs",
];

/**
 * List of valid preset names for pnpm dev:<preset>
 */
const VALID_PRESETS = ["ai-saas", "marketing", "dashboard", "growth", "enterprise"];

/**
 * Validate app filter
 */
function validateApp(app: string): string {
  const appName = `@nebutra/${app}`;
  if (!VALID_APPS.includes(app)) {
    const suggestion = pc.yellow(`Valid apps: ${VALID_APPS.join(", ")}`);
    throw new Error(`Invalid app: ${pc.red(app)}\n${suggestion}`);
  }
  return appName;
}

/**
 * Validate preset name
 */
function validatePreset(preset: string): string {
  if (!VALID_PRESETS.includes(preset)) {
    const suggestion = pc.yellow(`Valid presets: ${VALID_PRESETS.join(", ")}`);
    throw new Error(`Invalid preset: ${pc.red(preset)}\n${suggestion}`);
  }
  return preset;
}

/**
 * Handle dev command
 */
export async function devCommand(options: DevOptions) {
  if (options.dryRun) {
    const dryRunOutput = {
      mode: "dry-run",
      timestamp: new Date().toISOString(),
      command: "dev",
      options: {
        app: options.app,
        preset: options.preset,
      },
      task: options.app ? "turbo dev" : options.preset ? "pnpm dev" : "turbo dev (all apps)",
    };
    process.stdout.write(JSON.stringify(dryRunOutput, null, 2) + "\n");
    process.exit(ExitCode.DRY_RUN_OK);
  }

  try {
    if (options.app && options.preset) {
      p.log.error(pc.red("Cannot specify both --app and --preset"));
      process.exit(ExitCode.INVALID_ARGS);
    }

    if (options.app) {
      validateApp(options.app);
      const appName = `@nebutra/${options.app}`;
      if (!options.quiet) {
        p.log.info(pc.cyan(`Starting dev server for ${pc.bold(appName)}...`));
      }
      const result = await turboRun("dev", { filter: appName });
      process.exit(result.exitCode);
    }

    if (options.preset) {
      validatePreset(options.preset);
      if (!options.quiet) {
        p.log.info(pc.cyan(`Starting dev with preset ${pc.bold(options.preset)}...`));
      }
      const result = await pnpmRun(`dev:${options.preset}`, {
        interactive: true,
      });
      process.exit(result.exitCode);
    }

    // Default: run turbo dev (all apps)
    if (!options.quiet) {
      p.log.info(pc.cyan("Starting dev servers for all apps..."));
    }
    const result = await turboRun("dev");
    process.exit(result.exitCode);
  } catch (error) {
    if (error instanceof Error) {
      p.log.error(pc.red(error.message));
    } else {
      p.log.error(pc.red("Unknown error occurred"));
    }
    process.exit(ExitCode.ERROR);
  }
}

/**
 * Handle build command
 */
export async function buildCommand(options: BuildOptions) {
  if (options.dryRun) {
    const dryRunOutput = {
      mode: "dry-run",
      timestamp: new Date().toISOString(),
      command: "build",
      options: {
        app: options.app,
        strict: options.strict,
      },
      task: options.strict ? "pnpm build:strict" : "pnpm build",
    };
    process.stdout.write(JSON.stringify(dryRunOutput, null, 2) + "\n");
    process.exit(ExitCode.DRY_RUN_OK);
  }

  try {
    if (options.app && options.strict) {
      p.log.error(pc.red("Cannot use --strict with --app filter"));
      process.exit(ExitCode.INVALID_ARGS);
    }

    if (options.app) {
      validateApp(options.app);
      const appName = `@nebutra/${options.app}`;
      if (!options.quiet) {
        p.log.info(pc.cyan(`Building ${pc.bold(appName)}...`));
      }
      const result = await turboRun("build", { filter: appName });
      process.exit(result.exitCode);
    }

    const script = options.strict ? "build:strict" : "build";
    if (!options.quiet) {
      const msg = options.strict
        ? "Running strict build (with UI governance verification)..."
        : "Building all apps...";
      p.log.info(pc.cyan(msg));
    }
    const result = await pnpmRun(script, { interactive: true });
    process.exit(result.exitCode);
  } catch (error) {
    if (error instanceof Error) {
      p.log.error(pc.red(error.message));
    } else {
      p.log.error(pc.red("Unknown error occurred"));
    }
    process.exit(ExitCode.ERROR);
  }
}

/**
 * Handle lint command
 */
export async function lintCommand(options: LintOptions) {
  if (options.dryRun) {
    const dryRunOutput = {
      mode: "dry-run",
      timestamp: new Date().toISOString(),
      command: "lint",
      options: {
        app: options.app,
        fix: options.fix,
      },
      task: options.fix ? "pnpm lint:fix" : "pnpm lint",
    };
    process.stdout.write(JSON.stringify(dryRunOutput, null, 2) + "\n");
    process.exit(ExitCode.DRY_RUN_OK);
  }

  try {
    if (options.app && options.fix) {
      p.log.error(pc.red("Cannot use --fix with --app filter (lint:fix is global only)"));
      process.exit(ExitCode.INVALID_ARGS);
    }

    if (options.app) {
      validateApp(options.app);
      const appName = `@nebutra/${options.app}`;
      if (!options.quiet) {
        p.log.info(pc.cyan(`Linting ${pc.bold(appName)}...`));
      }
      const result = await delegate({
        command: "turbo",
        args: ["run", "lint", "--filter", appName],
        interactive: true,
        label: `turbo lint --filter ${appName}`,
        dryRun: options.dryRun,
      });
      process.exit(result.exitCode);
    }

    const script = options.fix ? "lint:fix" : "lint";
    if (!options.quiet) {
      const msg = options.fix ? "Fixing linting issues..." : "Linting codebase...";
      p.log.info(pc.cyan(msg));
    }
    const result = await pnpmRun(script, { interactive: true });
    process.exit(result.exitCode);
  } catch (error) {
    if (error instanceof Error) {
      p.log.error(pc.red(error.message));
    } else {
      p.log.error(pc.red("Unknown error occurred"));
    }
    process.exit(ExitCode.ERROR);
  }
}

/**
 * Handle typecheck command
 */
export async function typecheckCommand(options: TypecheckOptions) {
  if (options.dryRun) {
    const dryRunOutput = {
      mode: "dry-run",
      timestamp: new Date().toISOString(),
      command: "typecheck",
      options: {
        app: options.app,
      },
      task: "turbo typecheck",
    };
    process.stdout.write(JSON.stringify(dryRunOutput, null, 2) + "\n");
    process.exit(ExitCode.DRY_RUN_OK);
  }

  try {
    if (options.app) {
      validateApp(options.app);
      const appName = `@nebutra/${options.app}`;
      if (!options.quiet) {
        p.log.info(pc.cyan(`Type-checking ${pc.bold(appName)}...`));
      }
      const result = await turboRun("typecheck", { filter: appName });
      process.exit(result.exitCode);
    }

    if (!options.quiet) {
      p.log.info(pc.cyan("Type-checking all packages..."));
    }
    const result = await turboRun("typecheck");
    process.exit(result.exitCode);
  } catch (error) {
    if (error instanceof Error) {
      p.log.error(pc.red(error.message));
    } else {
      p.log.error(pc.red("Unknown error occurred"));
    }
    process.exit(ExitCode.ERROR);
  }
}

/**
 * Register dev, build, lint, and typecheck as top-level commands
 */
export function registerDevCommand(program: any) {
  // ─── dev command ──────────────────────────────────────────
  program
    .command("dev")
    .description("Start development servers (turbo dev)")
    .option("--app <name>", `App to run: ${VALID_APPS.join(", ")}`)
    .option("--preset <name>", `Preset to use: ${VALID_PRESETS.join(", ")}`)
    .option("--dry-run", "Preview what would run (exit code 10)")
    .action(async (options: any) => {
      const globalOptions = options.optsWithGlobals ? options.optsWithGlobals() : options;
      await devCommand({
        ...options,
        quiet: globalOptions.quiet || false,
        verbose: globalOptions.verbose || false,
        format: globalOptions.format,
      });
    });

  // ─── build command ────────────────────────────────────────
  program
    .command("build")
    .description("Build all apps (pnpm build or turbo build)")
    .option("--app <name>", `App to build: ${VALID_APPS.join(", ")}`)
    .option("--strict", "Run strict build with UI governance verification (pnpm build:strict)")
    .option("--dry-run", "Preview what would run (exit code 10)")
    .action(async (options: any) => {
      const globalOptions = options.optsWithGlobals ? options.optsWithGlobals() : options;
      await buildCommand({
        ...options,
        quiet: globalOptions.quiet || false,
        verbose: globalOptions.verbose || false,
        format: globalOptions.format,
      });
    });

  // ─── lint command ─────────────────────────────────────────
  program
    .command("lint")
    .description("Lint with Biome (pnpm lint or pnpm lint:fix)")
    .option("--app <name>", `App to lint: ${VALID_APPS.join(", ")}`)
    .option("--fix", "Fix linting issues automatically")
    .option("--dry-run", "Preview what would run (exit code 10)")
    .action(async (options: any) => {
      const globalOptions = options.optsWithGlobals ? options.optsWithGlobals() : options;
      await lintCommand({
        ...options,
        quiet: globalOptions.quiet || false,
        verbose: globalOptions.verbose || false,
        format: globalOptions.format,
      });
    });

  // ─── typecheck command ────────────────────────────────────
  program
    .command("typecheck")
    .description("Type-check with TypeScript (turbo typecheck)")
    .option("--app <name>", `App to typecheck: ${VALID_APPS.join(", ")}`)
    .option("--dry-run", "Preview what would run (exit code 10)")
    .action(async (options: any) => {
      const globalOptions = options.optsWithGlobals ? options.optsWithGlobals() : options;
      await typecheckCommand({
        ...options,
        quiet: globalOptions.quiet || false,
        verbose: globalOptions.verbose || false,
        format: globalOptions.format,
      });
    });
}
