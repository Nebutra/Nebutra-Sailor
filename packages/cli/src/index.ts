#!/usr/bin/env node

import { Command } from "commander";
import { addCommand } from "./commands/add.js";
import { registerAdminCommand } from "./commands/admin.js";
import { registerAiCommand } from "./commands/ai.js";
import { registerAuthCommand } from "./commands/auth.js";
import { registerBillingCommand } from "./commands/billing.js";
import { registerBrandCommand } from "./commands/brand.js";
import { registerCommunityCommand } from "./commands/community.js";
import { registerCompletionsCommand } from "./commands/completions.js";
import { registerCreateCommand } from "./commands/create.js";
import { registerDbCommand } from "./commands/db.js";
import { registerDevCommand } from "./commands/dev.js";
import { registerEcosystemCommand } from "./commands/ecosystem.js";
import { registerEnvCommand } from "./commands/env.js";
import { registerGenerateCommand } from "./commands/generate.js";
import { registerGrowthCommand } from "./commands/growth.js";
import { registerI18nCommand } from "./commands/i18n.js";
import { registerInfraCommand } from "./commands/infra.js";
import { initCommand } from "./commands/init.js";
import { registerLicenseCommand } from "./commands/license.js";
import { registerMcpCommand } from "./commands/mcp-server.js";
import { registerPresetCommand } from "./commands/preset.js";
import { registerSchemaCommand } from "./commands/schema.js";
import { registerSearchCommand } from "./commands/search-mgmt.js";
import { registerSecretsCommand } from "./commands/secrets.js";
import { registerServicesCommand } from "./commands/services.js";
import { registerStatsCommand } from "./commands/stats.js";
import { registerTestCommand } from "./commands/test.js";
import { logger } from "./utils/logger.js";
import { maybeNotifyUpdate } from "./utils/update-notifier.js";

// TODO(error-handling): New commands MUST wrap their `.action(...)` body with
// `runCommand(...)` from "./utils/command-error.js" and throw `CommandError`
// (with a specific `ExitCode`) instead of calling `process.exit` directly.
// Existing commands migrate opportunistically — see command-error.ts for the
// migration guide.

const VERSION = "0.1.0";

