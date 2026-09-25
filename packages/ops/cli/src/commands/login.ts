import { spawn } from "node:child_process";
import { platform } from "node:os";
import { brand } from "@nebutra/brand/metadata";
import type { Command } from "commander";
import {
  clearPendingDeviceAuth,
  loadPendingDeviceAuth,
  saveCredentials,
  savePendingDeviceAuth,
} from "../utils/credentials-store";
import {
  DeviceAuthError,
  fetchWhoami,
  pollUntilComplete,
  requestDeviceCode,
  resolveAuthBaseUrl,
} from "../utils/device-auth";
import { ExitCode } from "../utils/exit-codes";
import { logger } from "../utils/logger";

interface LoginOptions {
  json?: boolean;
  /** Commander maps `--no-browser` to `browser: false` (negated-flag
   * convention), not a `noBrowser` key — this is `true` unless the flag is
   * passed. */
  browser?: boolean;
  poll?: boolean;
  format?: string;
}

function isJsonMode(options: LoginOptions, globalFormat?: string): boolean {
  return Boolean(options.json) || options.format === "json" || globalFormat === "json";
}

/** Best-effort browser open — never fails the command. Mirrors what
 * `open`/`xdg-open` npm packages do, without adding the dependency. */
function openBrowser(url: string): void {
  try {
    const plat = platform();
    const [cmd, args] =
      plat === "darwin"
        ? ["open", [url]]
        : plat === "win32"
          ? ["cmd", ["/c", "start", "", url]]
          : ["xdg-open", [url]];
    const child = spawn(cmd as string, args as string[], { stdio: "ignore", detached: true });
    child.on("error", () => {
      // No browser opener available (headless box, minimal container) —
      // the printed verification URL is the fallback, not an error.
    });
    child.unref();
  } catch {
    // ignore — same reasoning as above
  }
}

async function persistToken(
  baseUrl: string,
  token: { access_token: string; token_type: string; expires_in: number; scope: string },
): Promise<void> {
  const obtainedAt = new Date();
  await saveCredentials({
    accessToken: token.access_token,
    tokenType: token.token_type,
    expiresAt: new Date(obtainedAt.getTime() + token.expires_in * 1000).toISOString(),
    scope: token.scope,
    obtainedAt: obtainedAt.toISOString(),
  });
  clearPendingDeviceAuth();
  void baseUrl; // reserved for a future "which auth center" echo
}

async function runInteractivePoll(
  baseUrl: string,
  device: { deviceCode: string; interval: number; expiresAt: number },
  isJson: boolean,
): Promise<{ userId: string; email: string | null } | null> {
  let spinnerTicks = 0;
  const token = await pollUntilComplete(baseUrl, device.deviceCode, {
    intervalSeconds: device.interval,
    deadline: device.expiresAt,
    onWaiting: () => {
      if (!isJson) {
        spinnerTicks++;
        process.stderr.write(spinnerTicks === 1 ? "Waiting for approval" : ".");
      }
    },
  });
  if (!isJson) process.stderr.write("\n");
  await persistToken(baseUrl, token);
  const whoami = await fetchWhoami(baseUrl, token.access_token);
  return whoami ? { userId: whoami.userId, email: whoami.email } : null;
}

