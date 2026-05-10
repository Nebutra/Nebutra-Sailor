import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import * as p from "@clack/prompts";
import type { Command, OptionValues } from "commander";
import pc from "picocolors";
import { findMonorepoRoot } from "../utils/delegate.js";
import { logger } from "../utils/logger.js";
import { debug, output, sectionHeader, status } from "../utils/output.js";

interface EnvCommandOptions {
  dryRun?: boolean;
  yes?: boolean;
  format?: "json" | "plain";
}

/**
 * Load .env.example to extract required variable names and defaults
 */
function loadEnvExample(root: string): Record<string, string> {
  const examplePath = resolve(root, ".env.example");
  if (!existsSync(examplePath)) {
    throw new Error(`.env.example not found at ${examplePath}`);
  }

  const content = readFileSync(examplePath, "utf-8");
  const vars: Record<string, string> = {};

  for (const line of content.split("\n")) {
    // Skip comments and empty lines
    if (line.trim().startsWith("#") || !line.trim()) {
      continue;
    }

    // Extract KEY="value" or KEY=value patterns
    const match = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (match) {
      const [, key, value] = match;
      // Remove quotes if present
      vars[key] = value.replace(/^["'](.*)["']$/, "$1");
    }
  }

  return vars;
}

/**
 * Load current .env or .env.local file
 */
function loadEnvFile(root: string): Record<string, string> {
  const envLocalPath = resolve(root, ".env.local");
  const envPath = resolve(root, ".env");
  const targetPath = existsSync(envLocalPath) ? envLocalPath : envPath;

  if (!existsSync(targetPath)) {
    return {};
  }

  const content = readFileSync(targetPath, "utf-8");
  const vars: Record<string, string> = {};

  for (const line of content.split("\n")) {
    // Skip comments and empty lines
    if (line.trim().startsWith("#") || !line.trim()) {
      continue;
    }

    // Extract KEY="value" or KEY=value patterns
    const match = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (match) {
      const [, key, value] = match;
      // Remove quotes if present
      vars[key] = value.replace(/^["'](.*)["']$/, "$1");
    }
  }

  return vars;
}

/**
 * Check if a value is a secret (contains sensitive keywords)
 */
function isSensitive(key: string, value: string): boolean {
  const sensitiveKeywords = ["SECRET", "KEY", "TOKEN", "PASSWORD"];
  const isSensitiveKey = sensitiveKeywords.some((kw) => key.toUpperCase().includes(kw));
  return isSensitiveKey && value.length > 0;
}

/**
 * Mask a secret value (show first 4 and last 4 chars)
 */
function maskValue(value: string): string {
  if (value.length <= 8) {
    return "*".repeat(Math.max(value.length, 4));
  }
  return value.substring(0, 4) + "*".repeat(value.length - 8) + value.substring(value.length - 4);
}

/**
 * `nebutra env validate` — Check required env vars are set
 */
async function handleValidate(options: EnvCommandOptions): Promise<void> {
  status("Validating environment variables...", "info");

  const root = findMonorepoRoot();
  const exampleVars = loadEnvExample(root);
  const currentVars = loadEnvFile(root);
  const processEnv = process.env;

  const results: Record<string, boolean> = {};
  let allValid = true;

  for (const key of Object.keys(exampleVars)) {
    const isSet = key in currentVars || key in processEnv;
    results[key] = isSet;
    if (!isSet) {
      allValid = false;
    }
  }

  if (options.format === "json") {
    output(
      {
        valid: allValid,
        checked: Object.keys(exampleVars).length,
        missing: Object.entries(results)
          .filter(([, isSet]) => !isSet)
          .map(([key]) => key),
      },
      { format: "json" },
    );
  } else {
    sectionHeader("Environment Validation");

    const missing = Object.entries(results)
      .filter(([, isSet]) => !isSet)
      .map(([key]) => key);

    if (missing.length === 0) {
      status("All required environment variables are set", "success");
    } else {
      status(`${missing.length} missing environment variable(s):`, "warn");
      for (const key of missing) {
        status(`  - ${key}`, "warn");
      }
    }
  }

  if (!allValid) {
    process.exit(1);
  }
}

/**
 * `nebutra env template` — Generate .env from .env.example with prompts
 */
async function handleTemplate(options: EnvCommandOptions): Promise<void> {
  const root = findMonorepoRoot();
  const exampleVars = loadEnvExample(root);
  const envLocalPath = resolve(root, ".env.local");

  if (existsSync(envLocalPath) && !options.yes && !options.dryRun) {
    const overwrite = await p.confirm({
      message: ".env.local already exists. Overwrite?",
      initialValue: false,
    });

    if (p.isCancel(overwrite) || !overwrite) {
      status("Template generation cancelled", "warn");
      process.exit(0);
    }
  }

  status("Generating .env.local from template...", "info");

  const newVars: Record<string, string> = {};
  let index = 0;
  const total = Object.keys(exampleVars).length;

  for (const [key, defaultValue] of Object.entries(exampleVars)) {
    index++;

    if (options.yes) {
      // In --yes mode, use defaults from .env.example
      newVars[key] = defaultValue;
    } else if (process.stdin.isTTY === true) {
      // Interactive mode: prompt for each value
      const prompt = `[${index}/${total}] ${key}`;
      const value = await p.text({
        message: prompt,
        defaultValue,
      });

      if (p.isCancel(value)) {
        status("Template generation cancelled", "warn");
        process.exit(0);
      }

      newVars[key] = value;
    } else {
      // Non-interactive without --yes: use defaults
      newVars[key] = defaultValue;
    }
  }

  // Build .env.local content
  const envContent = Object.entries(newVars)
    .map(([key, value]) => {
      // Quote values that contain spaces or special characters
      const needsQuotes = /[\s=]/.test(value);
      const quotedValue = needsQuotes ? `"${value}"` : value;
      return `${key}=${quotedValue}`;
    })
    .join("\n");

  if (options.dryRun) {
    status("Dry-run: would write .env.local", "info");
    output(envContent, { format: "plain" });
  } else {
    writeFileSync(envLocalPath, envContent + "\n");
    status(`Environment template written to ${envLocalPath}`, "success");
  }
}

/**
 * `nebutra env diff` — Compare .env vs .env.example
 */
async function handleDiff(options: EnvCommandOptions): Promise<void> {
  status("Comparing environment variables...", "info");

  const root = findMonorepoRoot();
  const exampleVars = loadEnvExample(root);
  const currentVars = loadEnvFile(root);

  const missing: string[] = [];
  const extra: string[] = [];
  const matching: string[] = [];

  // Check for missing vars in current
  for (const key of Object.keys(exampleVars)) {
    if (!(key in currentVars)) {
      missing.push(key);
    } else {
      matching.push(key);
    }
  }

  // Check for extra vars in current
  for (const key of Object.keys(currentVars)) {
    if (!(key in exampleVars)) {
      extra.push(key);
    }
  }

  if (options.format === "json") {
    output(
      {
        matching: matching.length,
        missing: missing.length,
        extra: extra.length,
        missing_vars: missing,
        extra_vars: extra,
      },
      { format: "json" },
    );
  } else {
    sectionHeader("Environment Diff");

    if (matching.length > 0) {
      status(`Matching (${matching.length}): ${matching.join(", ")}`, "success");
    }

    if (missing.length > 0) {
      status(`Missing (${missing.length}):`, "warn");
      for (const key of missing) {
        status(`  - ${key}`, "warn");
      }
    }

    if (extra.length > 0) {
      status(`Extra (${extra.length}):`, "info");
      for (const key of extra) {
        status(`  - ${key}`, "info");
      }
    }
  }
}

/**
 * `nebutra env show` — Show current env vars with masking
 */
async function handleShow(options: EnvCommandOptions): Promise<void> {
  status("Reading environment variables...", "info");

  const root = findMonorepoRoot();
  const currentVars = loadEnvFile(root);
  const exampleVars = loadEnvExample(root);

  const displayVars: Record<string, string> = {};

  for (const key of Object.keys(exampleVars)) {
    if (key in currentVars) {
      const value = currentVars[key];
      displayVars[key] = isSensitive(key, value) ? maskValue(value) : value || "(empty)";
    } else {
      displayVars[key] = "(not set)";
    }
  }

  if (options.format === "json") {
    const jsonVars: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(displayVars)) {
      // In JSON format, include actual values (with masking)
      jsonVars[key] = value;
    }

    output(jsonVars, { format: "json" });
  } else {
    sectionHeader("Current Environment Variables");

    const rows = Object.entries(displayVars).map(([key, value]) => ({
      Variable: pc.cyan(key),
      Value: value,
    }));

    output(rows, { format: "table" });
    status("Note: Sensitive values (KEY, TOKEN, SECRET, PASSWORD) are masked", "info");
  }
}

/**
 * Register the `env` command group
 * Usage: nebutra env <subcommand>
 */
export function registerEnvCommand(program: Command): void {
  const envCommand = program
    .command("env <verb>")
    .description("Manage environment variables and configuration")
    .option("--dry-run", "Show what would be done without making changes")
    .option("--yes", "Skip confirmations and use defaults")
    .option("--format <type>", "Output format: json, plain", "plain")
    .action(async (verb: string, options: OptionValues) => {
      const globalOptions = options.optsWithGlobals?.();
      const mergedOptions: EnvCommandOptions = {
        dryRun: options.dryRun || globalOptions?.dryRun,
        yes: options.yes || globalOptions?.yes,
        format: (options.format || globalOptions?.format) as "json" | "plain",
      };

      try {
        switch (verb) {
          case "validate":
            await handleValidate(mergedOptions);
            break;

          case "template":
            await handleTemplate(mergedOptions);
            break;

          case "diff":
            await handleDiff(mergedOptions);
            break;

          case "show":
            await handleShow(mergedOptions);
            break;

          default:
            status(
              `Unknown env subcommand: ${verb}. Valid commands: validate, template, diff, show`,
              "error",
            );
            process.exit(1);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        status(`Environment command failed: ${message}`, "error");
        debug("Full error", { error });
        process.exit(1);
      }
    });

  // Add help text
  envCommand.addHelpText(
    "after",
    `
Examples:
  nebutra env validate              Check all required vars are set
  nebutra env template              Generate .env.local from .env.example with prompts
  nebutra env template --yes        Generate .env.local with defaults (non-interactive)
  nebutra env diff                  Compare .env vs .env.example
  nebutra env show                  Display current vars (masking secrets)
  nebutra env show --format json    Output as JSON

Flags:
  --dry-run                         Show what would be done without making changes
  --yes                             Skip confirmations and use defaults
  --format <type>                   Output format: json, plain (default: plain, auto-json in non-TTY)

Sensitive Variables:
  Variables with KEY, TOKEN, SECRET, PASSWORD in their names are masked in output.
  This prevents accidental exposure of credentials.
    `,
  );
}
