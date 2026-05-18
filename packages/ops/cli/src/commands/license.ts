import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import * as p from "@clack/prompts";
import type { Command } from "commander";
import pc from "picocolors";
import { emitLicenseCliEvent } from "../utils/analytics-emit";
import { ExitCode } from "../utils/exit-codes";
import { logger } from "../utils/logger";
import {
  REASON_TEXT,
  type ScaffoldMeta,
  type VerifyResult,
  verifyScaffoldMeta,
} from "../utils/scaffold-meta-verify";

// Configurable base URL: falls back to production landing-page origin.
// Override with NEBUTRA_LICENSE_API_URL for self-hosted / local dev.
const LICENSE_API_BASE = process.env.NEBUTRA_LICENSE_API_URL ?? "https://nebutra.com";

async function getConfigDir() {
  const home = os.homedir();
  const configDir = path.join(home, ".config", "nebutra");
  try {
    await fs.mkdir(configDir, { recursive: true });
  } catch (_e) {
    // ignore
  }
  return configDir;
}

/**
 * Validates the license key against the Nebutra API before writing it locally.
 * Returns tier info on success, throws on failure.
 */
async function validateKeyRemotely(key: string): Promise<{ tier: string; type: string }> {
  const url = `${LICENSE_API_BASE}/api/license/validate?key=${encodeURIComponent(key)}`;
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  } catch (_err) {
    throw new Error(
      `Could not reach the Nebutra license server (${LICENSE_API_BASE}). ` +
        `Check your internet connection or set NEBUTRA_LICENSE_API_URL.`,
    );
  }

  if (res.status === 404) {
    throw new Error("License key not found. Please check the key and try again.");
  }
  if (res.status === 410) {
    throw new Error("License key has expired. Please renew your license at nebutra.com.");
  }
  if (!res.ok) {
    throw new Error(`License validation failed (HTTP ${res.status}). Please try again later.`);
  }

  const data = (await res.json()) as { valid?: boolean; tier?: string; type?: string };
  if (!data.valid) {
    throw new Error("License key is not valid. Please check the key and try again.");
  }

  return { tier: data.tier ?? "UNKNOWN", type: data.type ?? "UNKNOWN" };
}

/**
 * Map a caught error to a stable analytics `error_code`. Keeps emissions
 * high-signal without leaking raw error messages (which may contain keys/URLs).
 */
function resolveErrorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/Invalid license key format/i.test(message)) return "invalid_format";
  if (/license server/i.test(message)) return "network_error";
  if (/not found/i.test(message)) return "not_found";
  if (/expired/i.test(message)) return "expired";
  if (/not valid/i.test(message)) return "invalid_key";
  if (/HTTP \d+/i.test(message)) return "http_error";
  return "unknown";
}

export async function activateLicenseCommand(key: string, options: Record<string, unknown>) {
  const isQuiet = options.quiet === true;
  if (!isQuiet) p.intro(pc.bgCyan(pc.black(" Nebutra License Activation ")));

  // Fire-and-forget — analytics for attempt is emitted before any network I/O.
  emitLicenseCliEvent({ action: "activate_attempted" });

  try {
    if (key.length < 10) {
      throw new Error("Invalid license key format.");
    }

    // Validate against the server before persisting locally
    if (!isQuiet) p.log.step("Validating license key with Nebutra...");
    const { tier, type } = await validateKeyRemotely(key);

    const configDir = await getConfigDir();
    const licensePath = path.join(configDir, "license.json");

    await fs.writeFile(
      licensePath,
      JSON.stringify(
        { licenseKey: key, tier, type, activatedAt: new Date().toISOString() },
        null,
        2,
      ),
      "utf-8",
    );

    if (!isQuiet) {
      p.log.success(pc.green(`${tier} license activated and saved to ${licensePath}`));
      p.outro(pc.cyan("Premium CLI capabilities are now unlocked!"));
    }

    emitLicenseCliEvent({ action: "activated", tier, type });
  } catch (error) {
    emitLicenseCliEvent({
      action: "failed",
      error_code: resolveErrorCode(error),
    });

    if (!isQuiet) {
      p.log.error(pc.red("Activation failed"));
      logger.error(error instanceof Error ? error.message : String(error));
      p.outro("Please check your key and try again.");
    }
    process.exit(ExitCode.ERROR);
  }
}

export async function statusLicenseCommand(options: Record<string, unknown>) {
  const isQuiet = options.quiet === true;
  if (!isQuiet) p.intro(pc.bgCyan(pc.black(" Nebutra License Status ")));

  try {
    const configDir = await getConfigDir();
    const licensePath = path.join(configDir, "license.json");

    const content = await fs.readFile(licensePath, "utf-8");
    const data = JSON.parse(content);

    if (data.licenseKey) {
      if (!isQuiet) {
        p.log.success(pc.green("License is active!"));
        p.log.info(`Key:       ${(data.licenseKey as string).substring(0, 8)}...`);
        if (data.tier) p.log.info(`Tier:      ${pc.bold(data.tier as string)}`);
        if (data.type) p.log.info(`Type:      ${data.type as string}`);
        p.log.info(`Activated: ${new Date(data.activatedAt as string).toLocaleString()}`);
        p.outro(pc.cyan("You are ready to use premium features."));
      }
    } else {
      throw new Error("License key not found in config.");
    }
  } catch (_error) {
    if (!isQuiet) {
      p.log.warn(pc.yellow("No active license found locally."));
      p.log.message(pc.dim("Run `nebutra license activate <key>` to unlock premium features."));
      p.outro("");
    }
    process.exit(ExitCode.NOT_FOUND);
  }
}

