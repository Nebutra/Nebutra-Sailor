#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { addCommand } from "./commands/add";
import { registerAdminCommand } from "./commands/admin";
import { registerAiCommand } from "./commands/ai";
import { registerAuthCommand } from "./commands/auth";
import { registerBackendCommand } from "./commands/backend";
import { registerBillingCommand } from "./commands/billing";
import { registerBrandCommand } from "./commands/brand";
import { registerCommunityCommand } from "./commands/community";
import { registerCompletionsCommand } from "./commands/completions";
import { registerCreateCommand } from "./commands/create";
import { registerDbCommand } from "./commands/db";
import { registerDevCommand } from "./commands/dev";
import { registerE2eCommand } from "./commands/e2e";
import { registerEcosystemCommand } from "./commands/ecosystem";
import { registerEnvCommand } from "./commands/env";
import { registerGenerateCommand } from "./commands/generate";
import { registerGrowthCommand } from "./commands/growth";
import { registerI18nCommand } from "./commands/i18n";
import { registerInfraCommand } from "./commands/infra";
import { initCommand } from "./commands/init";
import { registerLicenseCommand } from "./commands/license";
import { registerLinkCommand } from "./commands/link";
import { registerLogoutCommand } from "./commands/logout";
import { registerMcpCommand } from "./commands/mcp-server";
import { registerPresetCommand } from "./commands/preset";
import { registerSchemaCommand } from "./commands/schema";
import { registerSearchCommand } from "./commands/search-mgmt";
import { registerSecretsCommand } from "./commands/secrets";
import { registerServicesCommand } from "./commands/services";
import { registerStatsCommand } from "./commands/stats";
import { registerTestCommand } from "./commands/test";
import { registerThemeCommand } from "./commands/theme";
import { registerUnlinkCommand } from "./commands/unlink";
import { registerUpgradeCommand } from "./commands/upgrade";
import { registerWorkflowCommand } from "./commands/workflow";
import { ExitCode } from "./utils/exit-codes";
import { maybeShowFirstRunBanner } from "./utils/first-run";
import { logger } from "./utils/logger";
import { maybeNotifyUpdate } from "./utils/update-notifier";

// TODO(error-handling): New commands MUST wrap their `.action(...)` body with
// `runCommand(...)` from "./utils/command-error" and throw `CommandError`
// (with a specific `ExitCode`) instead of calling `process.exit` directly.
// Existing commands migrate opportunistically — see command-error.ts for the
// migration guide.
//
// Command-naming convention: <resource> <action> (noun-verb), matching gh,
// vercel, and supabase. Examples: `workflow init <provider>`, `db migrate`,
// `infra up`, `env validate`, `secrets list`, `search reindex`, `services
// restart`. Top-level verbs (`init`, `add`, `create`, `dev`, `build`, `lint`,
// `typecheck`, `doctor`) are exceptions — they are the project's primary
// daily-use verbs and stay flat. Exceptions: `e2e <suite>` takes a positional
// argument instead of an action (the suite name *is* the resource). When
// renaming a command, ALWAYS keep the old form as a `.alias()` so existing
// docs/scripts continue to work.

// Read version from package.json at module load. Same relative path works for
// both `tsx src/index.ts` (dev) and `node dist/index.js` (prod) because src/
// and dist/ are siblings under packages/ops/cli/.
const PKG_JSON_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "package.json");
const VERSION = (JSON.parse(readFileSync(PKG_JSON_PATH, "utf8")) as { version: string }).version;

async function main() {
  // Show first-run telemetry opt-out banner (gated by TTY + env + marker)
  maybeShowFirstRunBanner();

  // Start update check in background (non-blocking)
  const notifyUpdate = await maybeNotifyUpdate(VERSION);

  const program = new Command();

  // Auto-enable --yes mode when running in non-TTY (piped, CI/CD, Agent environments)
  const isInteractive = process.stdin.isTTY !== false && process.stdout.isTTY !== false;

  program
    .name("nebutra")
    .description(
      "Nebutra — governance-first CLI for topology scaffolding, registry features, and platform operations",
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
    .description("Add a registry-backed platform feature or external UI component")
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
  registerWorkflowCommand(program);
  registerBackendCommand(program);
  registerE2eCommand(program);
  registerThemeCommand(program);

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

  // ─── Lifecycle commands (logout / upgrade / link / unlink) ─
  registerLogoutCommand(program);
  registerUpgradeCommand(program);
  registerLinkCommand(program);
  registerUnlinkCommand(program);

  program
    .command("doctor")
    .description("Check your Nebutra project setup for common issues")
    .action(async () => {
      const { logger } = await import("./utils/logger");
      const { findMonorepoRoot } = await import("./utils/delegate");
      const fs = await import("node:fs");
      const path = await import("node:path");

      logger.info("Running project health check...");
      let hasErrors = false;
      const root = findMonorepoRoot();

      // Check Node version
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.replace("v", "").split(".")[0] ?? "0", 10);
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
        process.exit(ExitCode.CONFIG_ERROR);
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
  $ nebutra add cache --provider upstash-redis --yes  Install a registry feature
  $ nebutra create ./my-app               Scaffold a new project
  $ nebutra dev --preset=ai-saas          Start dev for AI SaaS preset
  $ nebutra db migrate                    Run pending database migrations
  $ nebutra generate app blog             Scaffold a new app
  $ nebutra brand palette --primary=#0047FF  Generate token-aligned blue palette
  $ nebutra theme list --format json    List registry-backed themes
  $ nebutra theme inspect neon          Inspect a theme governance manifest
  $ nebutra preset list --format json     List available presets
  $ nebutra infra up --lite               Start PostgreSQL + Redis
  $ nebutra test e2e                      Run Playwright E2E tests
  $ nebutra stats                         Monorepo overview
  $ nebutra schema --all                  Full CLI schema (for Agents)
  $ nebutra license verify                Verify the scaffold-meta HMAC signature
  $ nebutra license verify --format json  Same, in JSON for Agents

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
  $ nebutra services status               Microservice health overview
  $ nebutra search reindex products       Reindex search index
  $ nebutra secrets list --tenant org_123 List encrypted secrets

Exit Codes:
  0   Success                       2   Invalid arguments
  1   General error                 3   Resource not found
  4   Permission denied             5   Conflict/exists
  6   Network error (retryable)     7   Timeout (retryable)
  8   Cancelled by user             9   Config error
  10  Dry-run OK                    11  Incompatible
  12  Resource exhausted

Environment:
  NEBUTRA_LOG_LEVEL       Log level (debug|info|warn|error)
  NEBUTRA_OUTPUT_FORMAT   Output format (json|table|plain)
  NO_COLOR                Disable colored output
  CI                      Auto-enable non-interactive mode
`,
  );

  if (process.argv.length <= 2) {
    program.outputHelp();
    process.exit(ExitCode.SUCCESS);
  }

  await program.parseAsync(process.argv);

  // Show update notification (if available) after command completes
  await notifyUpdate();
}

main().catch((err) => logger.error(err instanceof Error ? err.message : String(err)));
