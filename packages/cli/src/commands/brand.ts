import type { Command } from "commander";
import pc from "picocolors";
import { type DelegateResult, delegate, pnpmRun } from "../utils/delegate.js";
import { ExitCode } from "../utils/exit-codes.js";
import { logger } from "../utils/logger.js";

interface BrandCommandOptions {
  dryRun?: boolean;
  format?: string;
  interactive?: boolean;
}

interface PaletteOptions extends BrandCommandOptions {
  primary?: string;
  secondary?: string;
}

/**
 * Format output based on requested format (json or human-readable)
 */
function formatOutput(result: DelegateResult, format?: string, label?: string) {
  if (format === "json") {
    const output = {
      command: label || "brand",
      exitCode: result.exitCode,
      success: result.exitCode === 0,
      ...(result.stdout && { stdout: result.stdout }),
      ...(result.stderr && { stderr: result.stderr }),
    };
    console.log(JSON.stringify(output, null, 2));
  } else {
    if (result.stdout) {
      console.log(result.stdout);
    }
    if (result.stderr && result.exitCode !== 0) {
      console.error(result.stderr);
    }
  }
}

/**
 * Validate color format (basic hex validation)
 */
function isValidColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Handle 'nebutra brand init' command
 */
async function handleBrandInit(options: BrandCommandOptions) {
  logger.info("Initializing brand system...");

  const result = await pnpmRun("brand:init", {
    dryRun: options.dryRun,
    interactive: options.interactive ?? true,
  });

  formatOutput(result, options.format, "brand:init");

  if (result.exitCode !== 0) {
    process.exit(result.exitCode);
  }

  if (!options.dryRun) {
    logger.success("Brand system initialized successfully");
  }
}

/**
 * Handle 'nebutra brand apply' command
 */
async function handleBrandApply(options: BrandCommandOptions) {
  logger.info("Applying brand configuration...");

  const result = await pnpmRun("brand:apply", {
    dryRun: options.dryRun,
    interactive: options.interactive ?? true,
  });

  formatOutput(result, options.format, "brand:apply");

  if (result.exitCode !== 0) {
    process.exit(result.exitCode);
  }

  if (!options.dryRun) {
    logger.success("Brand applied successfully");
  }
}

/**
 * Handle 'nebutra brand palette' command
 */
async function handleBrandPalette(options: PaletteOptions) {
  const args: string[] = [];

  // Validate and add color arguments
  if (options.primary) {
    if (!isValidColor(options.primary)) {
      logger.error(
        `Invalid primary color format: ${options.primary}. Expected hex format like #0033FE`,
      );
      process.exit(ExitCode.INVALID_ARGS);
    }
    args.push(`--primary=${options.primary}`);
  }

  if (options.secondary) {
    if (!isValidColor(options.secondary)) {
      logger.error(
        `Invalid secondary color format: ${options.secondary}. Expected hex format like #0BF1C3`,
      );
      process.exit(ExitCode.INVALID_ARGS);
    }
    args.push(`--secondary=${options.secondary}`);
  }

  if (args.length === 0) {
    logger.warn(
      "No colors specified. Usage: nebutra brand palette --primary=#HEX --secondary=#HEX",
    );
    logger.info("Example: nebutra brand palette --primary=#0033FE --secondary=#0BF1C3");
    process.exit(ExitCode.INVALID_ARGS);
  }

  logger.info(`Generating color palette: ${args.join(" ")}`);

  // Run the palette generator script
  const result = await delegate({
    command: "node",
    args: ["scripts/generate-palette.mjs", ...args],
    dryRun: options.dryRun,
    interactive: options.interactive ?? true,
    label: "Generate brand palette",
  });

  formatOutput(result, options.format, "brand:palette");

  if (result.exitCode !== 0) {
    process.exit(result.exitCode);
  }

  if (!options.dryRun) {
    logger.success("Color palette generated successfully");
  }
}

