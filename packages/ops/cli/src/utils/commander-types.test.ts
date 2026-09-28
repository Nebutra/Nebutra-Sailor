import { Command } from "commander";
import { describe, expect, it } from "vitest";
import { mergeGlobalOptions } from "./commander-types";

/**
 * Regression tests for the exact bug this module exists to prevent: when a
 * root program option (`--format`, `--yes`) is ALSO declared locally on a
 * subcommand, Commander binds a user-typed value to whichever level's own
 * parser sees it first — the other level's local `options` snapshot then
 * still carries its own default/unset value for that same key.
 * `mergeGlobalOptions` used to spread that local snapshot last, unconditionally
 * (`{ ...globals, ...options }`), so the untouched local default silently
 * clobbered the real value. These tests build genuine two-level `Command`
 * trees (no mocking) — the same shape every real nebutra subcommand uses —
 * and assert the merge survives the shadow.
 */
describe("mergeGlobalOptions", () => {
  function buildProgram(): { program: Command; run: (argv: string[]) => Command } {
    const program = new Command();
    program.exitOverride();
    program.option("--format <type>", "global format");
    program.option("--yes", "global yes");

    let captured: Command | undefined;
    const sub = program
      .command("widget <name>")
      .option("--format <type>", "local format", "plain")
      .option("--yes", "local yes")
      .action((_name: string, _options, command: Command) => {
        captured = command;
      });
    sub.exitOverride();

    return {
      program,
      run: (argv: string[]) => {
        program.parse(["node", "x", ...argv]);
        if (!captured) throw new Error("action was not invoked");
        return captured;
      },
    };
  }

  it("prefers a user-typed global value over the subcommand's own untouched local default", () => {
    const { run } = buildProgram();
    const command = run(["widget", "thing", "--format", "json"]);

    // Sanity check on the bug itself: the subcommand's own opts() still
    // holds its local default, never the user's value.
    expect(command.opts().format).toBe("plain");
    expect(command.getOptionValueSource("format")).toBe("default");

    const merged = mergeGlobalOptions(command.opts(), command);
    expect(merged.format).toBe("json");
  });

  it("prefers a user-typed global --yes over the subcommand's own unset local --yes", () => {
    const { run } = buildProgram();
    const command = run(["widget", "thing", "--yes"]);

    expect(command.opts().yes).toBeUndefined();

    const merged = mergeGlobalOptions(command.opts(), command);
    expect(merged.yes).toBe(true);
  });

  it("still lets the subcommand's own explicitly-typed value win when nothing global was set", () => {
    const { run } = buildProgram();
    // Command line has no --format at all; only the subcommand's default
    // applies. This must still resolve to the (correct) default, not blank
    // out to undefined.
    const command = run(["widget", "thing"]);

    const merged = mergeGlobalOptions(command.opts(), command);
    expect(merged.format).toBe("plain");
  });

  it("never lets an undefined local key blank out a value present in globals", () => {
    // Simulate a caller passing a plain options object (not derived from a
    // live Command) that happens to carry an explicit `undefined` for a key
    // globals actually has a value for.
    const merged = mergeGlobalOptions({ format: undefined, primary: "#0033FE" });
    expect(merged).toEqual({ primary: "#0033FE" });
  });
});
