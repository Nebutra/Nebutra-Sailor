import fs from "node:fs";
import path from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { ExitCode } from "../utils/exit-codes.js";
import { logger } from "../utils/logger.js";

interface InitOptions {
  dryRun?: boolean;
  yes?: boolean;
  ifNotExists?: boolean;
}

const DEFAULT_CONFIG = {
  $schema: "https://nebutra.com/schema.json",
  componentsDirectory: "packages/ui/src/components",
  tailwind: {
    config: "tailwind.config.ts",
    css: "packages/tokens/styles.css",
    baseColor: "slate",
    cssVariables: true,
  },
  aliases: {
    components: "@nebutra/ui",
    utils: "@nebutra/ui/utils",
  },
};

/**
 * Check if running in a TTY (interactive terminal)
 */
function isTTY(): boolean {
  return process.stdout.isTTY === true;
}

/**
 * Check if we should run in non-interactive mode
 */
function shouldBeNonInteractive(options: InitOptions): boolean {
  return options.yes === true || options.dryRun === true || !isTTY();
}

/**
 * Generate a structured JSON diff for dry-run output
 */
function generateDiff(
  configPath: string,
  config: Record<string, any>,
  existingConfig?: Record<string, any>,
) {
  return {
    operation: existingConfig ? "update" : "create",
    path: configPath,
    ...(existingConfig && {
      before: existingConfig,
    }),
    after: config,
  };
}

export async function initCommand(options: InitOptions = {}) {
  const cwd = process.cwd();
  const configPath = path.join(cwd, "nebutra.config.json");
  const configExists = fs.existsSync(configPath);

  // ─── Handle --if-not-exists flag ──────────────────────────
  if (options.ifNotExists && configExists) {
    logger.info("nebutra.config.json already exists, skipping initialization.");
    process.exit(ExitCode.SUCCESS);
  }

  // ─── Determine if we're in non-interactive mode ────────────
  const isNonInteractive = shouldBeNonInteractive(options);

  // ─── Introduction (skip in non-interactive mode) ──────────
  if (!isNonInteractive) {
    p.intro(pc.bgCyan(pc.black(" nebutra init ")));
  }

  // ─── Handle existing config (interactive mode) ────────────
  if (configExists && !isNonInteractive) {
    p.log.warn("nebutra.config.json already exists in this directory.");
    const overwrite = await p.confirm({
      message: "Do you want to overwrite it?",
      initialValue: false,
    });

    if (!overwrite) {
      p.outro("Operation aborted.");
      process.exit(ExitCode.CANCELLED);
    }
  }

  // ─── Prepare config ───────────────────────────────────────
  const config = { ...DEFAULT_CONFIG };

  // ─── Handle dry-run mode ──────────────────────────────────
  if (options.dryRun) {
    const existingConfig = configExists
      ? JSON.parse(fs.readFileSync(configPath, "utf-8"))
      : undefined;

    const diff = generateDiff(configPath, config, existingConfig);
    console.log(JSON.stringify(diff, null, 2));

    logger.info("Dry-run completed. No changes made.");
    process.exit(ExitCode.DRY_RUN_OK);
  }

  // ─── Write config ─────────────────────────────────────────
  if (!isNonInteractive) {
    p.spinner().start("Initializing Nebutra CLI configuration...");
  } else {
    logger.info("Initializing Nebutra CLI configuration...");
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");

  if (!isNonInteractive) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    p.spinner().stop(pc.green("Configuration saved to nebutra.config.json"));
    p.outro(
      pc.cyan(
        'Initialization complete! You can now use "nebutra add" to start injecting components.',
      ),
    );
  } else {
    logger.success("Configuration saved to nebutra.config.json");
    logger.info(
      'Initialization complete! You can now use "nebutra add" to start injecting components.',
    );
  }

  process.exit(ExitCode.SUCCESS);
}
