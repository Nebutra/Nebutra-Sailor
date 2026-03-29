#!/usr/bin/env node

import { Command } from "commander";
import { addCommand } from "./commands/add.js";
import { initCommand } from "./commands/init.js";
import { registerCreateCommand } from "./commands/create.js";
import { registerMcpCommand } from "./commands/mcp-server.js";
import { registerCompletionsCommand } from "./commands/completions.js";
import { maybeNotifyUpdate } from "./utils/update-notifier.js";

const VERSION = "0.1.0";

async function main() {
  // Start update check in background (non-blocking)
  const notifyUpdate = await maybeNotifyUpdate(VERSION);

  const program = new Command();

  program
    .name("nebutra")
    .description("Nebutra — unified CLI for project scaffolding, component management, and AI integration")
    .version(VERSION)
    .option("--verbose", "Enable verbose output")
    .option("--quiet", "Suppress non-essential output");

  // ─── Core commands ───────────────────────────────────────

  program
    .command("init")
    .description("Initialize a Nebutra project and create nebutra.config.json")
    .action(async () => {
      await initCommand();
    });

  program
    .command("add [components...]")
    .description("Add a component or feature to your project")
    .option("--21st <id>", "Fetch and install a component from 21st.dev")
    .option("--v0 <url>", "Fetch and install a component from v0.dev")
    .action(async (components, options) => {
      await addCommand(components, options);
    });

  // ─── Delegated commands ──────────────────────────────────

  registerCreateCommand(program);
  registerMcpCommand(program);

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

  await program.parseAsync(process.argv);

  // Show update notification (if available) after command completes
  await notifyUpdate();
}

main().catch(console.error);
