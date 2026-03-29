import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { findMonorepoRoot, pnpmRun } from "../utils/delegate.js";
import { ExitCode } from "../utils/exit-codes.js";
import { logger } from "../utils/logger.js";

interface PresetOptions {
  dryRun?: boolean;
  yes?: boolean;
  format?: string;
  interactive?: boolean;
}

interface PresetDefinition {
  name: string;
  description: string;
  apps: string[];
  features: string[];
  theme?: string;
  stack?: string[];
}

/**
 * All available presets with their definitions
 */
const PRESETS: Record<string, PresetDefinition> = {
  "ai-saas": {
    name: "ai-saas",
    description: "Full-stack AI SaaS platform with auth, billing, and analytics",
    apps: ["web", "landing-page", "api-gateway", "studio", "admin"],
    features: ["billing", "ai", "search", "analytics", "sso"],
    theme: "vibrant",
    stack: ["Next.js 16", "Hono", "Prisma", "PostgreSQL", "OpenAI API"],
  },
  marketing: {
    name: "marketing",
    description: "Marketing website with blog and CMS integration",
    apps: ["landing-page", "blog", "studio"],
    features: ["blog", "growth", "analytics", "newsletter"],
    theme: "minimal",
    stack: ["Next.js 16", "Sanity CMS", "Mailgun"],
  },
  dashboard: {
    name: "dashboard",
    description: "Enterprise dashboard with admin panel and RBAC",
    apps: ["web", "admin", "api-gateway"],
    features: ["billing", "admin", "analytics", "sso"],
    theme: "dark-dense",
    stack: ["Next.js 16", "Hono", "Prisma", "PostgreSQL"],
  },
  overseas: {
    name: "overseas",
    description: "Global SaaS with multi-language and localization support",
    apps: ["web", "landing-page", "api-gateway", "blog"],
    features: ["billing", "ai", "search", "i18n"],
    theme: "ocean",
    stack: ["Next.js 16", "i18next", "Hono"],
  },
  growth: {
    name: "growth",
    description: "Growth-focused platform with community and content",
    apps: ["web", "landing-page", "blog"],
    features: ["growth", "analytics", "newsletter", "community"],
    theme: "vibrant",
    stack: ["Next.js 16", "Mailgun", "Mixpanel"],
  },
  creative: {
    name: "creative",
    description: "Creative portfolio and landing page builder",
    apps: ["landing-page", "blog"],
    features: ["blog", "growth"],
    theme: "gradient",
    stack: ["Next.js 16", "Framer Motion"],
  },
  "blog-portfolio": {
    name: "blog-portfolio",
    description: "Personal blog and portfolio site",
    apps: ["landing-page", "blog"],
    features: ["blog"],
    theme: "minimal",
    stack: ["Next.js 16"],
  },
  community: {
    name: "community",
    description: "Community platform with real-time features",
    apps: ["web", "landing-page"],
    features: ["community", "growth", "realtime"],
    theme: "vibrant",
    stack: ["Next.js 16", "Hono", "Redis", "Socket.io"],
  },
  "one-person": {
    name: "one-person",
    description: "Solo founder landing page and quick launch",
    apps: ["landing-page"],
    features: ["blog"],
    theme: "minimal",
    stack: ["Next.js 16"],
  },
  full: {
    name: "full",
    description: "Everything included - all apps and all features",
    apps: [
      "web",
      "landing-page",
      "api-gateway",
      "studio",
      "admin",
      "blog",
      "storybook",
      "design-docs",
      "docs",
    ],
    features: [
      "billing",
      "ai",
      "ecommerce",
      "web3",
      "community",
      "blog",
      "growth",
      "search",
      "sso",
      "admin",
      "analytics",
      "newsletter",
      "realtime",
      "upload",
    ],
    theme: "vibrant",
    stack: ["Next.js 16", "Hono", "Prisma", "PostgreSQL", "Redis", "OpenAI", "Web3"],
  },
};

/**
 * List all available presets
 */
