/**
 * Nebutra CLI Error System
 *
 * Structured error handling with machine-readable JSON output for non-TTY environments.
 * Implements "错误即指南" (errors as guidance) principle:
 * - Every error includes actionable suggestions
 * - Machine-readable for Agent parsing
 * - Human-readable for terminal users
 *
 * Error output:
 * - TTY (interactive): Styled text to stderr with picocolors
 * - Non-TTY (Agent/piped): JSON to stderr for structured parsing
 * - stdout: Never polluted with error data
 */

import { stderr } from "node:process";
import picocolors from "picocolors";
import { ExitCode, type ExitCodeValue } from "./exit-codes.js";

/**
 * Machine-readable error structure for non-TTY output
 * Implements the "error as contract" principle for Agent consumption
 */
export interface CliError {
  /** Machine-readable error code (e.g., "permission_denied", "not_found") */
  error: string;

  /** Human-readable error message */
  message: string;

  /** Actionable suggestion for fixing the error (if available) */
  suggestion?: string;

  /** Whether Agent should retry this operation */
  retryable: boolean;

  /** Corresponding Unix exit code */
  exitCode: ExitCodeValue;

  /** Additional structured context for debugging */
  context?: Record<string, unknown>;

  /** Stack trace (only in verbose/debug mode) */
  stack?: string;
}

/**
 * Check if running in TTY terminal (interactive mode)
 * TTY = styled output; non-TTY = JSON output for piping/Agents
 */
function isTTY(): boolean {
  return process.stderr.isTTY === true && !process.env.CI && !process.env.NEBUTRA_NON_TTY;
}

/**
 * Format CliError as styled text for TTY terminals
 */
function formatTTY(error: CliError): string {
  const lines: string[] = [];

  // Error header with icon
  lines.push(picocolors.red(`✖ ${error.error}`));

  // Main message
  lines.push(picocolors.white(error.message));

  // Suggestion (if provided)
  if (error.suggestion) {
    lines.push("");
    lines.push(picocolors.cyan(`💡 Suggestion:`));
    lines.push(picocolors.gray(`   ${error.suggestion}`));
  }

  // Debug context (only if verbose)
  if (process.env.NEBUTRA_DEBUG && error.context && Object.keys(error.context).length > 0) {
    lines.push("");
    lines.push(picocolors.dim(`Debug context:`));
    lines.push(picocolors.dim(JSON.stringify(error.context, null, 2)));
  }

  // Stack trace (only if verbose)
  if (process.env.NEBUTRA_DEBUG && error.stack) {
    lines.push("");
    lines.push(picocolors.dim(`Stack trace:`));
    lines.push(picocolors.dim(error.stack));
  }

  return lines.join("\n");
}

/**
 * Format CliError as JSON for non-TTY environments (Agents, piped output)
 * This is the canonical structured format for machine parsing
 */
function formatJSON(error: CliError): string {
  const output = {
    error: error.error,
    message: error.message,
    ...(error.suggestion && { suggestion: error.suggestion }),
    retryable: error.retryable,
    exitCode: error.exitCode,
    ...(error.context && Object.keys(error.context).length > 0 && { context: error.context }),
    ...(process.env.NEBUTRA_DEBUG && error.stack && { stack: error.stack }),
  };
  return JSON.stringify(output);
}

/**
 * Options for creating a CLI error
 */
export interface CreateErrorOptions {
  /** Machine-readable error code */
  error: string;

  /** Human-readable error message */
  message: string;

  /** Actionable suggestion for fixing */
  suggestion?: string;

  /** Whether operation is retryable */
  retryable?: boolean;

  /** Exit code (defaults to ERROR) */
  exitCode?: ExitCodeValue;

  /** Structured context data */
  context?: Record<string, unknown>;

  /** Original error/stack for debugging */
  cause?: Error;
}

/**
 * Create a structured CLI error
 *
 * @example
 * const error = createCliError({
 *   error: "permission_denied",
 *   message: "Cannot access file: /etc/passwd",
 *   suggestion: "Check file permissions with `ls -la /etc/passwd`",
 *   exitCode: ExitCode.PERMISSION_DENIED,
 * });
 */
export function createCliError(opts: CreateErrorOptions): CliError {
  return {
    error: opts.error,
    message: opts.message,
    suggestion: opts.suggestion,
    retryable: opts.retryable ?? false,
    exitCode: opts.exitCode ?? ExitCode.ERROR,
    context: opts.context,
    stack: opts.cause?.stack,
  };
}

/**
 * Print structured error to stderr
 * - TTY: styled text
 * - Non-TTY: JSON for parsing
 * Does NOT call process.exit() — caller must handle that
 *
 * @example
 * const error = createCliError({ ... });
 * printError(error);
 * process.exit(error.exitCode);
 */
export function printError(error: CliError): void {
  const output = isTTY() ? formatTTY(error) : formatJSON(error);
  stderr.write(output + "\n");
}

/**
 * Print error and exit immediately
 * Convenience function that combines printError() + process.exit()
 *
 * @example
 * exitWithError(createCliError({ ... }));
 */
export function exitWithError(error: CliError): never {
  printError(error);
  process.exit(error.exitCode);
}

/**
 * Argument/option validation error
 * User provided invalid input — exit code 2
 *
 * @example
 * if (!value.match(/^[a-z]+$/)) {
 *   argError("Invalid value", "Value must be lowercase letters only");
 * }
 */
