import { spinner as createSpinner } from "@clack/prompts";
import picocolors from "picocolors";

/**
 * Log level enumeration
 */
export type LogLevel = "debug" | "info" | "warn" | "error" | "success";

/**
 * Logger configuration interface
 */
export interface LoggerConfig {
  level?: LogLevel;
  format?: "plain" | "json";
  scope?: string;
  verbose?: boolean;
  quiet?: boolean;
}

/**
 * Structured log entry for JSON output
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  scope?: string;
  message: string;
  details?: Record<string, any>;
}

/**
 * Spinner wrapper with consistent styling
 */
export interface Spinner {
  start(message: string): void;
  stop(message?: string, code?: number): void;
  message(message: string): void;
}

/**
 * Log level priorities (higher = more important)
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  success: 1,
};

/**
 * Get effective log level from environment and config
 */
function getEffectiveLogLevel(config: LoggerConfig): LogLevel {
  if (config.quiet) return "error";
  if (config.verbose) return "debug";

  const envLevel = process.env.NEBUTRA_LOG_LEVEL as LogLevel | undefined;
  if (envLevel && LOG_LEVEL_PRIORITY[envLevel] !== undefined) {
    return envLevel;
  }

  return config.level ?? "info";
}

/**
 * Get log format from environment or config
 */
function getLogFormat(config: LoggerConfig): "plain" | "json" {
  if (process.env.NEBUTRA_LOG_FORMAT === "json") {
    return "json";
  }
  return config.format ?? "plain";
}

/**
 * Format a log entry as plain text
 */
function formatPlain(level: LogLevel, message: string, scope?: string): string {
  const timestamp = new Date().toISOString().split("T")[1].split(".")[0]; // HH:MM:SS
  const prefix = scope ? `[${scope}]` : "";

  switch (level) {
    case "error":
      return `${picocolors.red(`✖ ${prefix}`)} ${message}`.trim();
    case "warn":
      return `${picocolors.yellow(`⚠ ${prefix}`)} ${message}`.trim();
    case "success":
      return `${picocolors.green(`✓ ${prefix}`)} ${message}`.trim();
    case "debug":
      return `${picocolors.dim(`[debug ${timestamp}] ${prefix}`)} ${message}`.trim();
    default:
      return `${picocolors.blue(`ℹ ${prefix}`)} ${message}`.trim();
  }
}

/**
 * Format a log entry as JSON
 */
function formatJson(
  level: LogLevel,
  message: string,
  scope?: string,
  details?: Record<string, any>,
): string {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    scope,
    message,
    ...(details && { details }),
  };
  return JSON.stringify(entry);
}

/**
 * Create a spinner with consistent styling
 */
function createStyledSpinner(): Spinner {
  const baseSpinner = createSpinner();

  return {
    start(message: string) {
      baseSpinner.start(picocolors.cyan(message));
    },
    stop(message?: string, code?: number) {
      if (message) {
        if (code === 0) {
          baseSpinner.stop(picocolors.green(`✓ ${message}`));
        } else {
          baseSpinner.stop(picocolors.red(`✖ ${message}`));
        }
      } else {
        baseSpinner.stop("");
      }
    },
    message(message: string) {
      baseSpinner.message(picocolors.cyan(message));
    },
  };
}

/**
 * Logger instance
 */
class Logger {
  private config: LoggerConfig;
  private effectiveLevel: LogLevel;
  private format: "plain" | "json";

  constructor(config: LoggerConfig = {}) {
    this.config = config;
    this.effectiveLevel = getEffectiveLogLevel(config);
    this.format = getLogFormat(config);
  }

  /**
   * Check if a message at a given level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.effectiveLevel];
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, details?: Record<string, any>): void {
    if (!this.shouldLog(level)) return;

    const output =
      this.format === "json"
        ? formatJson(level, message, this.config.scope, details)
        : formatPlain(level, message, this.config.scope);

    // Write to stdout for info/debug/success, stderr for warn/error
    const stream = level === "error" || level === "warn" ? process.stderr : process.stdout;
    stream.write(output + "\n");
  }

  /**
   * Log debug message
   */
  debug(message: string, details?: Record<string, any>): void {
    this.log("debug", message, details);
  }

  /**
   * Log info message
   */
  info(message: string, details?: Record<string, any>): void {
    this.log("info", message, details);
  }

  /**
   * Log warning message
   */
  warn(message: string, details?: Record<string, any>): void {
    this.log("warn", message, details);
  }

  /**
   * Log error message
   */
  error(message: string, details?: Record<string, any>): void {
    this.log("error", message, details);
  }

  /**
   * Log success message
   */
  success(message: string, details?: Record<string, any>): void {
    this.log("success", message, details);
  }

  /**
   * Log a step in a multi-step process
   * Example: [2/5] Installing dependencies...
   */
  step(current: number, total: number, message: string): void {
    const stepStr = picocolors.cyan(`[${current}/${total}]`);
    this.log("info", `${stepStr} ${message}`);
  }

  /**
   * Create a spinner
   */
  spinner(): Spinner {
    return createStyledSpinner();
  }

  /**
   * Create a scoped logger (for subsystems)
   */
  scope(name: string): Logger {
    return new Logger({
      ...this.config,
      scope: name,
    });
  }

  /**
   * Update logger configuration at runtime
   */
  setConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
    this.effectiveLevel = getEffectiveLogLevel(this.config);
    this.format = getLogFormat(this.config);
  }

  /**
   * Get current effective log level
   */
  getLevel(): LogLevel {
    return this.effectiveLevel;
  }
}

/**
 * Factory function to create a logger instance
 */
export function createLogger(config?: LoggerConfig): Logger {
  return new Logger(config);
}

/**
 * Default logger instance (exported for convenience)
 */
export const logger = createLogger({
  level: (process.env.NEBUTRA_LOG_LEVEL as LogLevel) ?? "info",
  verbose: process.argv.includes("--verbose"),
  quiet: process.argv.includes("--quiet"),
});

export type { Logger };
