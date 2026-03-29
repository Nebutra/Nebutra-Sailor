import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Command } from "commander";
import pc from "picocolors";
import { DelegateResult, delegate, findMonorepoRoot } from "../utils/delegate.js";
import { ExitCode } from "../utils/exit-codes.js";
import { logger } from "../utils/logger.js";

interface StatsCommandOptions {
  dryRun?: boolean;
  format?: string;
  json?: boolean;
}

/**
 * Format output based on requested format (json or human-readable)
 */
function formatOutput(data: Record<string, any>, format?: string, label?: string) {
  if (format === "json") {
    const output = {
      command: label || "stats",
      ...data,
    };
    console.log(JSON.stringify(output, null, 2));
  } else {
    if (data.stdout) {
      console.log(data.stdout);
      delete data.stdout;
    }
    // For plain text, log remaining data as human-readable
    if (Object.keys(data).length > 0) {
      console.log(JSON.stringify(data, null, 2));
    }
  }
}

/**
 * Try to parse JSON package metadata
 */
function readPackageJson(path: string): { name?: string; version?: string; description?: string } {
  try {
    const content = readFileSync(resolve(path, "package.json"), "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}

/**
 * Get directory size (rough estimate)
 */
function getDirectorySize(path: string): number {
  try {
    const files = readdirSync(path, { recursive: true });
    return files.length;
  } catch {
    return 0;
  }
}

/**
 * Handle 'nebutra stats' command
 * Overview of the monorepo
 */
async function handleStatsOverview(options: StatsCommandOptions) {
  logger.info("Gathering monorepo statistics...");

  const root = findMonorepoRoot();
  const packagesPath = resolve(root, "packages");
  const appsPath = resolve(root, "apps");

  let packages: string[] = [];
  let apps: string[] = [];
  const totalFiles = 0;
  let preset = "unknown";

  try {
    if (existsSync(packagesPath)) {
      packages = readdirSync(packagesPath).filter(
        (f) => !f.startsWith(".") && existsSync(resolve(packagesPath, f, "package.json")),
      );
    }

    if (existsSync(appsPath)) {
      apps = readdirSync(appsPath).filter(
        (f) => !f.startsWith(".") && existsSync(resolve(appsPath, f, "package.json")),
      );
    }

    // Try to read preset from nebutra.config.ts
    const configPath = resolve(root, "nebutra.config.ts");
    if (existsSync(configPath)) {
      const content = readFileSync(configPath, "utf-8");
      const match = content.match(/preset:\s*["']([^"']+)["']/);
      if (match) preset = match[1];
    }
  } catch (error) {
    logger.warn(
      `Failed to read monorepo structure: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const output = {
    monorepo: {
      root,
      packages: packages.length,
      apps: apps.length,
      preset,
    },
    statistics: {
      totalWorkspaces: packages.length + apps.length,
      packageCount: packages.length,
      appCount: apps.length,
    },
  };

  if (!options.dryRun) {
    logger.success(`Found ${output.statistics.totalWorkspaces} workspaces`);
    logger.info(`Packages: ${output.statistics.packageCount}, Apps: ${output.statistics.appCount}`);
    logger.info(`Preset: ${preset}`);
  }

  formatOutput(output, options.format, "stats");
}

/**
 * Handle 'nebutra stats size' command
 * Bundle and dependency size analysis
 */
async function handleStatsSize(options: StatsCommandOptions) {
  logger.info("Analyzing bundle and dependency sizes...");

  // Run pnpm size if available
  const result = await delegate({
    command: "pnpm",
    args: ["size"],
    interactive: false,
    label: "Analyze package sizes",
    dryRun: options.dryRun,
  });

  const output = {
    analysis: "pnpm size",
    exitCode: result.exitCode,
    ...(result.stdout && { stdout: result.stdout }),
    ...(result.stderr && { stderr: result.stderr }),
  };

  if (result.exitCode !== 0) {
    logger.warn("Size analysis failed. Ensure your project is built.");
  }

  formatOutput(output, options.format, "stats:size");
}

/**
 * Handle 'nebutra stats deps' command
 * Dependency analysis
 */
async function handleStatsDeps(options: StatsCommandOptions) {
  logger.info("Analyzing dependencies...");

  // Try to run knip for unused dependency detection
  const result = await delegate({
    command: "npx",
    args: ["knip", "--no-progress"],
    interactive: false,
    label: "Analyze dependencies",
    dryRun: options.dryRun,
  });

  const output = {
    analysis: "knip (unused dependencies)",
    exitCode: result.exitCode,
    command: "npx knip",
    ...(result.stdout && { stdout: result.stdout.substring(0, 500) }),
  };

  if (!options.dryRun) {
    if (result.exitCode === 0) {
      logger.success("No unused dependencies detected");
    } else {
      logger.info("Run 'npx knip' to see detailed dependency analysis");
    }
  }

  formatOutput(output, options.format, "stats:deps");
}

/**
 * Handle 'nebutra stats packages' command
 * List all packages with metadata
 */
async function handleStatsPackages(options: StatsCommandOptions) {
  logger.info("Listing packages...");

  const root = findMonorepoRoot();
  const packagesPath = resolve(root, "packages");

  let packages: Array<{
    name: string;
    version?: string;
    description?: string;
    files: number;
  }> = [];

  try {
    if (existsSync(packagesPath)) {
      const entries = readdirSync(packagesPath).filter(
        (f) => !f.startsWith(".") && existsSync(resolve(packagesPath, f, "package.json")),
      );

      packages = entries.map((entry) => {
        const pkgPath = resolve(packagesPath, entry);
        const pkg = readPackageJson(pkgPath);
        return {
          name: pkg.name || entry,
          version: pkg.version,
          description: pkg.description,
          files: getDirectorySize(pkgPath),
        };
      });
    }
  } catch (error) {
    logger.error(
      `Failed to list packages: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(ExitCode.ERROR);
  }

  const output = {
    packages,
    total: packages.length,
  };

  if (!options.dryRun) {
    if (options.format === "json") {
      formatOutput(output, options.format, "stats:packages");
    } else {
      // Print as table
      console.log(`\n${pc.cyan("Packages")} (${packages.length} total)\n`);
      packages.forEach((pkg) => {
        console.log(`  ${pc.blue(pkg.name)}`);
        if (pkg.version) console.log(`    version: ${pkg.version}`);
        if (pkg.description) console.log(`    ${pkg.description}`);
        console.log(`    files: ${pkg.files}`);
      });
      console.log("");
    }
  } else {
    formatOutput(output, options.format, "stats:packages");
  }
}

/**
 * Handle 'nebutra stats apps' command
 * List all apps with status
 */
async function handleStatsApps(options: StatsCommandOptions) {
  logger.info("Listing apps...");

  const root = findMonorepoRoot();
  const appsPath = resolve(root, "apps");

  let apps: Array<{
    name: string;
    version?: string;
    description?: string;
    files: number;
    status: "ready" | "building" | "unknown";
  }> = [];

  try {
    if (existsSync(appsPath)) {
      const entries = readdirSync(appsPath).filter(
        (f) => !f.startsWith(".") && existsSync(resolve(appsPath, f, "package.json")),
      );

      apps = entries.map((entry) => {
        const appPath = resolve(appsPath, entry);
        const pkg = readPackageJson(appPath);
        const hasNextConfig =
          existsSync(resolve(appPath, "next.config.ts")) ||
          existsSync(resolve(appPath, "next.config.js"));
        const hasNodeServer =
          existsSync(resolve(appPath, "server.ts")) || existsSync(resolve(appPath, "server.js"));

        return {
          name: pkg.name || entry,
          version: pkg.version,
          description: pkg.description,
          files: getDirectorySize(appPath),
          status: hasNextConfig || hasNodeServer ? "ready" : "unknown",
        };
      });
    }
  } catch (error) {
    logger.error(`Failed to list apps: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(ExitCode.ERROR);
  }

  const output = {
    apps,
    total: apps.length,
    ready: apps.filter((a) => a.status === "ready").length,
  };

  if (!options.dryRun) {
    if (options.format === "json") {
      formatOutput(output, options.format, "stats:apps");
    } else {
      // Print as table
      console.log(`\n${pc.cyan("Apps")} (${apps.length} total, ${output.ready} ready)\n`);
      apps.forEach((app) => {
        const statusIcon = app.status === "ready" ? pc.green("✓") : pc.gray("○");
        console.log(`  ${statusIcon} ${pc.blue(app.name)}`);
        if (app.version) console.log(`    version: ${app.version}`);
        if (app.description) console.log(`    ${app.description}`);
        console.log(`    files: ${app.files}`);
      });
      console.log("");
    }
  } else {
    formatOutput(output, options.format, "stats:apps");
  }
}

/**
 * Register the stats command group
 */
export function registerStatsCommand(program: Command) {
  const stats = program.command("stats").description("Project statistics and health checks");

  // nebutra stats (default)
  stats
    .command("*", { isDefault: true })
    .description("Show monorepo overview")
    .option("--format <type>", "Output format: json or plain")
    .action(async (options: any) => {
      const globalOptions = options.optsWithGlobals?.() || options;
      await handleStatsOverview({
        format: options.format || globalOptions.format,
      });
    });

  // nebutra stats size
  stats
    .command("size")
    .description("Analyze bundle and package sizes")
    .option("--format <type>", "Output format: json or plain")
    .action(async (options) => {
      const globalOptions = options.optsWithGlobals?.() || options;
      await handleStatsSize({
        format: options.format || globalOptions.format,
      });
    });

  // nebutra stats deps
  stats
    .command("deps")
    .description("Analyze dependencies (unused, missing, duplicate)")
    .option("--format <type>", "Output format: json or plain")
    .action(async (options) => {
      const globalOptions = options.optsWithGlobals?.() || options;
      await handleStatsDeps({
        format: options.format || globalOptions.format,
      });
    });

  // nebutra stats packages
  stats
    .command("packages")
    .description("List all packages with metadata")
    .option("--format <type>", "Output format: json or plain")
    .action(async (options) => {
      const globalOptions = options.optsWithGlobals?.() || options;
      await handleStatsPackages({
        format: options.format || globalOptions.format,
      });
    });

  // nebutra stats apps
  stats
    .command("apps")
    .description("List all apps with status")
    .option("--format <type>", "Output format: json or plain")
    .action(async (options) => {
      const globalOptions = options.optsWithGlobals?.() || options;
      await handleStatsApps({
        format: options.format || globalOptions.format,
      });
    });
}
