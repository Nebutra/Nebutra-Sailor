import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import pc from "picocolors";

interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  isUpdate: boolean;
}

interface CacheEntry {
  timestamp: number;
  latestVersion: string;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_DIR = join(homedir(), ".nebutra");
const CACHE_FILE = join(CACHE_DIR, "update-check.json");
const NPM_REGISTRY_URL = "https://registry.npmjs.org/nebutra";

/**
 * Ensure the cache directory exists
 */
async function ensureCacheDir(): Promise<void> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch {
    // Silently ignore errors; we'll handle missing cache gracefully
  }
}

/**
 * Read the cached update check result
 */
async function readCache(): Promise<CacheEntry | null> {
  try {
    const content = await fs.readFile(CACHE_FILE, "utf-8");
    const entry = JSON.parse(content) as CacheEntry;

    // Check if cache is still valid
    const age = Date.now() - entry.timestamp;
    if (age < CACHE_TTL_MS) {
      return entry;
    }

    // Cache expired, remove it
    await fs.unlink(CACHE_FILE).catch(() => {});
    return null;
  } catch {
    // Cache doesn't exist or is invalid; return null
    return null;
  }
}

/**
 * Write the update check result to cache
 */
async function writeCache(latestVersion: string): Promise<void> {
  try {
    await ensureCacheDir();
    const entry: CacheEntry = {
      timestamp: Date.now(),
      latestVersion,
    };
    await fs.writeFile(CACHE_FILE, JSON.stringify(entry, null, 2), "utf-8");
  } catch {
    // Silently ignore cache write errors; they don't affect functionality
  }
}

/**
 * Fetch the latest version from npm registry
 */
async function fetchLatestVersion(): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(NPM_REGISTRY_URL, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as Record<string, unknown>;
    const distTags = data["dist-tags"] as Record<string, unknown> | undefined;

    if (!distTags || typeof distTags.latest !== "string") {
      return null;
    }

    return distTags.latest;
  } catch {
    // Network or parse error; return null gracefully
    return null;
  }
}

/**
 * Normalize version strings for comparison (basic semver)
 */
function normalizeVersion(version: string): number[] {
  return version
    .split(".")
    .map((part) => parseInt(part.replace(/[^0-9]/g, ""), 10) || 0)
    .slice(0, 3);
}

/**
 * Compare two semantic versions
 * Returns true if latest > current
 */
function isNewerVersion(current: string, latest: string): boolean {
  const currParts = normalizeVersion(current);
  const latestParts = normalizeVersion(latest);

  for (let i = 0; i < 3; i++) {
    const curr = currParts[i] ?? 0;
    const lat = latestParts[i] ?? 0;

    if (lat > curr) return true;
    if (lat < curr) return false;
  }

  return false;
}

/**
 * Check for a new version of the nebutra package
 * Hits npm registry or uses cached result
 */
export async function checkForUpdate(currentVersion: string): Promise<UpdateInfo | null> {
  // Try to get from cache first
  const cached = await readCache();
  let latestVersion: string | null = null;

  if (cached) {
    latestVersion = cached.latestVersion;
  } else {
    // Fetch from npm registry
    latestVersion = await fetchLatestVersion();

    // Cache the result (even if null, to avoid hammering npm)
    if (latestVersion) {
      await writeCache(latestVersion);
    }
  }

  if (!latestVersion) {
    return null;
  }

  const isUpdate = isNewerVersion(currentVersion, latestVersion);

  if (!isUpdate) {
    return null;
  }

  return {
    currentVersion,
    latestVersion,
    isUpdate: true,
  };
}

/**
 * Print a styled update notification to stdout
 */
export function printUpdateNotification(info: UpdateInfo): void {
  const width = 43;
  const message = `Update available: ${info.currentVersion} → ${info.latestVersion}`;
  const command = "Run `npm i -g nebutra` to update";

  const padding = " ".repeat((width - message.length) / 2);
  const commandPadding = " ".repeat((width - command.length) / 2);

  const _box = [
    pc.cyan("╭" + "─".repeat(width - 2) + "╮"),
    pc.cyan("│") + pc.yellow(padding + message + padding) + pc.cyan("│"),
    pc.cyan("│") + pc.gray(commandPadding + command + commandPadding) + pc.cyan("│"),
    pc.cyan("╰" + "─".repeat(width - 2) + "╯"),
  ];
}

/**
 * Non-blocking check for updates
 * Returns a function to call after the main command finishes
 * This allows the check to run in the background without slowing down the CLI
 */
export async function maybeNotifyUpdate(currentVersion: string): Promise<() => void> {
  let updateInfo: UpdateInfo | null = null;

  // Start the check in the background (don't await)
  checkForUpdate(currentVersion).then((info) => {
    updateInfo = info;
  });

  // Return a function that prints the notification if one was found
  return async () => {
    // Give the background check a moment to complete
    if (!updateInfo) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (updateInfo) {
      printUpdateNotification(updateInfo);
    }
  };
}