/**
 * Handle 'nebutra brand sync' command
 */
async function handleBrandSync(options: BrandCommandOptions) {
  logger.info("Syncing brand tokens across packages...");

  const result = await pnpmRun("brand:sync", {
    dryRun: options.dryRun,
    interactive: options.interactive ?? true,
  });

  formatOutput(result, options.format, "brand:sync");

  if (result.exitCode !== 0) {
    process.exit(result.exitCode);
  }

  if (!options.dryRun) {
    logger.success("Brand tokens synced successfully");
  }
}

/**
 * Handle 'nebutra brand verify' command
 */
async function handleBrandVerify(options: BrandCommandOptions) {
  logger.info("Verifying brand token consistency...");

  const result = await pnpmRun("brand:verify-tokens", {
    dryRun: options.dryRun,
    interactive: options.interactive ?? true,
  });

  formatOutput(result, options.format, "brand:verify-tokens");

  if (result.exitCode !== 0) {
    logger.error(
      "Brand token verification failed. There are inconsistencies in your design tokens.",
    );
    process.exit(result.exitCode);
  }

  if (!options.dryRun) {
    logger.success("All brand tokens are consistent");
  }
}

/**
 * Register the brand command group
 */
export function registerBrandCommand(program: Command) {
  const brand = program
    .command("brand")
    .description("Manage Nebutra brand system and design tokens");

  // nebutra brand init
  brand
    .command("init")
    .description("Initialize brand system configuration")
    .option("--dry-run", "Preview changes without executing")
    .option("--format <type>", "Output format: json or plain")
    .action(async (options) => {
      const globalOptions = options.optsWithGlobals?.() || options;
      await handleBrandInit({
        dryRun: options.dryRun || false,
        format: options.format || globalOptions.format,
        interactive: globalOptions.yes !== true,
      });
    });

  // nebutra brand apply
  brand
    .command("apply")
    .description("Apply brand configuration to the project")
    .option("--dry-run", "Preview changes without executing")
    .option("--format <type>", "Output format: json or plain")
    .action(async (options) => {
      const globalOptions = options.optsWithGlobals?.() || options;
      await handleBrandApply({
        dryRun: options.dryRun || false,
        format: options.format || globalOptions.format,
        interactive: globalOptions.yes !== true,
      });
    });

  // nebutra brand palette
  brand
    .command("palette")
    .description("Generate brand color palette from custom colors")
    .option("--primary <hex>", "Primary brand color (hex format, e.g. #0033FE)")
    .option("--secondary <hex>", "Secondary brand color (hex format, e.g. #0BF1C3)")
    .option("--dry-run", "Preview changes without executing")
    .option("--format <type>", "Output format: json or plain")
    .action(async (options) => {
      const globalOptions = options.optsWithGlobals?.() || options;
      await handleBrandPalette({
        primary: options.primary,
        secondary: options.secondary,
        dryRun: options.dryRun || false,
        format: options.format || globalOptions.format,
        interactive: globalOptions.yes !== true,
      });
    });

  // nebutra brand sync
  brand
    .command("sync")
    .description("Synchronize brand tokens across all packages")
    .option("--dry-run", "Preview changes without executing")
    .option("--format <type>", "Output format: json or plain")
    .action(async (options) => {
      const globalOptions = options.optsWithGlobals?.() || options;
      await handleBrandSync({
        dryRun: options.dryRun || false,
        format: options.format || globalOptions.format,
        interactive: globalOptions.yes !== true,
      });
    });

  // nebutra brand verify
  brand
    .command("verify")
    .description("Verify brand token consistency across the project")
    .option("--dry-run", "Preview changes without executing")
    .option("--format <type>", "Output format: json or plain")
    .action(async (options) => {
      const globalOptions = options.optsWithGlobals?.() || options;
      await handleBrandVerify({
        dryRun: options.dryRun || false,
        format: options.format || globalOptions.format,
        interactive: globalOptions.yes !== true,
      });
    });
}
