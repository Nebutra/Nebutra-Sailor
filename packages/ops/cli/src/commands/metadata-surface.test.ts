import { describe, expect, it } from "vitest";
import { buildProgram } from "../program";
import { nebultraCommand } from "./metadata";

/**
 * Drift guard (#CLI-governance): `metadata.ts` is the hand-maintained surface
 * that `nebutra schema` exposes to Agents. It MUST stay in lock-step with the
 * commands actually registered in `program.ts`. This test builds the real
 * commander program and compares its top-level command set against the
 * metadata, failing loudly on either direction of drift:
 *   - a metadata entry with no registered command (e.g. the old phantom `preset`)
 *   - a registered command absent from metadata (e.g. `backend`, `e2e`, `theme`)
 */
describe("nebutra CLI surface ↔ metadata drift guard", () => {
  const program = buildProgram("0.0.0-test", false);
  const registered = program.commands
    // commander marks hidden commands; they are intentionally undocumented.
    .filter((c) => !(c as unknown as { _hidden?: boolean })._hidden)
    .map((c) => c.name());
  const registeredSet = new Set(registered);
  const metaNames = (nebultraCommand.subcommands ?? []).map((s) => s.name);
  const metaSet = new Set(metaNames);

  it("advertises no command that is not actually registered (no phantom)", () => {
    const phantom = metaNames.filter((n) => !registeredSet.has(n));
    expect(
      phantom,
      `metadata.ts lists commands not registered in program.ts: ${phantom.join(", ")}`,
    ).toEqual([]);
  });

  it("documents every registered top-level command (no under-report)", () => {
    const missing = registered.filter((n) => !metaSet.has(n));
    expect(
      missing,
      `registered commands missing from metadata.ts nebultraCommand.subcommands: ${missing.join(", ")}`,
    ).toEqual([]);
  });
});
