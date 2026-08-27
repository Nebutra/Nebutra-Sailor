import { type CliError, createCliError, printError } from "./errors";
import { ExitCode, type ExitCodeValue } from "./exit-codes";

export interface CommandErrorOptions {
  readonly code: string;
  readonly message: string;
  readonly exitCode?: ExitCodeValue;
  readonly suggestion?: string;
  readonly retryable?: boolean;
  readonly context?: Record<string, unknown>;
  readonly cause?: unknown;
}

/**
 * Error type for command actions. Throw this from `.action(...)` bodies and
 * wrap the body in `runCommand(...)` so CLI failures keep structured output and
 * a deterministic exit code.
 */
export class CommandError extends Error {
  readonly code: string;
  readonly exitCode: ExitCodeValue;
  readonly suggestion?: string;
  readonly retryable: boolean;
  readonly context?: Record<string, unknown>;
  override readonly cause?: unknown;

  constructor(options: CommandErrorOptions) {
    super(options.message);
    this.name = "CommandError";
    this.code = options.code;
    this.exitCode = options.exitCode ?? ExitCode.ERROR;
    this.suggestion = options.suggestion;
    this.retryable = options.retryable ?? false;
    this.context = options.context;
    this.cause = options.cause;
  }
}

export function isCommandError(error: unknown): error is CommandError {
  return error instanceof CommandError;
}

export function toCliError(error: unknown): CliError {
  if (isCommandError(error)) {
    return createCliError({
      error: error.code,
      message: error.message,
      suggestion: error.suggestion,
      retryable: error.retryable,
      exitCode: error.exitCode,
      context: error.context,
      cause: error.cause instanceof Error ? error.cause : error,
    });
  }

  if (error instanceof Error) {
    return createCliError({
      error: "unexpected_error",
      message: error.message,
      suggestion: "Re-run with NEBUTRA_DEBUG=1 for a stack trace.",
      exitCode: ExitCode.ERROR,
      cause: error,
    });
  }

  return createCliError({
    error: "unexpected_error",
    message: String(error),
    suggestion: "Re-run with NEBUTRA_DEBUG=1 for a stack trace.",
    exitCode: ExitCode.ERROR,
  });
}

export function reportCommandError(error: unknown): ExitCodeValue {
  const cliError = toCliError(error);
  printError(cliError);
  return cliError.exitCode;
}

export async function runCommand(action: () => Promise<void> | void): Promise<void> {
  try {
    await action();
  } catch (error) {
    process.exitCode = reportCommandError(error);
  }
}
