/**
 * Nebutra CLI Exit Codes
 *
 * Fine-grained exit codes for Agent-friendly error handling.
 * Agents use exit codes as the primary control flow signal.
 *
 * IMPORTANT: These codes are a public API contract.
 * Never change the meaning of an existing code across versions.
 *
 * Exit codes follow Unix conventions:
 * - 0: Success
 * - 1: General error
 * - 2: Misuse of shell command
 * - 3-127: Application-specific codes
 *
 * Agents should use exit codes to programmatically decide:
 * - Whether to retry the operation
 * - Whether the error is user-fixable (invalid args, missing config)
 * - Whether to escalate or log for debugging
 */

export const ExitCode = {
  /** Command completed successfully */
  SUCCESS: 0,

  /** General/unknown error (fallback) */
  ERROR: 1,

  /** Invalid arguments or options */
  INVALID_ARGS: 2,

  /** Requested resource not found (file, component, config) */
  NOT_FOUND: 3,

  /** Insufficient permissions (auth, file permissions) */
  PERMISSION_DENIED: 4,

  /** Resource already exists (conflict) */
  CONFLICT: 5,

  /** Network or external service error (retryable) */
  NETWORK_ERROR: 6,

  /** Operation timed out (retryable) */
  TIMEOUT: 7,

  /** User cancelled the operation (via Ctrl+C or prompt) */
  CANCELLED: 8,

  /** Configuration error (missing config, invalid schema) */
  CONFIG_ERROR: 9,

  /** Dry-run completed successfully (no side effects) */
  DRY_RUN_OK: 10,

  /** Incompatible version or dependency conflict */
  INCOMPATIBLE: 11,

  /** System resource exhausted (disk space, memory) */
  RESOURCE_EXHAUSTED: 12,
} as const;

export type ExitCodeValue = (typeof ExitCode)[keyof typeof ExitCode];

/**
 * Human-readable descriptions for each exit code
 * Used in --help, error messages, and documentation
 */
export const EXIT_CODE_DESCRIPTIONS: Record<ExitCodeValue, string> = {
  [ExitCode.SUCCESS]: "Command completed successfully",
  [ExitCode.ERROR]: "General or unknown error occurred",
  [ExitCode.INVALID_ARGS]: "Invalid arguments or options provided",
  [ExitCode.NOT_FOUND]: "Requested resource not found",
  [ExitCode.PERMISSION_DENIED]: "Permission denied or authentication required",
  [ExitCode.CONFLICT]: "Resource already exists",
  [ExitCode.NETWORK_ERROR]: "Network or external service error (may be retryable)",
  [ExitCode.TIMEOUT]: "Operation timed out (may be retryable)",
  [ExitCode.CANCELLED]: "Operation cancelled by user",
  [ExitCode.CONFIG_ERROR]: "Configuration error or missing configuration",
  [ExitCode.DRY_RUN_OK]: "Dry-run completed successfully",
  [ExitCode.INCOMPATIBLE]: "Incompatible version or dependency conflict",
  [ExitCode.RESOURCE_EXHAUSTED]: "System resource exhausted",
};

/**
 * Error categories for Agents to use in decision logic
 */
export enum ErrorCategory {
  /** User provided invalid input (agent should show help/suggestions) */
  USER_INPUT = "user_input",

  /** Agent must authenticate or provide credentials */
  AUTHENTICATION = "authentication",

  /** Resource doesn't exist (agent should check search paths or suggest creation) */
  NOT_FOUND_ERROR = "not_found",

  /** Temporary failure, safe to retry */
  TRANSIENT = "transient",

  /** Operation was interrupted (can retry) */
  INTERRUPTED = "interrupted",

  /** System configuration issue (agent should ask user to fix) */
  CONFIGURATION = "configuration",

  /** Incompatibility or version mismatch */
  INCOMPATIBILITY = "incompatibility",

  /** Unknown or unrecoverable error */
  UNKNOWN = "unknown",
}

/**
 * Categorize an exit code for Agent decision-making
 *
 * @example
 * const code = someCommand.exitCode;
 * const category = categorizeExitCode(code);
 *
 * if (category === ErrorCategory.TRANSIENT) {
 *   // Agent should retry with backoff
 * } else if (category === ErrorCategory.USER_INPUT) {
 *   // Agent should display help and ask user
 * }
 */
