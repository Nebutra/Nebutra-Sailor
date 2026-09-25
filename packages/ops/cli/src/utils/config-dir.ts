import { homedir, platform } from "node:os";
import { join } from "node:path";

/**
 * Nebutra CLI's local config directory. Single source of truth — `logout`,
 * `link`, `login`/`whoami` (credentials-store.ts) all resolve the same path
 * so a credential written by one is found and removed by the other.
 */
export function getConfigDir(): string {
  if (platform() === "win32") {
    const base = process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local");
    return join(base, "nebutra");
  }
  const xdg = process.env.XDG_CONFIG_HOME;
  return xdg ? join(xdg, "nebutra") : join(homedir(), ".config", "nebutra");
}