export async function presetListCommand(options: PresetOptions) {
  if (options.format === "json") {
    const output = {
      presets: Object.values(PRESETS).map((preset) => ({
        name: preset.name,
        description: preset.description,
        appsCount: preset.apps.length,
        featuresCount: preset.features.length,
        apps: preset.apps,
        features: preset.features,
        theme: preset.theme,
      })),
    };
    process.stdout.write(JSON.stringify(output, null, 2) + "\n");
    process.exit(ExitCode.SUCCESS);
  }

  p.intro(pc.bgCyan(pc.black(" nebutra preset list ")));

  logger.info("Available presets:\n");

  for (const preset of Object.values(PRESETS)) {
    const name = pc.bold(preset.name);
    const description = pc.dim(preset.description);
    const stats = pc.gray(`(${preset.apps.length} apps, ${preset.features.length} features)`);
    logger.info(`${name} ${stats}`);
    logger.info(`  ${description}`);
  }

  process.exit(ExitCode.SUCCESS);
}

/**
 * Show details of a specific preset
 */
export async function presetShowCommand(presetName: string | undefined, options: PresetOptions) {
  if (!presetName) {
    logger.error("Please specify a preset name");
    logger.info("Available presets: " + Object.keys(PRESETS).join(", "));
    process.exit(ExitCode.INVALID_ARGS);
  }

  const preset = PRESETS[presetName];
  if (!preset) {
    logger.error(`Preset not found: ${presetName}`);
    logger.info("Available presets: " + Object.keys(PRESETS).join(", "));
    process.exit(ExitCode.NOT_FOUND);
  }

  if (options.format === "json") {
    process.stdout.write(JSON.stringify(preset, null, 2) + "\n");
    process.exit(ExitCode.SUCCESS);
  }

  p.intro(pc.bgCyan(pc.black(` nebutra preset show ${presetName} `)));

  logger.info(`\n${pc.bold(preset.name)}`);
  logger.info(preset.description);

  logger.info(`\n${pc.bold("Apps:")}`);
  preset.apps.forEach((app) => {
    logger.info(`  • ${app}`);
  });

  logger.info(`\n${pc.bold("Features:")}`);
  preset.features.forEach((feature) => {
    logger.info(`  • ${feature}`);
  });

  if (preset.theme) {
    logger.info(`\n${pc.bold("Theme:")}`);
    logger.info(`  ${preset.theme}`);
  }

  if (preset.stack) {
    logger.info(`\n${pc.bold("Recommended Stack:")}`);
    preset.stack.forEach((item) => {
      logger.info(`  • ${item}`);
    });
  }

  process.exit(ExitCode.SUCCESS);
}

/**
 * Apply a preset to nebutra.config.ts
 */
export async function presetApplyCommand(presetName: string, options: PresetOptions) {
  const preset = PRESETS[presetName];
  if (!preset) {
    logger.error(`Preset not found: ${presetName}`);
    logger.info("Available presets: " + Object.keys(PRESETS).join(", "));
    process.exit(ExitCode.NOT_FOUND);
  }

  const root = findMonorepoRoot();
  const configPath = resolve(root, "nebutra.config.ts");

  if (options.dryRun) {
    const output = {
      mode: "dry-run",
      timestamp: new Date().toISOString(),
      action: "preset.apply",
      preset: presetName,
      configFile: configPath,
      changes: {
        preset: presetName,
        apps: preset.apps,
        features: preset.features,
        theme: preset.theme || "default",
      },
    };
    process.stdout.write(JSON.stringify(output, null, 2) + "\n");
    process.exit(ExitCode.DRY_RUN_OK);
  }

  p.intro(pc.bgCyan(pc.black(` nebutra preset apply `)));

  const spinner = logger.spinner();

  try {
    // Read existing config or create new one
    let configContent: string;
    try {
      configContent = await fs.readFile(configPath, "utf-8");
    } catch {
      configContent = `export default {
  preset: "${presetName}",
  apps: ${JSON.stringify(preset.apps, null, 2).replace(/\n/g, "\n  ")},
  features: ${JSON.stringify(preset.features, null, 2).replace(/\n/g, "\n  ")},
  theme: "${preset.theme || "default"}",
};`;
    }

    // Update preset in config
    const updatedConfig = configContent.replace(/preset:\s*"[^"]*"/, `preset: "${presetName}"`);

    if (options.dryRun === false) {
      spinner.start(`Applying preset ${pc.cyan(presetName)}...`);
      await fs.writeFile(configPath, updatedConfig, "utf-8");
      spinner.stop(`Applied preset ${pc.cyan(presetName)}`, 0);

      logger.success(`Preset applied successfully`);
      logger.info(`${preset.apps.length} apps enabled`);
      logger.info(`${preset.features.length} features enabled`);
      logger.info(`Theme: ${preset.theme || "default"}`);
    }

    process.exit(ExitCode.SUCCESS);
  } catch (error) {
    spinner.stop(
      `Failed to apply preset: ${error instanceof Error ? error.message : "Unknown error"}`,
      1,
    );
    process.exit(ExitCode.ERROR);
  }
}

