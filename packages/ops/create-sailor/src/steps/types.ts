/**
 * Shared types for create-sailor.
 *
 * The scaffold asks nothing but where to put the project (ADR 2026-09-24
 * Sailor convergence). The only options are mechanical.
 */

export interface CliOptions {
  pm?: string;
  install?: boolean;
  git?: boolean;
  yes?: boolean;
  dryRun?: boolean;
  json?: boolean;
  color?: boolean;
  help?: boolean;
}

export type JsonEvent = {
  event: string;
  step?: string;
  status?: "ok" | "error" | "skip" | "start" | "warn";
  message?: string;
  [k: string]: unknown;
};

export function detectPm(): "npm" | "pnpm" | "yarn" | "bun" {
  const ua = process.env.npm_config_user_agent ?? "";
  if (ua.startsWith("pnpm")) return "pnpm";
  if (ua.startsWith("yarn")) return "yarn";
  if (ua.startsWith("bun")) return "bun";
  return "npm";
}
