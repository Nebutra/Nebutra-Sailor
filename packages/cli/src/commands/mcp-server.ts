import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as p from "@clack/prompts";
import type { Command } from "commander";
import pc from "picocolors";
import { logger } from "../utils/logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Resolve the nebutra-mcp server binary from multiple sources:
 * 1. Sibling package in monorepo (development)
 * 2. Global system PATH
 */
function resolveMcpServerBinary(): string {
  const strategies = [
    // Strategy 1: Monorepo sibling (pnpm/yarn workspace)
    () => {
      const siblingPath = resolve(__dirname, "../../../mcp/dist/server/contextServer.js");
      return siblingPath;
    },
  ];

  for (const strategy of strategies) {
    try {
      const path = strategy();
      return path;
    } catch (error) {
      logger.debug("MCP server binary resolution strategy failed", { error });
    }
  }

  // Fallback: try to find via PATH
  return "nebutra-mcp";
}

interface SpawnError extends Error {
  code?: string;
  signal?: string;
}

function _isSpawnError(error: unknown): error is SpawnError {
  return error instanceof Error && "code" in error;
}

export function registerMcpCommand(program: Command) {
  program
    .command("mcp")
    .description("Start the Nebutra MCP server for Cursor/Windsurf")
    .option("--stdio", "Use stdio transport (default)", true)
    .action(async (_options: Record<string, unknown>) => {
      p.intro(pc.bgCyan(pc.black(" nebutra mcp ")));

      try {
        const mcpServerBin = resolveMcpServerBinary();

        p.log.info(pc.cyan("Starting Nebutra MCP server for Cursor/Windsurf integration..."));
        p.log.info(pc.dim("Press Ctrl+C to stop the server.\n"));

        const child = spawn(process.execPath, [mcpServerBin], {
          stdio: "inherit",
          env: { ...process.env },
        });

        child.on("close", (code) => {
          if (code === 0) {
            p.outro(pc.green("MCP server stopped gracefully."));
          } else if (code === null) {
            // Process terminated by signal
            p.outro(pc.yellow("MCP server terminated."));
          }
          process.exit(code ?? 0);
        });

        child.on("error", (err: SpawnError) => {
          logger.error(`\nFailed to start MCP server: ${err.message}`);

          if (err.code === "ENOENT") {
            logger.warn("\nTip: Ensure @nebutra/mcp is installed or available in your PATH.");
            logger.info("  Install globally: npm install -g @nebutra/mcp");
          }

          process.exit(1);
        });

        // Handle Ctrl+C gracefully
        process.on("SIGINT", () => {
          p.log.info(pc.yellow("\nShutting down MCP server..."));
          child.kill("SIGINT");
        });

        process.on("SIGTERM", () => {
          p.log.info(pc.yellow("Terminating MCP server..."));
          child.kill("SIGTERM");
        });
      } catch (error: unknown) {
        p.log.error(
          pc.red("Error: Unable to start MCP server. Ensure @nebutra/mcp is properly installed."),
        );

        if (error instanceof Error) {
          logger.error(error.message);
        }

        process.exit(1);
      }
    });
}
