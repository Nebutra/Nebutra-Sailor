import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";
import { brand } from "@nebutra/brand/metadata";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import pc from "picocolors";

function getConfigDir(): string {
  if (platform() === "win32") {
    const base = process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local");
    return join(base, "nebutra");
  }
  const xdg = process.env.XDG_CONFIG_HOME;
  return xdg ? join(xdg, "nebutra") : join(homedir(), ".config", "nebutra");
}

function isTelemetryExplicitlyOff(): boolean {
  const v = process.env.NEBUTRA_TELEMETRY;
  return v === "0" || v === "false" || v === "no";
}

function writeMarker(dir: string, marker: string): void {
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(marker, "");
  } catch {
    // ignore
  }
}

export function maybeShowFirstRunBanner(): void {
  if (!process.stderr.isTTY || !process.stdin.isTTY) return;
  if (process.env.CI) return;

  const dir = getConfigDir();
  const marker = join(dir, "first-run-acked");

  try {
    if (existsSync(marker)) return;
  } catch {
    return;
  }

  if (isTelemetryExplicitlyOff()) {
    writeMarker(dir, marker);
    return;
  }

  const info = pc.cyan("ℹ");
  const lines = [
    `${info} ${brand.name} collects anonymous usage analytics to improve the CLI.`,
    `  Opt out at any time:  ${pc.dim("export NEBUTRA_TELEMETRY=0")}`,
    `  Privacy policy:       ${pc.dim(`${getBrandOrigin("landing")}/legal/cli-analytics`)}`,
    "",
  ];
  try {
    process.stderr.write(lines.join("\n"));
  } catch {
    // ignore
  }

  writeMarker(dir, marker);
}