/**
 * Show environment variables for current preset
 */
export async function presetEnvCommand(options: PresetOptions) {
  p.intro(pc.bgCyan(pc.black(" nebutra preset env ")));

  const root = findMonorepoRoot();

  try {
    const result = await pnpmRun("preset:env", {
      dryRun: options.dryRun,
      interactive: false,
    });

    if (result.exitCode === 0) {
      if (result.stdout) {
        process.stdout.write(result.stdout);
      }
      process.exit(ExitCode.SUCCESS);
    } else {
      logger.error("Failed to get environment variables");
      if (result.stderr) {
        process.stderr.write(result.stderr);
      }
      process.exit(ExitCode.ERROR);
    }
  } catch (error) {
    logger.error(`Failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    process.exit(ExitCode.ERROR);
  }
}

/**
 * List features in current preset config
 */
export async function presetFeaturesCommand(options: PresetOptions) {
  p.intro(pc.bgCyan(pc.black(" nebutra preset features ")));

  const root = findMonorepoRoot();
  const configPath = resolve(root, "nebutra.config.ts");

  try {
    const configContent = await fs.readFile(configPath, "utf-8");

    // Extract features array using regex (simple parsing)
    const featuresMatch = configContent.match(/features:\s*\[([\s\S]*?)\]/);
    if (!featuresMatch) {
      logger.warn("No features found in nebutra.config.ts");
      process.exit(ExitCode.CONFIG_ERROR);
    }

    const featuresStr = featuresMatch[1];
    const features = featuresStr
      .split(",")
      .map((f) => f.trim().replace(/['"]/g, ""))
      .filter((f) => f.length > 0);

    if (options.format === "json") {
      const output = {
        features,
        count: features.length,
      };
      process.stdout.write(JSON.stringify(output, null, 2) + "\n");
      process.exit(ExitCode.SUCCESS);
    }

    logger.info(`Features in current preset:\n`);
    features.forEach((feature) => {
      logger.info(`  ✓ ${feature}`);
    });
    logger.info(`\nTotal: ${features.length} features`);

    process.exit(ExitCode.SUCCESS);
  } catch (error) {
    logger.error(
      `Failed to read config: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    process.exit(ExitCode.ERROR);
  }
}

/**
 * Compare two presets side by side
 */
export async function presetDiffCommand(
  presetA: string | undefined,
  presetB: string | undefined,
  options: PresetOptions,
) {
  if (!presetA || !presetB) {
    logger.error("Please specify two preset names to compare");
    logger.info("Available presets: " + Object.keys(PRESETS).join(", "));
    process.exit(ExitCode.INVALID_ARGS);
  }

  const preset1 = PRESETS[presetA];
  const preset2 = PRESETS[presetB];

  if (!preset1) {
    logger.error(`Preset not found: ${presetA}`);
    process.exit(ExitCode.NOT_FOUND);
  }

  if (!preset2) {
    logger.error(`Preset not found: ${presetB}`);
    process.exit(ExitCode.NOT_FOUND);
  }

  if (options.format === "json") {
    const output = {
      comparison: {
        presetA: presetA,
        presetB: presetB,
        appsOnly1: preset1.apps.filter((a) => !preset2.apps.includes(a)),
        appsOnly2: preset2.apps.filter((a) => !preset1.apps.includes(a)),
        appsCommon: preset1.apps.filter((a) => preset2.apps.includes(a)),
        featuresOnly1: preset1.features.filter((f) => !preset2.features.includes(f)),
        featuresOnly2: preset2.features.filter((f) => !preset1.features.includes(f)),
        featuresCommon: preset1.features.filter((f) => preset2.features.includes(f)),
      },
    };
    process.stdout.write(JSON.stringify(output, null, 2) + "\n");
    process.exit(ExitCode.SUCCESS);
  }

  p.intro(pc.bgCyan(pc.black(" nebutra preset diff ")));

  logger.info(`\n${pc.bold("Preset Comparison: " + presetA + " vs " + presetB)}\n`);

  // Apps comparison
  const appsOnly1 = preset1.apps.filter((a) => !preset2.apps.includes(a));
  const appsOnly2 = preset2.apps.filter((a) => !preset1.apps.includes(a));
  const appsCommon = preset1.apps.filter((a) => preset2.apps.includes(a));

  logger.info(pc.bold("Apps:"));
  if (appsOnly1.length > 0) {
    logger.info(`  Only in ${pc.cyan(presetA)}:`);
    appsOnly1.forEach((app) => logger.info(`    • ${app}`));
  }
  if (appsOnly2.length > 0) {
    logger.info(`  Only in ${pc.cyan(presetB)}:`);
    appsOnly2.forEach((app) => logger.info(`    • ${app}`));
  }
  if (appsCommon.length > 0) {
    logger.info(`  ${pc.green("Common")}:`);
    appsCommon.forEach((app) => logger.info(`    ✓ ${app}`));
  }

  // Features comparison
  const featuresOnly1 = preset1.features.filter((f) => !preset2.features.includes(f));
  const featuresOnly2 = preset2.features.filter((f) => !preset1.features.includes(f));
  const featuresCommon = preset1.features.filter((f) => preset2.features.includes(f));

  logger.info(`\n${pc.bold("Features:")}`);
  if (featuresOnly1.length > 0) {
    logger.info(`  Only in ${pc.cyan(presetA)}:`);
    featuresOnly1.forEach((f) => logger.info(`    • ${f}`));
  }
  if (featuresOnly2.length > 0) {
    logger.info(`  Only in ${pc.cyan(presetB)}:`);
    featuresOnly2.forEach((f) => logger.info(`    • ${f}`));
  }
  if (featuresCommon.length > 0) {
    logger.info(`  ${pc.green("Common")}:`);
    featuresCommon.forEach((f) => logger.info(`    ✓ ${f}`));
  }

  process.exit(ExitCode.SUCCESS);
}

/**
 * Register preset command with Commander
 */
export function registerPresetCommand(program: any) {
  const preset = program.command("preset").description("Manage Nebutra presets");

  preset
    .command("list")
    .description("List all available presets")
    .option("--format <type>", "Output format: json, plain (default: plain)")
    .action(async (options: any) => {
      const globalOptions = options.optsWithGlobals ? options.optsWithGlobals() : options;
      await presetListCommand({
        format: options.format,
        yes: globalOptions.yes || false,
      });
    });

  preset
    .command("show [name]")
    .description("Show details of a specific preset")
    .option("--format <type>", "Output format: json, plain (default: plain)")
    .action(async (name: string | undefined, options: any) => {
      const globalOptions = options.optsWithGlobals ? options.optsWithGlobals() : options;
      await presetShowCommand(name, {
        format: options.format,
        yes: globalOptions.yes || false,
      });
    });

  preset
    .command("apply <name>")
    .description("Apply a preset to nebutra.config.ts")
    .option("--dry-run", "Preview changes without writing files")
    .option("--yes", "Skip confirmation prompts")
    .action(async (name: string, options: any) => {
      const globalOptions = options.optsWithGlobals ? options.optsWithGlobals() : options;
      await presetApplyCommand(name, {
        dryRun: options.dryRun || false,
        yes: globalOptions.yes || false,
      });
    });

  preset
    .command("env")
    .description("Show environment variables for current preset")
    .option("--dry-run", "Preview without executing")
    .action(async (options: any) => {
      const globalOptions = options.optsWithGlobals ? options.optsWithGlobals() : options;
      await presetEnvCommand({
        dryRun: options.dryRun || false,
        yes: globalOptions.yes || false,
      });
    });

  preset
    .command("features")
    .description("List features enabled in current preset")
    .option("--format <type>", "Output format: json, plain (default: plain)")
    .action(async (options: any) => {
      const globalOptions = options.optsWithGlobals ? options.optsWithGlobals() : options;
      await presetFeaturesCommand({
        format: options.format,
        yes: globalOptions.yes || false,
      });
    });

  preset
    .command("diff <a> <b>")
    .description("Compare two presets side by side")
    .option("--format <type>", "Output format: json, plain (default: plain)")
    .action(async (a: string, b: string, options: any) => {
      const globalOptions = options.optsWithGlobals ? options.optsWithGlobals() : options;
      await presetDiffCommand(a, b, {
        format: options.format,
        yes: globalOptions.yes || false,
      });
    });
}
