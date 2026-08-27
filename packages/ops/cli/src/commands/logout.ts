import { existsSync, rmSync, unlinkSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";
import type { Command } from "commander";
import { ExitCode } from "../utils/exit-codes";
import { logger } from "../utils/logger";

interface LogoutOptions {
  all?: boolean;
  format?: string;
}

function getConfigDir(): string {
  if (platform() === "win32") {
    const base = process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local");
    return join(base, "nebutra");
  }
  const xdg = process.env.XDG_CONFIG_HOME;
  return xdg ? join(xdg, "nebutra") : join(homedir(), ".config", "nebutra");
}

const AUTH_FILES = ["auth.json", "session.json", "token", "credentials.json"];

async function handleLogout(options: LogoutOptions) {
  const dir = getConfigDir();
  const isJson = options.format === "json";
  let removed = 0;
  const removedPaths: string[] = [];

  if (options.all) {
    if (existsSync(dir)) {
      try {
        rmSync(dir, { recursive: true, force: true });
        removed = 1;
        removedPaths.push(dir);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (isJson) {
          console.log(JSON.stringify({ command: "logout", success: false, error: msg }, null, 2));
        } else {
          logger.error(`Failed to clear config directory: ${msg}`);
        }
        process.exit(ExitCode.PERMISSION_DENIED);
      }
    }
  } else {
    for (const name of AUTH_FILES) {
      const p = join(dir, name);
      if (existsSync(p)) {
        try {
          unlinkSync(p);
          removed++;
          removedPaths.push(p);
        } catch {
          // ignore individual file errors
        }
      }
    }
  }

  if (removed === 0) {
    if (isJson) {
      console.log(
        JSON.stringify(
          { command: "logout", success: true, alreadyLoggedOut: true, removed: [] },
          null,
          2,
        ),
      );
    } else {
      logger.info("Already logged out");
    }
    process.exit(ExitCode.SUCCESS);
  }

  if (isJson) {
    console.log(
      JSON.stringify(
        { command: "logout", success: true, removed: removedPaths, clearedAll: !!options.all },
        null,
        2,
      ),
    );
  } else {
    logger.success(options.all ? "Cleared all nebutra config" : "Logged out of nebutra.com");
  }
}

export function registerLogoutCommand(program: Command) {
  program
    .command("logout")
    .description("Clear stored authentication credentials")
    .option("--all", "Clear ALL local config, not just auth tokens")
    .option("--format <type>", "Output format: json or plain")
    .action(async (options, cmd) => {
      const globalOptions = cmd?.optsWithGlobals?.() || options;
      await handleLogout({
        all: options.all || false,
        format: options.format || globalOptions.format,
      });
    });
}
