#!/usr/bin/env node

import { Command } from "commander";
import { addCommand } from "./commands/add.js";
import { registerAiCommand } from "./commands/ai.js";
import { registerAuthCommand } from "./commands/auth.js";
import { registerBillingCommand } from "./commands/billing.js";
import { registerBrandCommand } from "./commands/brand.js";
import { registerCompletionsCommand } from "./commands/completions.js";
import { registerCreateCommand } from "./commands/create.js";
import { registerDbCommand } from "./commands/db.js";
import { registerDevCommand } from "./commands/dev.js";
import { registerEnvCommand } from "./commands/env.js";
import { registerGenerateCommand } from "./commands/generate.js";
import { registerI18nCommand } from "./commands/i18n.js";
import { registerInfraCommand } from "./commands/infra.js";
import { initCommand } from "./commands/init.js";
import { registerMcpCommand } from "./commands/mcp-server.js";
import { registerPresetCommand } from "./commands/preset.js";
import { registerSchemaCommand } from "./commands/schema.js";
import { registerStatsCommand } from "./commands/stats.js";
import { registerTestCommand } from "./commands/test.js";
import { maybeNotifyUpdate } from "./utils/update-notifier.js";

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
  registerAiCommand(program);
  registerAuthCommand(program);
  registerBillingCommand(program);
  registerStatsCommand(program);
  registerDbCommand(program);
  registerGenerateCommand(program);
  registerPresetCommand(program);
  registerDevCommand(program);
  registerTestCommand(program);

  // ─── Utility commands ────────────────────────────────────

  registerCompletionsCommand(program);

  program
    .command("doctor")
    .description("Check your Nebutra project setup for common issues")
    .action(async () => {
      const { logger } = await import("./utils/logger.js");
      logger.info("Running project health check...");
      // TODO: implement doctor checks (deps, config, env, etc.)
      logger.warn("Doctor command is not yet implemented.");
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
  $ nebutra generate component hero       Scaffold a UI component + story
  $ nebutra brand palette --primary=#7C3AED  Generate color palette
  $ nebutra preset list --format json     List available presets
  $ nebutra infra up --lite               Start PostgreSQL + Redis
  $ nebutra env validate                  Check required env vars
  $ nebutra test e2e                      Run Playwright E2E tests
  $ nebutra ai models                     List configured AI providers
  $ nebutra billing status                Check payment provider config
  $ nebutra i18n status                   Show translation coverage
  $ nebutra stats                         Monorepo overview
  $ nebutra schema --all                  Full CLI schema (for Agents)

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

  await program.parseAsync(process.argv);

  // Show update notification (if available) after command completes
  await notifyUpdate();
}

main().catch(console.error);
