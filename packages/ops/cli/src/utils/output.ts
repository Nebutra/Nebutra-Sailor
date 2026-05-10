/**
 * Nebutra CLI Output Formatter
 *
 * TTY-aware output that automatically adapts to environment.
 * Implements "感知环境" (sense environment) and "输出是契约" (output as contract) principles.
 *
 * Key principles:
 * - Detect TTY vs non-TTY (Agent/piped) environment
 * - stdout: ONLY for data output (JSON, CSV, tables)
 * - stderr: ONLY for status/progress messages (never pollutes data)
 * - Format: JSON in non-TTY, human-readable in TTY
 * - Output is a contract: stable format, machine-parseable
 */

import { stderr, stdout } from "node:process";
import picocolors from "picocolors";

/**
 * Output format mode
 */
export type OutputFormat = "json" | "table" | "plain";

/**
 * Output configuration options
 */
export interface OutputOptions {
  /** Explicit output format override */
  format?: OutputFormat;

  /** Disable colored output (respect NO_COLOR env) */
  noColor?: boolean;

  /** Disable interactive prompts (non-interactive mode) */
  noInteractive?: boolean;

  /** Stream to write to (defaults: stdout for data, stderr for status) */
  stream?: "stdout" | "stderr";
}

/**
 * Detect if running in an interactive TTY terminal
 * Returns false for:
 * - CI environments (GITHUB_ACTIONS, CI, etc.)
 * - Piped/redirected output
 * - Non-TTY streams
 * - Explicit NEBUTRA_NON_TTY env var
 */
export function isTTY(): boolean {
  if (process.env.NEBUTRA_NON_TTY) {
    return false;
  }

  if (process.env.CI || process.env.GITHUB_ACTIONS) {
    return false;
  }

  return process.stderr.isTTY === true;
}

/**
 * Get the effective output format based on:
 * 1. Explicit --format flag
 * 2. NEBUTRA_OUTPUT_FORMAT env var
 * 3. TTY auto-detection (TTY → plain, non-TTY → json)
 *
 * @example
 * const format = getOutputFormat(explicitFormat);
 * // Returns "json" in non-TTY, "plain" in TTY
 */
export function getOutputFormat(explicit?: OutputFormat): OutputFormat {
  // Priority 1: Explicit flag
  if (explicit) {
    return explicit;
  }

  // Priority 2: Environment variable
  const envFormat = process.env.NEBUTRA_OUTPUT_FORMAT as OutputFormat | undefined;
  if (envFormat && ["json", "table", "plain"].includes(envFormat)) {
    return envFormat;
  }

  // Priority 3: Auto-detect based on TTY
  return isTTY() ? "plain" : "json";
}

/**
 * Check if colors should be disabled
 * Respects NO_COLOR env var and --no-color flag
 */
export function shouldDisableColor(): boolean {
  return !!(process.env.NO_COLOR || process.argv.includes("--no-color"));
}

/**
 * Check if interactive prompts should be skipped
 * Returns false in:
 * - CI environments
 * - Non-TTY streams
 * - With --yes, --no-interactive, or CI env vars
 */
export function isInteractive(): boolean {
  if (process.env.CI || process.env.GITHUB_ACTIONS) {
    return false;
  }

  if (!isTTY()) {
    return false;
  }

  if (process.argv.includes("--yes") || process.argv.includes("--no-interactive")) {
    return false;
  }

  return true;
}

/**
 * Format data for table output
 * Converts array of objects into aligned columns
 *
 * @example
 * const rows = [
 *   { name: "Button", version: "1.0.0", status: "published" },
 *   { name: "Card", version: "2.1.0", status: "draft" },
 * ];
 * console.log(formatTable(rows));
 */
export function formatTable(
  rows: Record<string, unknown>[],
  columns?: (keyof Record<string, unknown>)[],
): string {
  if (rows.length === 0) {
    return "";
  }

  // Determine columns
  const cols = columns || Object.keys(rows[0]);

  // Calculate column widths
  const widths: Record<string, number> = {};
  for (const col of cols) {
    widths[String(col)] = String(col).length;
    for (const row of rows) {
      const value = String(row[col] ?? "");
      widths[String(col)] = Math.max(widths[String(col)], value.length);
    }
  }

  // Format header
  const header = cols.map((col) => String(col).padEnd(widths[String(col)])).join(" | ");
  const divider = cols.map((col) => "-".repeat(widths[String(col)])).join("-+-");

  // Format rows
  const formatted: string[] = [header, divider];
  for (const row of rows) {
    const line = cols.map((col) => String(row[col] ?? "").padEnd(widths[String(col)])).join(" | ");
    formatted.push(line);
  }

  return formatted.join("\n");
}

/**
 * Format data as JSON
 * Ensures consistent, minified JSON output for piping/parsing
 */
function formatAsJSON(data: unknown): string {
  return JSON.stringify(data);
}

/**
 * Format data as plain text table
 * Uses formatTable() with styled headers/separators
 */
function formatAsTable(data: unknown): string {
  if (!Array.isArray(data)) {
    return formatAsPlain(data);
  }

  // Check if array of objects
  if (data.length === 0) {
    return "(empty)";
  }

  if (typeof data[0] !== "object" || data[0] === null) {
    return formatAsPlain(data);
  }

  const table = formatTable(data as Record<string, unknown>[]);
  return picocolors.gray(table);
}

