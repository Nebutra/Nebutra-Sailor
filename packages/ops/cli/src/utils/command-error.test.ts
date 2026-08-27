import { afterEach, describe, expect, it, vi } from "vitest";
import { CommandError, runCommand, toCliError } from "./command-error";
import { ExitCode } from "./exit-codes";

describe("command-error utilities", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = undefined;
    delete process.env.NEBUTRA_NON_TTY;
  });

  it("maps CommandError to the structured CLI error contract", () => {
    const error = new CommandError({
      code: "doctor_failed",
      message: "Doctor found critical issues.",
      suggestion: "Fix the errors and try again.",
      exitCode: ExitCode.CONFIG_ERROR,
      context: { command: "doctor" },
    });

    expect(toCliError(error)).toMatchObject({
      error: "doctor_failed",
      message: "Doctor found critical issues.",
      suggestion: "Fix the errors and try again.",
      retryable: false,
      exitCode: ExitCode.CONFIG_ERROR,
      context: { command: "doctor" },
    });
  });

  it("sets process.exitCode and prints structured output when a command fails", async () => {
    process.env.NEBUTRA_NON_TTY = "1";
    const stderrWrite = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

    await runCommand(() => {
      throw new CommandError({
        code: "invalid_state",
        message: "The command cannot continue.",
        exitCode: ExitCode.CONFLICT,
      });
    });

    expect(process.exitCode).toBe(ExitCode.CONFLICT);
    expect(stderrWrite).toHaveBeenCalledWith(expect.stringContaining('"error":"invalid_state"'));
  });

  it("normalizes unknown errors to exit code 1", async () => {
    process.env.NEBUTRA_NON_TTY = "1";
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);

    await runCommand(() => {
      throw new Error("boom");
    });

    expect(process.exitCode).toBe(ExitCode.ERROR);
  });
});
