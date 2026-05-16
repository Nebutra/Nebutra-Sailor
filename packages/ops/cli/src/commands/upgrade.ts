import { spawnSync } from "node:child_process";
import type { Command } from "commander";
import { ExitCode } from "../utils/exit-codes";
import { logger } from "../utils/logger";
import { checkForUpdate } from "../utils/update-notifier";

interface UpgradeOptions {
  yes?: boolean;
  dryRun?: boolean;
  format?: string;
}

type Installer = "npm" | "pnpm" | "yarn" | "bun" | "brew" | "unknown";

function detectInstaller(): Installer {
  const argv1 = process.argv[1] || "";
  const lower = argv1.toLowerCase();

  if (lower.includes("/homebrew/") || lower.includes("/cellar/")) return "brew";
  if (lower.includes("/.bun/") || lower.includes("/bun/")) return "bun";
  if (lower.includes("/pnpm/") || lower.includes("/.pnpm/")) return "pnpm";
  if (lower.includes("/yarn/") || lower.includes("/.yarn/")) return "yarn";
  if (lower.includes("/npm/") || lower.includes("/node_modules/")) return "npm";

  const ua = process.env.npm_config_user_agent || "";
  if (ua.startsWith("pnpm")) return "pnpm";
  if (ua.startsWith("yarn")) return "yarn";
  if (ua.startsWith("bun")) return "bun";
  if (ua.startsWith("npm")) return "npm";

  return "unknown";
}

function upgradeCommandFor(installer: Installer): string {
  switch (installer) {
    case "pnpm":
      return "pnpm add -g nebutra@latest";
    case "yarn":
      return "yarn global add nebutra@latest";
    case "bun":
      return "bun add -g nebutra@latest";
    case "brew":
      return "brew upgrade nebutra";
    case "npm":
      return "npm i -g nebutra@latest";
    default:
      return "npm i -g nebutra@latest";
  }
}

const CURRENT_VERSION = "0.1.0";

async function handleUpgrade(options: UpgradeOptions) {
  const installer = detectInstaller();
  const cmd = upgradeCommandFor(installer);
  const isJson = options.format === "json";

  const info = await checkForUpdate(CURRENT_VERSION);
  const latest = info?.latestVersion ?? null;
  const hasUpdate = !!info?.isUpdate;

  if (options.dryRun) {
    if (isJson) {
      console.log(
        JSON.stringify(
          {
            command: "upgrade",
            dryRun: true,
            installer,
            command_to_run: cmd,
            currentVersion: CURRENT_VERSION,
            latestVersion: latest,
            hasUpdate,
          },
          null,
          2,
        ),
      );
    } else {
      logger.info(`Detected installer: ${installer}`);
      logger.info(`Current: ${CURRENT_VERSION}${latest ? ` → Latest: ${latest}` : ""}`);
      logger.info(`Upgrade command: ${cmd}`);
    }
    process.exit(ExitCode.DRY_RUN_OK);
  }

  if (!hasUpdate && latest) {
    if (isJson) {
      console.log(
        JSON.stringify(
          { command: "upgrade", success: true, alreadyLatest: true, version: CURRENT_VERSION },
          null,
          2,
        ),
      );
    } else {
      logger.success(`Already on the latest version (${CURRENT_VERSION})`);
    }
    process.exit(ExitCode.SUCCESS);
  }

  if (!options.yes) {
    if (isJson) {
      console.log(
        JSON.stringify(
          {
            command: "upgrade",
            success: true,
            installer,
            command_to_run: cmd,
            currentVersion: CURRENT_VERSION,
            latestVersion: latest,
            requiresConfirmation: true,
          },
          null,
          2,
        ),
      );
    } else {
      logger.info(`Current: ${CURRENT_VERSION}${latest ? ` → Latest: ${latest}` : ""}`);
      logger.info(`To upgrade, run:`);
      logger.info(`  ${cmd}`);
      logger.info("Or re-run this command with --yes to execute it now.");
    }
    process.exit(ExitCode.SUCCESS);
  }

  const [bin, ...args] = cmd.split(" ");
  if (!isJson) logger.info(`Running: ${cmd}`);

  const result = spawnSync(bin, args, { stdio: isJson ? "pipe" : "inherit" });

  if (result.status === 0) {
    if (isJson) {
      console.log(
        JSON.stringify({ command: "upgrade", success: true, installer, ran: cmd }, null, 2),
      );
    } else {
      logger.success("Upgrade complete");
    }
    process.exit(ExitCode.SUCCESS);
  }

  const errMsg = result.stderr?.toString() || `Upgrade failed (exit ${result.status})`;
  if (isJson) {
    console.log(
      JSON.stringify(
        { command: "upgrade", success: false, installer, ran: cmd, error: errMsg },
        null,
        2,
      ),
    );
  } else {
    logger.error(errMsg);
  }
  process.exit(ExitCode.ERROR);
}

export function registerUpgradeCommand(program: Command) {
  const action = (options: UpgradeOptions, cmd: any) => {
    const globalOptions = cmd?.optsWithGlobals?.() || options;
    return handleUpgrade({
      yes: options.yes || globalOptions.yes || false,
      dryRun: options.dryRun || false,
      format: options.format || globalOptions.format,
    });
  };

  program
    .command("upgrade")
    .alias("self-update")
    .description("Upgrade the nebutra CLI to the latest version")
    .option("--yes", "Execute the upgrade command without confirmation")
    .option("--dry-run", "Show the upgrade command without executing (exit 10)")
    .option("--format <type>", "Output format: json or plain")
    .action(action as any);
}