/**
 * Format data as human-readable plain text
 * Styled output for terminal display
 */
function formatAsPlain(data: unknown): string {
  if (typeof data === "string") {
    return data;
  }

  if (typeof data === "number" || typeof data === "boolean") {
    return String(data);
  }

  if (data === null || data === undefined) {
    return "";
  }

  if (Array.isArray(data)) {
    // For simple arrays, join with commas
    if (data.length === 0) {
      return "(empty list)";
    }
    if (data.every((x) => typeof x === "string" || typeof x === "number")) {
      return data.join(", ");
    }
    // For complex arrays, show formatted JSON
    return JSON.stringify(data, null, 2);
  }

  if (typeof data === "object") {
    // For objects, show formatted JSON
    return JSON.stringify(data, null, 2);
  }

  return String(data);
}

/**
 * Write data to stdout in the appropriate format
 * Format chosen by getOutputFormat() based on TTY + env + flags
 *
 * Key contract:
 * - stdout is ONLY for data output
 * - Never mix data and status messages on stdout
 * - Use status() for progress/status messages
 *
 * @example
 * // In TTY: pretty-printed table; in non-TTY: compact JSON
 * output([
 *   { name: "Button", published: true },
 *   { name: "Card", published: false },
 * ]);
 */
export function output(data: unknown, options?: OutputOptions): void {
  const format = getOutputFormat(options?.format);
  const stream = options?.stream === "stderr" ? stderr : stdout;

  let formatted: string;

  switch (format) {
    case "json":
      formatted = formatAsJSON(data);
      break;
    case "table":
      formatted = formatAsTable(data);
      break;
    default:
      formatted = formatAsPlain(data);
      break;
  }

  stream.write(formatted + "\n");
}

/**
 * Write a status/progress message to stderr
 * Never pollutes stdout (which is reserved for data)
 *
 * Status messages are:
 * - Warnings, info, debug, success messages
 * - Progress indicators (spinners, step counters)
 * - Any output that's not part of the command's data output
 *
 * @example
 * status("Installing dependencies...");
 * // ... do work ...
 * status("Done!");
 *
 * // Agent sees clean stdout, status messages on stderr
 */
export function status(
  message: string,
  level: "info" | "success" | "warn" | "error" = "info",
): void {
  let prefix: string;

  switch (level) {
    case "error":
      prefix = picocolors.red("✖");
      break;
    case "warn":
      prefix = picocolors.yellow("⚠");
      break;
    case "success":
      prefix = picocolors.green("✓");
      break;
    default:
      prefix = picocolors.blue("ℹ");
      break;
  }

  const formatted = `${prefix} ${message}`;
  stderr.write(formatted + "\n");
}

/**
 * Write a debug message to stderr (only in verbose mode)
 * Respects NEBUTRA_DEBUG and --debug flag
 */
export function debug(message: string, context?: Record<string, unknown>): void {
  const isDebug = process.env.NEBUTRA_DEBUG || process.argv.includes("--debug");

  if (!isDebug) {
    return;
  }

  const formatted = picocolors.dim(`[debug] ${message}`);
  stderr.write(formatted + "\n");

  if (context && Object.keys(context).length > 0) {
    stderr.write(picocolors.dim(JSON.stringify(context, null, 2)) + "\n");
  }
}

/**
 * Format a success banner (e.g., after successful operation)
 * Used for completion messages that warrant emphasis
 *
 * @example
 * successBanner("Component added successfully!", {
 *   path: "src/Button.tsx",
 *   size: "2.5 KB",
 * });
 */
export function successBanner(title: string, details?: Record<string, string | number>): void {
  stderr.write("\n");
  stderr.write(picocolors.green(`✓ ${title}\n`));

  if (details && Object.keys(details).length > 0) {
    for (const [key, value] of Object.entries(details)) {
      stderr.write(picocolors.gray(`  ${key}: ${value}\n`));
    }
  }

  stderr.write("\n");
}

/**
 * Format an error banner (e.g., for fatal errors)
 * Used for error messages that warrant emphasis
 *
 * @example
 * errorBanner("Installation failed", {
 *   reason: "Network timeout",
 *   retry: "nebutra add Button --retry",
 * });
 */
export function errorBanner(title: string, details?: Record<string, string | number>): void {
  stderr.write("\n");
  stderr.write(picocolors.red(`✖ ${title}\n`));

  if (details && Object.keys(details).length > 0) {
    for (const [key, value] of Object.entries(details)) {
      stderr.write(picocolors.gray(`  ${key}: ${value}\n`));
    }
  }

  stderr.write("\n");
}

/**
 * Create a section header for structured output
 * Useful for organizing multi-part output
 *
 * @example
 * sectionHeader("Components");
 * output(components);
 * sectionHeader("Dependencies");
 * output(dependencies);
 */
export function sectionHeader(title: string): void {
  stderr.write("\n");
  stderr.write(picocolors.bold(picocolors.cyan(title)) + "\n");
  stderr.write(picocolors.gray("-".repeat(title.length)) + "\n");
  stderr.write("\n");
}

/**
 * Create a line separator (visual break in output)
 * Useful for breaking up dense output
 */
export function separator(): void {
  stderr.write(picocolors.gray("─".repeat(80)) + "\n");
}