export function categorizeExitCode(code: ExitCodeValue): ErrorCategory {
  switch (code) {
    case ExitCode.SUCCESS:
      return ErrorCategory.USER_INPUT; // Not an error
    case ExitCode.INVALID_ARGS:
    case ExitCode.CONFIG_ERROR:
      return ErrorCategory.USER_INPUT;
    case ExitCode.PERMISSION_DENIED:
      return ErrorCategory.AUTHENTICATION;
    case ExitCode.NOT_FOUND:
      return ErrorCategory.NOT_FOUND_ERROR;
    case ExitCode.NETWORK_ERROR:
    case ExitCode.TIMEOUT:
      return ErrorCategory.TRANSIENT;
    case ExitCode.CANCELLED:
      return ErrorCategory.INTERRUPTED;
    case ExitCode.INCOMPATIBLE:
      return ErrorCategory.INCOMPATIBILITY;
    case ExitCode.RESOURCE_EXHAUSTED:
      return ErrorCategory.TRANSIENT;
    case ExitCode.ERROR:
    default:
      return ErrorCategory.UNKNOWN;
  }
}

/**
 * Check if an exit code represents a retryable error
 *
 * Agents should retry operations that fail with retryable codes,
 * typically with exponential backoff.
 *
 * @example
 * if (isRetryable(exitCode)) {
 *   await retryWithBackoff(() => runCommand());
 * }
 */
export function isRetryable(code: ExitCodeValue): boolean {
  return (
    code === ExitCode.NETWORK_ERROR ||
    code === ExitCode.TIMEOUT ||
    code === ExitCode.CANCELLED ||
    code === ExitCode.RESOURCE_EXHAUSTED
  );
}

/**
 * Check if an exit code indicates the command succeeded
 */
export function isSuccess(code: ExitCodeValue): boolean {
  return code === ExitCode.SUCCESS || code === ExitCode.DRY_RUN_OK;
}

/**
 * Get a suggested retry strategy for an exit code
 *
 * @example
 * const strategy = getRetryStrategy(exitCode);
 * if (strategy.shouldRetry) {
 *   await retryWithBackoff(
 *     command,
 *     strategy.maxAttempts,
 *     strategy.initialDelayMs,
 *     strategy.backoffMultiplier
 *   );
 * }
 */
export interface RetryStrategy {
  shouldRetry: boolean;
  maxAttempts: number;
  initialDelayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
}

export function getRetryStrategy(code: ExitCodeValue): RetryStrategy {
  if (!isRetryable(code)) {
    return {
      shouldRetry: false,
      maxAttempts: 1,
      initialDelayMs: 0,
      backoffMultiplier: 1,
      maxDelayMs: 0,
    };
  }

  // Different strategies based on error type
  if (code === ExitCode.TIMEOUT) {
    return {
      shouldRetry: true,
      maxAttempts: 3,
      initialDelayMs: 1000,
      backoffMultiplier: 2,
      maxDelayMs: 10000,
    };
  }

  if (code === ExitCode.NETWORK_ERROR) {
    return {
      shouldRetry: true,
      maxAttempts: 5,
      initialDelayMs: 500,
      backoffMultiplier: 1.5,
      maxDelayMs: 15000,
    };
  }

  if (code === ExitCode.RESOURCE_EXHAUSTED) {
    return {
      shouldRetry: true,
      maxAttempts: 2,
      initialDelayMs: 5000,
      backoffMultiplier: 2,
      maxDelayMs: 15000,
    };
  }

  // Default retry strategy
  return {
    shouldRetry: true,
    maxAttempts: 3,
    initialDelayMs: 1000,
    backoffMultiplier: 2,
    maxDelayMs: 10000,
  };
}

/**
 * Check if exit code indicates user-fixable error
 *
 * Agents should provide helpful suggestions for user-fixable errors.
 *
 * @example
 * if (isUserFixable(code)) {
 *   console.log("Suggestion:", getSuggestion(code));
 * }
 */
export function isUserFixable(code: ExitCodeValue): boolean {
  return (
    code === ExitCode.INVALID_ARGS ||
    code === ExitCode.CONFIG_ERROR ||
    code === ExitCode.PERMISSION_DENIED ||
    code === ExitCode.INCOMPATIBLE
  );
}
