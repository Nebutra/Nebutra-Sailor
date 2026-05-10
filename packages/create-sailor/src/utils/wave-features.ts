/**
 * Wave 3-5 feature toggles for create-sailor.
 *
 * These toggles correspond to the cross-cutting features shipped between
 * v1.3.4 and v1.3.6 (audit log, api keys, command palette, GDPR cookie
 * consent, dynamic legal pages, scheduled cron handlers, and the
 * `@nebutra/china-compliance` package). They are surfaced via the
 * `--<flag>=<true|false>` syntax so they can be opted out of from CI
 * scripts without touching the interactive prompt path.
 */

import type { Region } from "./config.js";

export interface WaveFeatureFlagInputs {
  cronJobs?: string;
  auditLog?: string;
  apiKeys?: string;
  webhooks?: string;
  commandPalette?: string;
  cookieConsent?: string;
  legalPages?: string;
  chinaCompliance?: string;
}

export interface WaveFeatureToggles {
  cronJobs: boolean;
  auditLog: boolean;
  apiKeys: boolean;
  /**
   * Outbound webhook **UI surface** (settings page, dispatcher API route,
   * `@nebutra/webhooks` package). Distinct from the `--webhooks <id>` CLI
   * flag which selects a *provider* (svix | custom | none). When this is
   * `false`, `pruneWaveFeatures` removes the entire webhook surface even if
   * a provider was selected.
   */
  webhooks: boolean;
  commandPalette: boolean;
  cookieConsent: boolean;
  legalPages: boolean;
  chinaCompliance: boolean;
}

/**
 * Parse a `true|false` string flag (case-insensitive) to a boolean. Returns
 * `fallback` when the value is missing or unrecognised — keeps the CLI
 * forgiving when users omit the flag entirely.
 */
export function parseBoolFlag(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined) return fallback;
  const v = String(raw).trim().toLowerCase();
  if (v === "true" || v === "1" || v === "yes" || v === "on") return true;
  if (v === "false" || v === "0" || v === "no" || v === "off") return false;
  return fallback;
}

/**
 * Resolve all wave 3-5 toggles from CLI flag inputs, applying region-aware
 * defaults. `chinaCompliance` defaults to `true` when `region=cn`,
 * otherwise `false`. Every other toggle defaults to `true`.
 *
 * Immutability: returns a fresh object — callers should treat the result
 * as read-only.
 */
export function resolveWaveFeatureToggles(
  flags: WaveFeatureFlagInputs,
  region: Region,
): WaveFeatureToggles {
  const chinaDefault = region === "cn";
  return {
    cronJobs: parseBoolFlag(flags.cronJobs, true),
    auditLog: parseBoolFlag(flags.auditLog, true),
    apiKeys: parseBoolFlag(flags.apiKeys, true),
    webhooks: parseBoolFlag(flags.webhooks, true),
    commandPalette: parseBoolFlag(flags.commandPalette, true),
    cookieConsent: parseBoolFlag(flags.cookieConsent, true),
    legalPages: parseBoolFlag(flags.legalPages, true),
    chinaCompliance: parseBoolFlag(flags.chinaCompliance, chinaDefault),
  };
}
