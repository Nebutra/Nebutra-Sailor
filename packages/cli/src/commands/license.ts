import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import * as p from "@clack/prompts";
import type { Command } from "commander";
import pc from "picocolors";
import { emitLicenseCliEvent } from "../utils/analytics-emit.js";
import { logger } from "../utils/logger.js";

// Configurable base URL: falls back to production landing-page origin.
// Override with NEBUTRA_LICENSE_API_URL for self-hosted / local dev.
const LICENSE_API_BASE = process.env.NEBUTRA_LICENSE_API_URL ?? "https://nebutra.com";

async function getConfigDir() {
  const home = os.homedir();
  const configDir = path.join(home, ".config", "nebutra");
  try {
    await fs.mkdir(configDir, { recursive: true });
  } catch (e) {
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
  } catch (err) {
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
    process.exit(1);
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
  } catch (error) {
    if (!isQuiet) {
      p.log.warn(pc.yellow("No active license found locally."));
      p.log.message(pc.dim("Run `nebutra license activate <key>` to unlock premium features."));
      p.outro("");
    }
    process.exit(1);
  }
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
}
