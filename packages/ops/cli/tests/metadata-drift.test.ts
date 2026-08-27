import { describe, expect, it } from "vitest";
import { nebultraCommand } from "../src/commands/metadata.js";
import { buildProgram } from "../src/program.js";

describe("CLI metadata drift", () => {
  it("keeps schema metadata aligned with the real Commander program", () => {
    const program = buildProgram({ version: "0.0.0-test", isInteractive: false });
    const registeredCommands = program.commands.map((command) => command.name());
    const metadataCommands = (nebultraCommand.subcommands ?? []).map((command) => command.name);

    expect(metadataCommands).toEqual(registeredCommands);
  });
});