export function argError(message: string, suggestion?: string): never {
  exitWithError(
    createCliError({
      error: "invalid_argument",
      message,
      suggestion: suggestion ?? "Run `nebutra --help` for usage information",
      exitCode: ExitCode.INVALID_ARGS,
    }),
  );
}

/**
 * Configuration error
 * Missing or invalid config — exit code 9
 *
 * @example
 * configError("Missing nebutra.config.ts", "Run `nebutra init` to create configuration");
 */
export function configError(message: string, suggestion?: string): never {
  exitWithError(
    createCliError({
      error: "config_error",
      message,
      suggestion: suggestion ?? "Check your nebutra configuration file and try again",
      exitCode: ExitCode.CONFIG_ERROR,
    }),
  );
}

/**
 * Resource not found error
 * File, component, or directory doesn't exist — exit code 3
 *
 * @example
 * notFoundError(
 *   "Component not found: Button",
 *   "Run `nebutra add Button` to add it to your project"
 * );
 */
export function notFoundError(message: string, suggestion?: string): never {
  exitWithError(
    createCliError({
      error: "not_found",
      message,
      suggestion: suggestion ?? "Check the resource path and try again",
      exitCode: ExitCode.NOT_FOUND,
    }),
  );
}

/**
 * Resource already exists error
 * File or component already present — exit code 5
 *
 * @example
 * conflictError(
 *   "Component already exists: src/Button.tsx",
 *   "Use `--overwrite` to replace it"
 * );
 */
export function conflictError(message: string, suggestion?: string): never {
  exitWithError(
    createCliError({
      error: "conflict",
      message,
      suggestion: suggestion ?? "Use `--overwrite` to replace the existing resource",
      exitCode: ExitCode.CONFLICT,
    }),
  );
}

/**
 * Permission denied error
 * Auth failure or insufficient permissions — exit code 4
 *
 * @example
 * permissionError(
 *   "Authentication required",
 *   "Run `nebutra auth login` to authenticate with your account"
 * );
 */
export function permissionError(message: string, suggestion?: string): never {
  exitWithError(
    createCliError({
      error: "permission_denied",
      message,
      suggestion: suggestion ?? "Check your authentication credentials",
      exitCode: ExitCode.PERMISSION_DENIED,
    }),
  );
}

/**
 * Network or external service error (retryable)
 * API failure, connectivity issue — exit code 6
 *
 * @example
 * networkError(
 *   "Failed to fetch component registry",
 *   "Check your internet connection and try again"
 * );
 */
export function networkError(message: string, suggestion?: string): never {
  exitWithError(
    createCliError({
      error: "network_error",
      message,
      suggestion: suggestion ?? "Check your internet connection and try again",
      retryable: true,
      exitCode: ExitCode.NETWORK_ERROR,
    }),
  );
}

/**
 * Operation timed out (retryable)
 * Network or processing timeout — exit code 7
 *
 * @example
 * timeoutError("Registry fetch timed out after 30s");
 */
export function timeoutError(message: string, suggestion?: string): never {
  exitWithError(
    createCliError({
      error: "timeout",
      message,
      suggestion: suggestion ?? "Try again or use `--timeout 60` to increase the timeout",
      retryable: true,
      exitCode: ExitCode.TIMEOUT,
    }),
  );
}

/**
 * User cancelled the operation
 * Via Ctrl+C or prompt rejection — exit code 8
 *
 * @example
 * cancelledError("Operation cancelled by user");
 */
export function cancelledError(message?: string): never {
  exitWithError(
    createCliError({
      error: "cancelled",
      message: message ?? "Operation was cancelled",
      exitCode: ExitCode.CANCELLED,
    }),
  );
}

/**
 * Version or dependency incompatibility
 * Conflicting versions or incompatible requirements — exit code 11
 *
 * @example
 * incompatibleError(
 *   "Node.js 18+ required, but found 16.x",
 *   "Update Node.js to the latest LTS version"
 * );
 */
export function incompatibleError(message: string, suggestion?: string): never {
  exitWithError(
    createCliError({
      error: "incompatible",
      message,
      suggestion: suggestion ?? "Update your dependencies or environment",
      exitCode: ExitCode.INCOMPATIBLE,
    }),
  );
}

/**
 * System resource exhausted
 * Disk space, memory, or other system resource — exit code 12
 *
 * @example
 * resourceExhaustedError(
 *   "Insufficient disk space for component download",
 *   "Free up disk space and try again"
 * );
 */
export function resourceExhaustedError(message: string, suggestion?: string): never {
  exitWithError(
    createCliError({
      error: "resource_exhausted",
      message,
      suggestion: suggestion ?? "Free up system resources and try again",
      retryable: true,
      exitCode: ExitCode.RESOURCE_EXHAUSTED,
    }),
  );
}

/**
 * Generic error with custom exit code
 * For errors that don't fit standard patterns
 *
 * @example
 * fatalError("Unexpected database error", ExitCode.ERROR, {
 *   suggestion: "Contact support if this persists",
 *   context: { database: "postgres", error: dbError.message },
 * });
 */
export function fatalError(
  message: string,
  exitCode: ExitCodeValue = ExitCode.ERROR,
  opts?: {
    suggestion?: string;
    context?: Record<string, unknown>;
    cause?: Error;
  },
): never {
  exitWithError(
    createCliError({
      error: "fatal_error",
      message,
      suggestion: opts?.suggestion,
      exitCode,
      context: opts?.context,
      cause: opts?.cause,
    }),
  );
}
