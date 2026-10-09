import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as p from "@clack/prompts";
import type { Command } from "commander";
import pc from "picocolors";
import { resolveAccessToken } from "../utils/credentials-store";
import { ExitCode } from "../utils/exit-codes";
import { logger } from "../utils/logger";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * The nebutra-mcp server entry: the monorepo sibling when running from source
 * or a workspace build, then the installed @nebutra/mcp package, then
 * `nebutra-mcp` on PATH. Each candidate is checked, so a wrong guess never
 * becomes an ENOENT at spawn time.
 */
function resolveMcpServer(): { command: string; args: string[] } {
  const siblings = [
    // packages/ops/cli/{src,dist}/commands → packages/ai/mcp
    resolve(__dirname, "../../../../ai/mcp/dist/server/contextServer.js"),
    resolve(__dirname, "../../../ai/mcp/dist/server/contextServer.js"),
  ];
  for (const entry of siblings) {
    if (existsSync(entry)) return { command: process.execPath, args: [entry] };
  }
  try {
    const entry = createRequire(import.meta.url).resolve("@nebutra/mcp/bin/nebutra-mcp.js");
    return { command: process.execPath, args: [entry] };
  } catch (error) {
    logger.debug("@nebutra/mcp is not installed next to the CLI", { error });
  }
  return { command: "nebutra-mcp", args: [] };
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
      // stdout belongs to the MCP protocol: any banner there breaks the client's
      // first message. Everything human-facing goes to stderr.
      try {
        const server = resolveMcpServer();
        process.stderr.write(pc.dim("nebutra mcp: stdio server running — Ctrl+C to stop\n"));

        // The staff_* tools act as the person who ran `nebutra login`. Hand the
        // session to the server through its environment (never argv, never
        // stdout); an explicit NEBUTRA_TOKEN wins.
        const env: NodeJS.ProcessEnv = { ...process.env };
        if (!env.NEBUTRA_TOKEN) {
          const session = await resolveAccessToken();
          if (session && !session.expired) env.NEBUTRA_TOKEN = session.token;
        }

        const child = spawn(server.command, server.args, { stdio: "inherit", env });

        child.on("close", (code) => {
          if (code === 0) {
            process.stderr.write(pc.green("MCP server stopped.\n"));
          } else if (code === null) {
            // Process terminated by signal
            process.stderr.write(pc.yellow("MCP server terminated.\n"));
          }
          process.exit(code ?? 0);
        });

        child.on("error", (err: SpawnError) => {
          logger.error(`\nFailed to start MCP server: ${err.message}`);

          if (err.code === "ENOENT") {
            logger.warn("\nTip: Ensure @nebutra/mcp is installed or available in your PATH.");
            logger.info("  Install globally: npm install -g @nebutra/mcp");
            process.exit(ExitCode.NOT_FOUND);
          }

          process.exit(ExitCode.ERROR);
        });

        // Handle Ctrl+C gracefully
        process.on("SIGINT", () => {
          process.stderr.write(pc.yellow("\nShutting down MCP server...\n"));
          child.kill("SIGINT");
        });

        process.on("SIGTERM", () => {
          process.stderr.write(pc.yellow("Terminating MCP server...\n"));
          child.kill("SIGTERM");
        });
      } catch (error: unknown) {
        p.log.error(
          pc.red("Error: Unable to start MCP server. Ensure @nebutra/mcp is properly installed."),
        );

        if (error instanceof Error) {
          logger.error(error.message);
        }

        process.exit(ExitCode.ERROR);
      }
    });
}
