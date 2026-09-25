/**
 * `nebutra login` credential storage.
 *
 * Prefers the OS keychain (no extra dependency — shells out to the platform
 * tool that's already there: macOS `security`, Linux `secret-tool` when
 * installed). Falls back to `~/.config/nebutra/credentials.json` (mode
 * 0600) everywhere else, including Windows (no dependency-free OS keychain
 * CLI ships there by default).
 *
 * `NEBUTRA_TOKEN` always takes precedence over anything stored here — see
 * `resolveAccessToken()` — so CI never touches this module at all.
 */

import { execFile } from "node:child_process";
import { chmodSync, existsSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { platform } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { brand } from "@nebutra/brand/metadata";
import { getConfigDir } from "./config-dir";

const execFileAsync = promisify(execFile);

const KEYCHAIN_SERVICE = "nebutra-cli";
const KEYCHAIN_ACCOUNT = "default";

export interface StoredCredentials {
  /** Better Auth session token minted by the device-authorization exchange. */
  accessToken: string;
  tokenType: string;
  /** ISO 8601 — when `accessToken` stops being valid. */
  expiresAt: string;
  scope?: string;
  /** ISO 8601 — when this credential was written. */
  obtainedAt: string;
}

export interface PendingDeviceAuth {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string;
  interval: number;
  /** Unix ms — when the device_code itself expires (RFC 8628 `expires_in`). */
  expiresAt: number;
  baseUrl: string;
}

function credentialsFilePath(): string {
  return join(getConfigDir(), "credentials.json");
}

function pendingFilePath(): string {
  return join(getConfigDir(), "device-pending.json");
}

async function ensureConfigDir(): Promise<void> {
  await mkdir(getConfigDir(), { recursive: true });
}

// ─── OS keychain (best-effort) ────────────────────────────────────────────

async function hasCommand(cmd: string): Promise<boolean> {
  try {
    await execFileAsync(platform() === "win32" ? "where" : "which", [cmd]);
    return true;
  } catch {
    return false;
  }
}

/** Escape hatch for tests/CI: force the file fallback so a test run never
 * touches the real developer's OS keychain. Not a documented user-facing
 * flag. */
function keychainDisabled(): boolean {
  return process.env.NEBUTRA_NO_KEYCHAIN === "1";
}

async function keychainSet(value: string): Promise<boolean> {
  if (keychainDisabled()) return false;
  try {
    if (platform() === "darwin") {
      // -U updates in place if an entry already exists.
      await execFileAsync("security", [
        "add-generic-password",
        "-a",
        KEYCHAIN_ACCOUNT,
        "-s",
        KEYCHAIN_SERVICE,
        "-w",
        value,
        "-U",
      ]);
      return true;
    }
    if (platform() === "linux" && (await hasCommand("secret-tool"))) {
      await execFileAsync("secret-tool", [
        "store",
        "--label",
        `${brand.name} CLI credentials`,
        "service",
        KEYCHAIN_SERVICE,
        "account",
        KEYCHAIN_ACCOUNT,
      ]);
      return true;
    }
  } catch {
    // fall through to file storage
  }
  return false;
}

async function keychainGet(): Promise<string | null> {
  if (keychainDisabled()) return null;
  try {
    if (platform() === "darwin") {
      const { stdout } = await execFileAsync("security", [
        "find-generic-password",
        "-a",
        KEYCHAIN_ACCOUNT,
        "-s",
        KEYCHAIN_SERVICE,
        "-w",
      ]);
      return stdout.trim() || null;
    }
    if (platform() === "linux" && (await hasCommand("secret-tool"))) {
      const { stdout } = await execFileAsync("secret-tool", [
        "lookup",
        "service",
        KEYCHAIN_SERVICE,
        "account",
        KEYCHAIN_ACCOUNT,
      ]);
      return stdout.trim() || null;
    }
  } catch {
    // not found / keychain unavailable
  }
  return null;
}

async function keychainDelete(): Promise<boolean> {
  if (keychainDisabled()) return false;
  let removed = false;
  try {
    if (platform() === "darwin") {
      await execFileAsync("security", [
        "delete-generic-password",
        "-a",
        KEYCHAIN_ACCOUNT,
        "-s",
        KEYCHAIN_SERVICE,
      ]);
      removed = true;
    } else if (platform() === "linux" && (await hasCommand("secret-tool"))) {
      await execFileAsync("secret-tool", [
        "clear",
        "service",
        KEYCHAIN_SERVICE,
        "account",
        KEYCHAIN_ACCOUNT,
      ]);
      removed = true;
    }
  } catch {
    // nothing to remove, or keychain unavailable — not an error for logout
  }
  return removed;
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Note on keychain security-CLI stdin: `security add-generic-password -w
 * <value>` puts the secret in argv, which is visible via `ps` to other local
 * users for the process's lifetime — the same trade-off `gh auth login`
 * accepts on macOS. The file fallback (mode 0600) avoids that but is only
 * used when no keychain tool is present.
 */
export async function saveCredentials(
  creds: StoredCredentials,
): Promise<{ storedIn: "keychain" | "file" }> {
  await ensureConfigDir();
  const serialized = JSON.stringify(creds);

  if (await keychainSet(serialized)) {
    // Keep the file fallback clear so whoami/logout don't read a stale copy.
    try {
      if (existsSync(credentialsFilePath())) unlinkSync(credentialsFilePath());
    } catch {
      // ignore
    }
    return { storedIn: "keychain" };
  }

  writeFileSync(credentialsFilePath(), `${serialized}\n`, { mode: 0o600 });
  try {
    chmodSync(credentialsFilePath(), 0o600);
  } catch {
    // best-effort — some filesystems (e.g. some CI containers) reject chmod
  }
  return { storedIn: "file" };
}

export async function loadCredentials(): Promise<StoredCredentials | null> {
  const fromKeychain = await keychainGet();
  if (fromKeychain) {
    try {
      return JSON.parse(fromKeychain) as StoredCredentials;
    } catch {
      return null;
    }
  }

  const filePath = credentialsFilePath();
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as StoredCredentials;
  } catch {
    return null;
  }
}

/** Removes the keychain entry, credentials.json, and any pending device-auth
 * poll state. Returns the list of things actually removed (for logout's
 * output) — never throws. */
export async function deleteStoredCredentials(): Promise<string[]> {
  const removed: string[] = [];

  if (await keychainDelete()) {
    removed.push(`keychain:${KEYCHAIN_SERVICE}`);
  }

  const filePath = credentialsFilePath();
  if (existsSync(filePath)) {
    try {
      unlinkSync(filePath);
      removed.push(filePath);
    } catch {
      // ignore
    }
  }

  const pending = pendingFilePath();
  if (existsSync(pending)) {
    try {
      rmSync(pending, { force: true });
      removed.push(pending);
    } catch {
      // ignore
    }
  }

  return removed;
}

// ─── Pending device-auth (for `login --json` then `login --poll`) ─────────

export async function savePendingDeviceAuth(pending: PendingDeviceAuth): Promise<void> {
  await ensureConfigDir();
  writeFileSync(pendingFilePath(), `${JSON.stringify(pending)}\n`, { mode: 0o600 });
}

export function loadPendingDeviceAuth(): PendingDeviceAuth | null {
  const filePath = pendingFilePath();
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as PendingDeviceAuth;
  } catch {
    return null;
  }
}

export function clearPendingDeviceAuth(): void {
  const filePath = pendingFilePath();
  if (existsSync(filePath)) {
    try {
      unlinkSync(filePath);
    } catch {
      // ignore
    }
  }
}

/**
 * `NEBUTRA_TOKEN` (CI) always wins over anything stored locally. Returns
 * `null` when neither is present/valid — callers decide whether that means
 * "run `nebutra login`" or "re-authenticate, your session expired".
 */
export async function resolveAccessToken(): Promise<{
  token: string;
  source: "env" | "keychain" | "file";
  expired: boolean;
} | null> {
  const envToken = process.env.NEBUTRA_TOKEN?.trim();
  if (envToken) {
    return { token: envToken, source: "env", expired: false };
  }

  const stored = await loadCredentials();
  if (!stored) return null;

  const expired = Boolean(stored.expiresAt) && new Date(stored.expiresAt).getTime() <= Date.now();
  const fromKeychain = (await keychainGet()) !== null;
  return { token: stored.accessToken, source: fromKeychain ? "keychain" : "file", expired };
}