/**
 * `nebutra license verify [path]`
 *
 * Reads `<path>/.nebutra/scaffold-meta.json` (path defaults to cwd) and
 * verifies its HMAC signature against the scaffold-marker signing-key
 * registry mirrored in `utils/scaffold-meta-verify.ts`.
 *
 * Exit codes:
 *   0  valid
 *   3  NOT_FOUND       — no `.nebutra/scaffold-meta.json` present
 *   11 INCOMPATIBLE    — present but signature/schema fails
 *
 * Output modes:
 *   default → pretty box on stdout
 *   --format json → structured JSON on stdout
 */
export async function verifyLicenseCommand(
  targetPath: string | undefined,
  options: { format?: string; quiet?: boolean },
): Promise<void> {
  const isJson = options.format === "json";
  const isQuiet = options.quiet === true;
  const cwd = targetPath ? path.resolve(process.cwd(), targetPath) : process.cwd();
  const metaPath = path.join(cwd, ".nebutra", "scaffold-meta.json");

  // 1. Read meta file
  let raw: string;
  try {
    raw = await fs.readFile(metaPath, "utf-8");
  } catch (_err) {
    const payload = {
      valid: false,
      tier: null,
      cliVersion: null,
      scaffoldedAt: null,
      projectName: null,
      reason: "missing_meta" as const,
      reasonText: REASON_TEXT.missing_meta,
      path: metaPath,
    };
    if (isJson) {
      process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    } else if (!isQuiet) {
      process.stderr.write(
        `${pc.red("✘")} No scaffold marker found at ${pc.dim(metaPath)}.\n` +
          `  This project does not appear to be scaffolded by ${pc.bold("create-sailor")}.\n` +
          `  Run ${pc.cyan("npm create sailor@latest")} to scaffold a licensed project.\n`,
      );
    }
    process.exit(ExitCode.NOT_FOUND);
  }

  // 2. Parse JSON
  let meta: ScaffoldMeta | null = null;
  try {
    meta = JSON.parse(raw) as ScaffoldMeta;
  } catch {
    // fall through — verify() will return schema_mismatch
  }

  // 3. Verify
  const result: VerifyResult = verifyScaffoldMeta(meta);

  const payload = {
    valid: result.valid,
    tier: meta?.license?.tier ?? null,
    cliVersion: meta?.cliVersion ?? null,
    scaffoldedAt: meta?.scaffoldedAt ?? null,
    projectName: meta?.projectName ?? null,
    signingKeyId: meta?.signingKeyId ?? null,
    reason: result.reason,
    reasonText: REASON_TEXT[result.reason],
    path: metaPath,
  };

  if (isJson) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    process.exit(result.valid ? ExitCode.SUCCESS : ExitCode.INCOMPATIBLE);
  }

  if (!isQuiet) {
    // Plain output goes to stderr so stdout stays parseable for tooling
    // (matches the convention used by `nebutra init --dry-run`).
    if (result.valid && meta) {
      const date = new Date(meta.scaffoldedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      const lines = [
        `${pc.green("✓")} Project "${pc.bold(meta.projectName)}" scaffolded with ` +
          `${pc.cyan(`create-sailor@${meta.cliVersion}`)} on ${date}`,
        `  Signing key: ${pc.dim(meta.signingKeyId ?? "v1 (legacy, no keyId)")}`,
        `  Tier: ${pc.bold(meta.license?.tier ?? "independent")}`,
        `  ${pc.green("Independent Developer License valid.")}`,
      ];
      process.stderr.write(`${lines.join("\n")}\n`);
    } else {
      const reasonLine = REASON_TEXT[result.reason];
      process.stderr.write(
        `${pc.red("✘")} Invalid scaffold marker.\n` +
          `  Reason: ${pc.yellow(reasonLine)}\n` +
          `  File:   ${pc.dim(metaPath)}\n`,
      );
    }
  }

  process.exit(result.valid ? ExitCode.SUCCESS : ExitCode.INCOMPATIBLE);
}

export function registerLicenseCommand(program: Command): void {
  const licenseCmd = program
    .command("license")
    .description("Manage your Nebutra-Sailor commercial license");

  licenseCmd
    .command("activate <key>")
    .description("Activate a commercial license key for local development")
    .option("--quiet", "Suppress output")
    .action(async (key: string, options) => {
      await activateLicenseCommand(key, options);
    });

  licenseCmd
    .command("status")
    .description("Check the locally configured license status")
    .option("--quiet", "Suppress output")
    .action(async (options) => {
      await statusLicenseCommand(options);
    });

  licenseCmd
    .command("verify [path]")
    .description(
      "Verify the scaffold-meta HMAC signature in a create-sailor project (defaults to cwd)",
    )
    .option("--format <type>", "Output format: json | plain (default: plain)")
    .option("--quiet", "Suppress non-essential output")
    // Commander 12 action signature with a positional arg:
    //   (positional, options, command) — `command` is the Command instance
    //   that owns `optsWithGlobals()`. The local `options` plain object only
    //   carries flags declared on the subcommand itself; for global flags
    //   like `--format` (declared at program-level) we MUST read via
    //   command.optsWithGlobals().
    .action(async function (this: unknown, targetPath: string | undefined, options, command) {
      const merged: Record<string, unknown> =
        command &&
        typeof (command as { optsWithGlobals?: () => unknown }).optsWithGlobals === "function"
          ? ((command as { optsWithGlobals: () => Record<string, unknown> }).optsWithGlobals() ??
            {})
          : { ...options };
      const format =
        typeof options?.format === "string"
          ? options.format
          : typeof merged.format === "string"
            ? (merged.format as string)
            : undefined;
      const quiet = Boolean(options?.quiet) || Boolean(merged.quiet);
      await verifyLicenseCommand(targetPath, { format, quiet });
    });
}