async function handleLogin(
  options: LoginOptions,
  globalOptions: { format?: string; yes?: boolean },
) {
  const isJson = isJsonMode(options, globalOptions.format);
  const baseUrl = resolveAuthBaseUrl();

  // `--poll` alone resumes a previously started (e.g. `login --json`)
  // device code if one is still on disk and not expired; otherwise it falls
  // through to requesting a fresh one, same as plain `nebutra login`.
  if (options.poll) {
    const pending = loadPendingDeviceAuth();
    if (pending && pending.expiresAt > Date.now() && pending.baseUrl === baseUrl) {
      try {
        const identity = await runInteractivePoll(
          baseUrl,
          {
            deviceCode: pending.deviceCode,
            interval: pending.interval,
            expiresAt: pending.expiresAt,
          },
          isJson,
        );
        if (isJson) {
          console.log(JSON.stringify({ command: "login", success: true, ...identity }, null, 2));
        } else {
          logger.success(
            identity?.email ? `Logged in as ${identity.email}` : `Logged in to ${brand.name}.`,
          );
        }
        return;
      } catch (error) {
        clearPendingDeviceAuth();
        return failLogin(error, isJson);
      }
    }
    // No resumable pending code — request a fresh one and poll it below.
  }

  let device: Awaited<ReturnType<typeof requestDeviceCode>>;
  try {
    device = await requestDeviceCode(baseUrl);
  } catch (error) {
    return failLogin(error, isJson);
  }

  const deadline = Date.now() + device.expires_in * 1000;

  // `--json` without `--poll`: hand the agent everything it needs and exit
  // 0 immediately — no blocking. `nebutra login --poll` (optionally with
  // `--json` too) resumes this exact device code from disk.
  if (isJson && !options.poll) {
    await savePendingDeviceAuth({
      deviceCode: device.device_code,
      userCode: device.user_code,
      verificationUri: device.verification_uri,
      verificationUriComplete: device.verification_uri_complete,
      interval: device.interval,
      expiresAt: deadline,
      baseUrl,
    });
    console.log(
      JSON.stringify(
        {
          command: "login",
          success: true,
          pending: true,
          verification_uri: device.verification_uri,
          verification_uri_complete: device.verification_uri_complete,
          user_code: device.user_code,
          expires_in: device.expires_in,
          interval: device.interval,
        },
        null,
        2,
      ),
    );
    return;
  }

  // Human mode (or `--poll` with no resumable pending code): print
  // instructions, open the browser, block until approved/denied/expired.
  if (!isJson) {
    logger.info(`First, confirm this code matches what's shown in the browser:\n`);
    logger.info(`  ${device.user_code}\n`);
    logger.info(`Visiting: ${device.verification_uri_complete}`);
  }

  const shouldOpenBrowser =
    options.browser !== false && process.stdout.isTTY !== false && !globalOptions.yes;
  if (shouldOpenBrowser) {
    openBrowser(device.verification_uri_complete);
  }

  try {
    await savePendingDeviceAuth({
      deviceCode: device.device_code,
      userCode: device.user_code,
      verificationUri: device.verification_uri,
      verificationUriComplete: device.verification_uri_complete,
      interval: device.interval,
      expiresAt: deadline,
      baseUrl,
    });
    const identity = await runInteractivePoll(
      baseUrl,
      { deviceCode: device.device_code, interval: device.interval, expiresAt: deadline },
      isJson,
    );
    if (isJson) {
      console.log(JSON.stringify({ command: "login", success: true, ...identity }, null, 2));
    } else {
      logger.success(
        identity?.email ? `Logged in as ${identity.email}` : `Logged in to ${brand.name}.`,
      );
    }
  } catch (error) {
    clearPendingDeviceAuth();
    return failLogin(error, isJson);
  }
}

function failLogin(error: unknown, isJson: boolean): never {
  const code = error instanceof DeviceAuthError ? error.code : "login_failed";
  const message = error instanceof Error ? error.message : String(error);
  const exitCode =
    code === "access_denied"
      ? ExitCode.PERMISSION_DENIED
      : code === "expired_token"
        ? ExitCode.TIMEOUT
        : ExitCode.NETWORK_ERROR;

  if (isJson) {
    console.log(
      JSON.stringify({ command: "login", success: false, error: code, message }, null, 2),
    );
  } else {
    logger.error(message);
  }
  process.exit(exitCode);
}

export function registerLoginCommand(program: Command) {
  program
    .command("login")
    .description(`Authorize this machine with your ${brand.name} account (device flow)`)
    .option("--json", "Print verification details as JSON and exit immediately (agent mode)")
    .option("--no-browser", "Don't try to open a browser")
    .option(
      "--poll",
      "Poll until approved/denied/expired, resuming a pending `login --json` if present",
    )
    .option("--format <type>", "Output format: json or plain")
    .action(async (options, cmd) => {
      const globalOptions = cmd?.optsWithGlobals?.() || options;
      await handleLogin(options, { format: globalOptions.format, yes: globalOptions.yes });
    });
}
