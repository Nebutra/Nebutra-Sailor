import * as p from "@clack/prompts";
import pc from "picocolors";
import { pnpmRun, turboRun } from "../utils/delegate.js";
import { ExitCode } from "../utils/exit-codes.js";

interface TestOptions {
  watch?: boolean;
  coverage?: boolean;
  app?: string;
  dryRun?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  format?: string;
}

interface E2EOptions {
  ui?: boolean;
  ci?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  format?: string;
}

interface SizeOptions {
  why?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  format?: string;
}

/**
 * List of valid app filters for turbo test
 */
const VALID_APPS = [
  "landing-page",
  "web",
  "storybook",
  "api-gateway",
  "design-docs",
  "studio",
  "docs",
  "ui",
  "tokens",
  "brand",
  "theme",
  "icons",
  "preset",
  "queue",
  "search",
  "notifications",
  "permissions",
  "webhooks",
  "metering",
  "uploads",
  "vault",
  "tenant",
];

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
 * Handle test command
 */
export async function testCommand(options: TestOptions) {
  if (options.dryRun) {
    const dryRunOutput = {
      mode: "dry-run",
      timestamp: new Date().toISOString(),
      command: "test",
      options: {
        app: options.app,
        watch: options.watch,
        coverage: options.coverage,
      },
      task: options.coverage
        ? "pnpm test:coverage"
        : options.watch
          ? "pnpm test:watch"
          : "pnpm test",
    };
    process.stdout.write(JSON.stringify(dryRunOutput, null, 2) + "\n");
    process.exit(ExitCode.DRY_RUN_OK);
  }

  try {
    if (options.app && (options.watch || options.coverage)) {
      p.log.error(
        pc.red("Cannot use --watch or --coverage with --app filter (app-level tests use turbo)"),
      );
      process.exit(ExitCode.INVALID_ARGS);
    }

    if (options.app) {
      validateApp(options.app);
      const appName = `@nebutra/${options.app}`;
      if (!options.quiet) {
        p.log.info(pc.cyan(`Running tests for ${pc.bold(appName)}...`));
      }
      const result = await turboRun("test", { filter: appName });
      process.exit(result.exitCode);
    }

    let script = "test";
    if (options.coverage) script = "test:coverage";
    else if (options.watch) script = "test:watch";

    if (!options.quiet) {
      const msg =
        script === "test:coverage"
          ? "Running tests with coverage..."
          : script === "test:watch"
            ? "Running tests in watch mode..."
            : "Running tests...";
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
 * Handle test e2e command
 */
export async function testE2eCommand(options: E2EOptions) {
  if (options.dryRun) {
    const dryRunOutput = {
      mode: "dry-run",
      timestamp: new Date().toISOString(),
      command: "test e2e",
      options: {
        ui: options.ui,
        ci: options.ci,
      },
      task: options.ci ? "pnpm e2e:ci" : options.ui ? "pnpm e2e:ui" : "pnpm e2e",
    };
    process.stdout.write(JSON.stringify(dryRunOutput, null, 2) + "\n");
    process.exit(ExitCode.DRY_RUN_OK);
  }

  try {
    if ((options.ui && options.ci) || (options.ui && options.ci)) {
      p.log.error(pc.red("Cannot use --ui and --ci together"));
      process.exit(ExitCode.INVALID_ARGS);
    }

    let script = "e2e";
    if (options.ci) script = "e2e:ci";
    else if (options.ui) script = "e2e:ui";

    if (!options.quiet) {
      const msg =
        script === "e2e:ci"
          ? "Running E2E tests (CI mode)..."
          : script === "e2e:ui"
            ? "Opening E2E tests in UI mode..."
            : "Running E2E tests...";
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
 * Handle test size command
 */
export async function testSizeCommand(options: SizeOptions) {
  if (options.dryRun) {
    const dryRunOutput = {
      mode: "dry-run",
      timestamp: new Date().toISOString(),
      command: "test size",
      options: {
        why: options.why,
      },
      task: options.why ? "pnpm size:why" : "pnpm size",
    };
    process.stdout.write(JSON.stringify(dryRunOutput, null, 2) + "\n");
    process.exit(ExitCode.DRY_RUN_OK);
  }

  try {
    const script = options.why ? "size:why" : "size";

    if (!options.quiet) {
      const msg = options.why
        ? "Analyzing bundle size (showing largest assets)..."
        : "Checking bundle size...";
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
 * Handle test arch command
 */
export async function testArchCommand(options: Omit<TestOptions, "watch" | "coverage" | "app">) {
  if (options.dryRun) {
    const dryRunOutput = {
      mode: "dry-run",
      timestamp: new Date().toISOString(),
      command: "test arch",
      task: "pnpm test:arch",
    };
    process.stdout.write(JSON.stringify(dryRunOutput, null, 2) + "\n");
    process.exit(ExitCode.DRY_RUN_OK);
  }

  try {
    if (!options.quiet) {
      p.log.info(pc.cyan("Running architecture tests..."));
    }

    const result = await pnpmRun("test:arch", { interactive: true });
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
 * Register test and test subcommands
 */
export function registerTestCommand(program: any) {
  // ─── test command ─────────────────────────────────────────
  const testCmd = program
    .command("test [subcommand]")
    .description("Run tests (Vitest, Playwright, bundle size, architecture)")
    .option("--watch", "Run tests in watch mode (unit tests only)")
    .option("--coverage", "Generate coverage report (unit tests only)")
    .option("--app <name>", `Run tests for specific app: ${VALID_APPS.join(", ")}`)
    .option("--dry-run", "Preview what would run (exit code 10)")
    .action(async (subcommand: any, options: any) => {
      const globalOptions = options.optsWithGlobals ? options.optsWithGlobals() : options;

      // Handle subcommands
      if (subcommand === "e2e") {
        await testE2eCommand({
          ui: options.ui || false,
          ci: options.ci || false,
          dryRun: options.dryRun || false,
          quiet: globalOptions.quiet || false,
          verbose: globalOptions.verbose || false,
          format: globalOptions.format,
        });
      } else if (subcommand === "size") {
        await testSizeCommand({
          why: options.why || false,
          dryRun: options.dryRun || false,
          quiet: globalOptions.quiet || false,
          verbose: globalOptions.verbose || false,
          format: globalOptions.format,
        });
      } else if (subcommand === "arch") {
        await testArchCommand({
          dryRun: options.dryRun || false,
          quiet: globalOptions.quiet || false,
          verbose: globalOptions.verbose || false,
          format: globalOptions.format,
        });
      } else {
        // Default: unit tests
        await testCommand({
          ...options,
          quiet: globalOptions.quiet || false,
          verbose: globalOptions.verbose || false,
          format: globalOptions.format,
        });
      }
    });

  // ─── test e2e subcommand ──────────────────────────────────
  testCmd
    .command("e2e")
    .description("Run end-to-end tests (Playwright)")
    .option("--ui", "Open interactive UI mode")
    .option("--ci", "Run in CI mode with strict options")
    .option("--dry-run", "Preview what would run (exit code 10)")
    .action(async (options: any) => {
      const globalOptions = options.optsWithGlobals ? options.optsWithGlobals() : options;
      await testE2eCommand({
        ...options,
        quiet: globalOptions.quiet || false,
        verbose: globalOptions.verbose || false,
        format: globalOptions.format,
      });
    });

  // ─── test size subcommand ─────────────────────────────────
  testCmd
    .command("size")
    .description("Check bundle size (analyze largest assets)")
    .option("--why", "Show breakdown of largest bundle assets")
    .option("--dry-run", "Preview what would run (exit code 10)")
    .action(async (options: any) => {
      const globalOptions = options.optsWithGlobals ? options.optsWithGlobals() : options;
      await testSizeCommand({
        ...options,
        quiet: globalOptions.quiet || false,
        verbose: globalOptions.verbose || false,
        format: globalOptions.format,
      });
    });

  // ─── test arch subcommand ────────────────────────────────
  testCmd
    .command("arch")
    .description("Run architecture tests (verify design layer isolation)")
    .option("--dry-run", "Preview what would run (exit code 10)")
    .action(async (options: any) => {
      const globalOptions = options.optsWithGlobals ? options.optsWithGlobals() : options;
      await testArchCommand({
        dryRun: options.dryRun || false,
        quiet: globalOptions.quiet || false,
        verbose: globalOptions.verbose || false,
        format: globalOptions.format,
      });
    });
}
