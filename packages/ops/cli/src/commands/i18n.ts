import fs, { lstatSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Command } from "commander";
import pc from "picocolors";
import { DelegateResult, delegate, pnpmRun } from "../utils/delegate.js";
import { ExitCode } from "../utils/exit-codes.js";
import { logger } from "../utils/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface I18nCommandOptions {
  dryRun?: boolean;
  format?: string;
  interactive?: boolean;
}

interface ValidationResult {
  locale: string;
  totalKeys: number;
  missingKeys: string[];
  extraKeys: string[];
  coverage: number;
}

interface StatusResult {
  locale: string;
  coverage: number;
  totalKeys: number;
  translatedKeys: number;
  missingKeys: number;
}

/**
 * Find all message directories in the monorepo
 */
function findMessageDirectories(): Map<string, string> {
  const dirs = new Map<string, string>();
  const appsDir = path.join(__dirname, "../../../apps");

  if (!fs.existsSync(appsDir)) {
    return dirs;
  }

  try {
    const appFolders = readdirSync(appsDir);

    for (const app of appFolders) {
      const appPath = path.join(appsDir, app);
      const messagesPath = path.join(appPath, "messages");

      if (fs.existsSync(messagesPath) && lstatSync(messagesPath).isDirectory()) {
        dirs.set(app, messagesPath);
      }
    }
  } catch (error) {
    logger.debug(
      `Error scanning apps directory: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return dirs;
}

/**
 * Parse a locale JSON file and extract all keys (flattened)
 */
function extractKeys(obj: any, prefix = ""): Set<string> {
  const keys = new Set<string>();

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const nestedKeys = extractKeys(value, fullKey);
      for (const k of nestedKeys) {
        keys.add(k);
      }
    } else {
      keys.add(fullKey);
    }
  }

  return keys;
}

/**
 * Load a locale JSON file
 */
function loadLocaleFile(filePath: string): Record<string, any> | null {
  try {
    const content = readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    logger.debug(
      `Failed to parse ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

/**
 * Format output based on requested format
 */
function formatOutput(data: any, format?: string) {
  if (format === "json") {
    console.log(JSON.stringify(data, null, 2));
  } else {
    return data; // Will be formatted by the handler
  }
}

/**
 * Handle 'nebutra i18n sync' command
 */
async function handleI18nSync(options: I18nCommandOptions) {
  logger.info("Syncing language files across the project...");

  // First try the landing-page translate script (if it exists)
  const result = await pnpmRun("translate", {
    filter: "landing-page",
    dryRun: options.dryRun,
    interactive: options.interactive ?? true,
  });

  if (result.exitCode !== 0) {
    logger.warn("Landing page translate script not found or failed. Trying sync-lang.mjs...");

    const syncResult = await delegate({
      command: "node",
      args: ["scripts/sync-lang.mjs"],
      dryRun: options.dryRun,
      interactive: options.interactive ?? true,
      label: "Sync language files",
    });

    if (syncResult.exitCode !== 0) {
      logger.error("Failed to sync language files");
      process.exit(syncResult.exitCode);
    }

    if (options.format === "json") {
      console.log(JSON.stringify({ command: "i18n:sync", exitCode: 0, success: true }, null, 2));
    } else if (!options.dryRun) {
      logger.success("Language files synced successfully");
    }
  } else {
    if (options.format === "json") {
      console.log(JSON.stringify({ command: "i18n:sync", exitCode: 0, success: true }, null, 2));
    } else if (!options.dryRun) {
      logger.success("Language files synced successfully");
    }
  }
}

/**
 * Handle 'nebutra i18n validate' command
 */
async function handleI18nValidate(options: I18nCommandOptions) {
  logger.info("Validating translation files...");

  const messagesDirs = findMessageDirectories();

  if (messagesDirs.size === 0) {
    logger.warn("No message directories found in the project");
    process.exit(ExitCode.NOT_FOUND);
  }

  const results: Map<string, ValidationResult[]> = new Map();
  let hasErrors = false;

  for (const [app, messagesPath] of messagesDirs) {
    const appResults: ValidationResult[] = [];

    try {
      const localeFiles = readdirSync(messagesPath).filter((f) => f.endsWith(".json"));

      if (localeFiles.length === 0) {
        continue;
      }

      // Load reference locale (en.json) as baseline
      const referencePath = path.join(messagesPath, "en.json");
      const referenceData = loadLocaleFile(referencePath);

      if (!referenceData) {
        logger.warn(`Could not load reference locale en.json from ${app}`);
        continue;
      }

      const referenceKeys = extractKeys(referenceData);

      // Compare all other locales against reference
      for (const localeFile of localeFiles) {
        if (localeFile === "en.json") continue;

        const locale = localeFile.replace(".json", "");
        const localePath = path.join(messagesPath, localeFile);
        const localeData = loadLocaleFile(localePath);

        if (!localeData) {
          logger.debug(`Could not parse ${localeFile}`);
          continue;
        }

        const localeKeys = extractKeys(localeData);
        const missingKeys = Array.from(referenceKeys).filter((k) => !localeKeys.has(k));
        const extraKeys = Array.from(localeKeys).filter((k) => !referenceKeys.has(k));
        const coverage =
          referenceKeys.size > 0
            ? ((referenceKeys.size - missingKeys.length) / referenceKeys.size) * 100
            : 100;

        if (missingKeys.length > 0 || extraKeys.length > 0) {
          hasErrors = true;
        }

        appResults.push({
          locale,
          totalKeys: referenceKeys.size,
          missingKeys,
          extraKeys,
          coverage: Math.round(coverage * 100) / 100,
        });
      }

      if (appResults.length > 0) {
        results.set(app, appResults);
      }
    } catch (error) {
      logger.debug(
        `Error validating ${app}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (options.format === "json") {
    const output = {
      command: "i18n:validate",
      success: !hasErrors,
      results: Array.from(results.entries()).reduce(
        (acc, [app, appResults]) => {
          acc[app] = appResults;
          return acc;
        },
        {} as Record<string, ValidationResult[]>,
      ),
    };
    console.log(JSON.stringify(output, null, 2));
  } else {
    // Pretty-print validation results
    for (const [app, appResults] of results) {
      logger.info(`${pc.bold(app)}:`);

      for (const result of appResults) {
        const coverageColor =
          result.coverage >= 100 ? pc.green : result.coverage >= 80 ? pc.yellow : pc.red;
        const coverageStr = coverageColor(`${result.coverage}%`);

        logger.info(
          `  ${pc.cyan(result.locale.padEnd(5))} ${coverageStr.padEnd(20)} [${result.totalKeys} keys]`,
        );

        if (result.missingKeys.length > 0) {
          logger.warn(
            `    Missing: ${result.missingKeys.slice(0, 5).join(", ")}${result.missingKeys.length > 5 ? ` (+ ${result.missingKeys.length - 5} more)` : ""}`,
          );
        }

        if (result.extraKeys.length > 0) {
          logger.warn(
            `    Extra: ${result.extraKeys.slice(0, 5).join(", ")}${result.extraKeys.length > 5 ? ` (+ ${result.extraKeys.length - 5} more)` : ""}`,
          );
        }
      }
    }
  }

  if (hasErrors) {
    process.exit(ExitCode.CONFLICT);
  }
}

/**
 * Handle 'nebutra i18n add <locale>' command
 */
async function handleI18nAdd(locale: string, options: I18nCommandOptions) {
  // Validate locale format (should be 2-letter or xx-YY format)
  if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(locale)) {
    logger.error(`Invalid locale format: ${locale}. Use 'en', 'es', 'zh-CN', etc.`);
    process.exit(ExitCode.INVALID_ARGS);
  }

  const messagesDirs = findMessageDirectories();

  if (messagesDirs.size === 0) {
    logger.error("No message directories found in the project");
    process.exit(ExitCode.NOT_FOUND);
  }

  const createdLocales: Array<{ app: string; path: string }> = [];
  let hasErrors = false;

  for (const [app, messagesPath] of messagesDirs) {
    const newLocalePath = path.join(messagesPath, `${locale}.json`);

    // Check if locale already exists
    if (fs.existsSync(newLocalePath)) {
      logger.warn(`Locale ${locale} already exists in ${app}`);
      continue;
    }

    try {
      // Load reference (en.json) as template
      const referencePath = path.join(messagesPath, "en.json");
      const referenceData = loadLocaleFile(referencePath);

      if (!referenceData) {
        logger.warn(`Could not load reference en.json from ${app}, skipping...`);
        continue;
      }

      // Create a copy with empty string values to indicate missing translations
      const newLocaleData = JSON.parse(JSON.stringify(referenceData));

      // Recursively set all string values to empty
      function emptyValues(obj: any): void {
        for (const key in obj) {
          if (typeof obj[key] === "string") {
            obj[key] = "";
          } else if (typeof obj[key] === "object" && obj[key] !== null) {
            emptyValues(obj[key]);
          }
        }
      }

      emptyValues(newLocaleData);

      if (!options.dryRun) {
        writeFileSync(newLocalePath, JSON.stringify(newLocaleData, null, 2) + "\n");
        createdLocales.push({ app, path: newLocalePath });
        logger.success(`Created ${locale} locale in ${app}`);
      } else {
        logger.info(`Would create ${locale} locale in ${app}`);
      }
    } catch (error) {
      logger.error(
        `Failed to create locale in ${app}: ${error instanceof Error ? error.message : String(error)}`,
      );
      hasErrors = true;
    }
  }

  if (options.format === "json") {
    console.log(
      JSON.stringify(
        {
          command: "i18n:add",
          locale,
          dryRun: options.dryRun || false,
          created: createdLocales,
          success: !hasErrors,
        },
        null,
        2,
      ),
    );
  } else if (!options.dryRun) {
    logger.success(`Locale '${locale}' added to ${createdLocales.length} app(s)`);
  }

  if (hasErrors) {
    process.exit(ExitCode.ERROR);
  }
}

/**
 * Handle 'nebutra i18n status' command
 */
async function handleI18nStatus(options: I18nCommandOptions) {
  logger.info("Checking translation coverage...");

  const messagesDirs = findMessageDirectories();

  if (messagesDirs.size === 0) {
    logger.warn("No message directories found in the project");
    process.exit(ExitCode.NOT_FOUND);
  }

  const results: Map<string, StatusResult[]> = new Map();
  let totalCoverage = 0;
  let appCount = 0;

  for (const [app, messagesPath] of messagesDirs) {
    const appResults: StatusResult[] = [];

    try {
      const localeFiles = readdirSync(messagesPath).filter((f) => f.endsWith(".json"));

      if (localeFiles.length === 0) {
        continue;
      }

      // Load reference locale
      const referencePath = path.join(messagesPath, "en.json");
      const referenceData = loadLocaleFile(referencePath);

      if (!referenceData) {
        logger.debug(`Could not load reference locale from ${app}`);
        continue;
      }

      const referenceKeys = extractKeys(referenceData);

      for (const localeFile of localeFiles) {
        const locale = localeFile.replace(".json", "");
        const localePath = path.join(messagesPath, localeFile);
        const localeData = loadLocaleFile(localePath);

        if (!localeData) {
          continue;
        }

        const localeKeys = extractKeys(localeData);
        const translatedKeys = Array.from(localeKeys).filter((k) => {
          // Count as translated if key exists and value is non-empty
          const value = localeData[k.split(".")[0]];
          return value !== undefined && value !== "";
        }).length;

        const missingKeys = referenceKeys.size - translatedKeys;
        const coverage = referenceKeys.size > 0 ? (translatedKeys / referenceKeys.size) * 100 : 0;

        appResults.push({
          locale,
          coverage: Math.round(coverage * 100) / 100,
          totalKeys: referenceKeys.size,
          translatedKeys,
          missingKeys,
        });
      }

      if (appResults.length > 0) {
        results.set(app, appResults);
        appCount++;
        totalCoverage += appResults.reduce((sum, r) => sum + r.coverage, 0) / appResults.length;
      }
    } catch (error) {
      logger.debug(
        `Error checking status for ${app}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (options.format === "json") {
    const output = {
      command: "i18n:status",
      averageCoverage: appCount > 0 ? Math.round((totalCoverage / appCount) * 100) / 100 : 0,
      results: Array.from(results.entries()).reduce(
        (acc, [app, appResults]) => {
          acc[app] = appResults;
          return acc;
        },
        {} as Record<string, StatusResult[]>,
      ),
    };
    console.log(JSON.stringify(output, null, 2));
  } else {
    // Pretty-print status
    for (const [app, appResults] of results) {
      logger.info(`${pc.bold(app)}:`);

      for (const result of appResults) {
        let coverageBar = "";
        const barLength = 20;
        const filledLength = Math.round((result.coverage / 100) * barLength);
        coverageBar = "█".repeat(filledLength) + "░".repeat(barLength - filledLength);

        const coverageColor =
          result.coverage >= 100 ? pc.green : result.coverage >= 80 ? pc.yellow : pc.red;
        const coverageStr = coverageColor(`${result.coverage.toFixed(1)}%`);

        logger.info(`  ${pc.cyan(result.locale.padEnd(5))} [${coverageBar}] ${coverageStr}`);
        logger.info(
          `    ${result.translatedKeys}/${result.totalKeys} keys (${result.missingKeys} missing)`,
        );
      }
    }

    if (appCount > 0) {
      const avgCoverage = totalCoverage / appCount;
      const avgColor = avgCoverage >= 100 ? pc.green : avgCoverage >= 80 ? pc.yellow : pc.red;
      logger.info(`\nAverage coverage: ${avgColor(avgCoverage.toFixed(1) + "%")}`);
    }
  }
}

/**
 * Register the i18n command group
 */
export function registerI18nCommand(program: Command) {
  const i18n = program.command("i18n").description("Manage internationalization and translations");

  // nebutra i18n sync
  i18n
    .command("sync")
    .description("Synchronize language translations across the project")
    .option("--dry-run", "Preview changes without executing")
    .option("--format <type>", "Output format: json or plain")
    .action(async (options) => {
      const globalOptions = options.optsWithGlobals?.() || options;
      await handleI18nSync({
        dryRun: options.dryRun || false,
        format: options.format || globalOptions.format,
        interactive: globalOptions.yes !== true,
      });
    });

  // nebutra i18n validate
  i18n
    .command("validate")
    .description("Validate all locale files for missing or extra keys")
    .option("--format <type>", "Output format: json or plain")
    .action(async (options) => {
      const globalOptions = options.optsWithGlobals?.() || options;
      await handleI18nValidate({
        format: options.format || globalOptions.format,
        interactive: globalOptions.yes !== true,
      });
    });

  // nebutra i18n add
  i18n
    .command("add <locale>")
    .description("Add a new locale with template files (e.g. 'en', 'es', 'zh-CN')")
    .option("--dry-run", "Preview what would be created without writing files")
    .option("--format <type>", "Output format: json or plain")
    .action(async (locale: string, options) => {
      const globalOptions = options.optsWithGlobals?.() || options;
      await handleI18nAdd(locale, {
        dryRun: options.dryRun || false,
        format: options.format || globalOptions.format,
        interactive: globalOptions.yes !== true,
      });
    });

  // nebutra i18n status
  i18n
    .command("status")
    .description("Show translation coverage per locale and app")
    .option("--format <type>", "Output format: json or plain")
    .action(async (options) => {
      const globalOptions = options.optsWithGlobals?.() || options;
      await handleI18nStatus({
        format: options.format || globalOptions.format,
        interactive: globalOptions.yes !== true,
      });
    });
}
