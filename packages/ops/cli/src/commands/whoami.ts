import { brand } from "@nebutra/brand/metadata";
import type { Command } from "commander";
import { resolveAccessToken } from "../utils/credentials-store";
import { fetchWhoami, resolveAuthBaseUrl } from "../utils/device-auth";
import { ExitCode } from "../utils/exit-codes";
import { logger } from "../utils/logger";

interface WhoamiOptions {
  json?: boolean;
  format?: string;
}

function notLoggedIn(isJson: boolean, reason: "missing" | "expired"): never {
  const message =
    reason === "expired"
      ? `Your ${brand.name} session has expired. Run \`nebutra login\` to sign in again.`
      : "Not logged in. Run `nebutra login` to authorize this machine.";
  if (isJson) {
    console.log(
      JSON.stringify({ command: "whoami", success: false, error: reason, message }, null, 2),
    );
  } else {
    logger.error(message);
  }
  process.exit(ExitCode.PERMISSION_DENIED);
}

async function handleWhoami(options: WhoamiOptions, globalFormat?: string) {
  const isJson = Boolean(options.json) || options.format === "json" || globalFormat === "json";

  const resolved = await resolveAccessToken();
  if (!resolved) return notLoggedIn(isJson, "missing");
  if (resolved.expired) return notLoggedIn(isJson, "expired");

  const baseUrl = resolveAuthBaseUrl();
  const identity = await fetchWhoami(baseUrl, resolved.token);
  if (!identity) return notLoggedIn(isJson, "expired");

  if (isJson) {
    console.log(
      JSON.stringify(
        {
          command: "whoami",
          success: true,
          userId: identity.userId,
          email: identity.email,
          name: identity.name,
          tokenSource: resolved.source,
        },
        null,
        2,
      ),
    );
  } else {
    logger.success(identity.email ?? identity.userId);
    if (identity.name) logger.info(identity.name);
  }
}

export function registerWhoamiCommand(program: Command) {
  program
    .command("whoami")
    .description(`Show the ${brand.name} identity this machine is authorized as`)
    .option("--json", "Output as JSON")
    .option("--format <type>", "Output format: json or plain")
    .action(async (options, cmd) => {
      const globalOptions = cmd?.optsWithGlobals?.() || options;
      await handleWhoami(options, globalOptions.format);
    });
}