async function main() {
  // Start update check in background (non-blocking)
  const notifyUpdate = await maybeNotifyUpdate(VERSION);

  const program = new Command();

  // Auto-enable --yes mode when running in non-TTY (piped, CI/CD, Agent environments)
  const isInteractive = process.stdin.isTTY !== false && process.stdout.isTTY !== false;

  program
    .name("nebutra")
    .description(
      "Nebutra — unified CLI for project scaffolding, component management, and AI integration",
    )
    .version(VERSION)
    // Existing options
    .option("--verbose", "Enable verbose output")
    .option("--quiet", "Suppress non-essential output")
    // Global flags
    .option("--format <type>", "Output format: json, table, plain")
    .option("--yes", "Skip all interactive prompts (Agent mode)")
    .option("--no-interactive", "Alias for --yes")
    .option("--no-color", "Disable colored output");

  // ─── Core commands ───────────────────────────────────────

  program
    .command("init")
    .description("Initialize a Nebutra project and create nebutra.config.json")
    .option("--dry-run", "Preview changes without writing files (exits with code 10)")
    .option("--if-not-exists", "Skip initialization if nebutra.config.json already exists")
    .action(async (options) => {
      const globalOptions = options.optsWithGlobals ? options.optsWithGlobals() : options;
      await initCommand({
        dryRun: options.dryRun || false,
        yes: globalOptions.yes || false,
        ifNotExists: options.ifNotExists || false,
      });
    });

  program
    .command("add [components...]")
    .description("Add a component or feature to your project")
    .option("--21st <id>", "Fetch and install a component from 21st.dev")
    .option("--v0 <url>", "Fetch and install a component from v0.dev")
    .option("--provider <id>", "Specify a backend provider for a system feature (e.g. upstash)")
    .option("--dry-run", "Preview what would be installed without making changes (exit code 10)")
    .option("--yes", "Skip all interactive prompts and use defaults (Agent mode)")
    .option("--if-not-exists", "Skip installation if component already exists")
    .action(async (components, options) => {
      const globalOptions = options.optsWithGlobals ? options.optsWithGlobals() : options;
      await addCommand(components, {
        ...options,
        yes: globalOptions.yes || !isInteractive,
      });
    });

  // ─── Delegated commands ──────────────────────────────────

  registerCreateCommand(program);
  registerMcpCommand(program);
  registerSchemaCommand(program);
  registerBrandCommand(program);
  registerI18nCommand(program);
  registerInfraCommand(program);
  registerEnvCommand(program);
  registerLicenseCommand(program);
  registerAiCommand(program);
  registerAuthCommand(program);
  registerBillingCommand(program);
  registerStatsCommand(program);
  registerDbCommand(program);
  registerGenerateCommand(program);
  registerPresetCommand(program);
  registerDevCommand(program);
  registerTestCommand(program);

  // ─── Platform & ecosystem commands ──────────────────────
  registerAdminCommand(program);
  registerCommunityCommand(program);
  registerGrowthCommand(program);
  registerEcosystemCommand(program);
  registerServicesCommand(program);
  registerSearchCommand(program);
  registerSecretsCommand(program);

  // ─── Utility commands ────────────────────────────────────

  registerCompletionsCommand(program);

  program
    .command("doctor")
    .description("Check your Nebutra project setup for common issues")
    .action(async () => {
      const { logger } = await import("./utils/logger.js");
      const { findMonorepoRoot } = await import("./utils/delegate.js");
      const fs = await import("node:fs");
      const path = await import("node:path");

      logger.info("Running project health check...");
      let hasErrors = false;
      const root = findMonorepoRoot();

      // Check Node version
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.replace("v", "").split(".")[0], 10);
      if (majorVersion < 22) {
        logger.error(`Node.js >= 22 required, found ${nodeVersion}`);
        hasErrors = true;
      } else {
        logger.success(`Node.js version OK (${nodeVersion})`);
      }

      // Check nebutra.config.json
      if (fs.existsSync(path.join(root, "nebutra.config.json"))) {
        logger.success("nebutra.config.json found");
      } else {
        logger.warn("nebutra.config.json missing. Try running 'nebutra init'");
      }

      // Check package.json
      if (fs.existsSync(path.join(root, "package.json"))) {
        logger.success("package.json found");
      } else {
        logger.error("No package.json found in root directory");
        hasErrors = true;
      }

      // Check .env files
      const hasEnv =
        fs.existsSync(path.join(root, ".env")) || fs.existsSync(path.join(root, ".env.local"));
      if (hasEnv) {
        logger.success("Environment variables configured");
      } else {
        logger.warn("No .env or .env.local found. Some features may not work properly.");
      }

      if (hasErrors) {
        logger.error("Doctor found critical issues that require your attention.");
        process.exit(1);
      } else {
        logger.success("Doctor is happy. Your project looks healthy!");
      }
    });

  // ─── Parse & run ─────────────────────────────────────────

  // Merge --no-interactive into --yes for unified handling
  program.hook("preAction", (thisCommand) => {
    const opts = thisCommand.optsWithGlobals();
    // Set --yes=true if running non-interactively or in non-TTY
    if (!isInteractive || opts.noInteractive) {
      opts.yes = true;
    }
  });

  // Add help text with examples for Agents
  program.addHelpText(
    "after",
    `
Examples:
  $ nebutra init                          Initialize a new project
  $ nebutra add button card --yes         Add components non-interactively
  $ nebutra create ./my-app               Scaffold a new project
  $ nebutra dev --preset=ai-saas          Start dev for AI SaaS preset
  $ nebutra db migrate                    Run pending database migrations
  $ nebutra generate app blog             Scaffold a new app
  $ nebutra brand palette --primary=#7C3AED  Generate color palette
  $ nebutra preset list --format json     List available presets
  $ nebutra infra up --lite               Start PostgreSQL + Redis
  $ nebutra test e2e                      Run Playwright E2E tests
  $ nebutra stats                         Monorepo overview
  $ nebutra schema --all                  Full CLI schema (for Agents)

  Platform & Ecosystem:
  $ nebutra admin tenants                 List all tenants
  $ nebutra admin health                  Platform-wide health check
  $ nebutra community health --period 30d Community health score
  $ nebutra community showcase list       Browse project showcase
  $ nebutra growth dashboard              Growth metrics overview
  $ nebutra growth funnel --segment paid  Conversion funnel by segment
  $ nebutra growth pulse --focus retention AI growth insights
  $ nebutra ecosystem status              Ecosystem overview dashboard
  $ nebutra ecosystem publish --tag latest Publish to template marketplace
  $ nebutra ecosystem ideas list          Browse ideas marketplace
  $ nebutra ecosystem opc register        Join OPC member network
  $ nebutra services status               Microservice health overview
  $ nebutra search reindex products       Reindex search index
  $ nebutra secrets list --tenant org_123 List encrypted secrets

Exit Codes:
  0   Success          2   Invalid arguments
  1   General error    3   Resource not found
  4   Permission denied   5   Conflict/exists
  6   Network error (retryable)   10  Dry-run OK

Environment:
  NEBUTRA_LOG_LEVEL       Log level (debug|info|warn|error)
  NEBUTRA_OUTPUT_FORMAT   Output format (json|table|plain)
  NO_COLOR                Disable colored output
  CI                      Auto-enable non-interactive mode
`,
  );

  if (process.argv.length <= 2) {
    program.outputHelp();
    process.exit(0);
  }

  await program.parseAsync(process.argv);

  // Show update notification (if available) after command completes
  await notifyUpdate();
}

main().catch((err) => logger.error(err instanceof Error ? err.message : String(err)));
