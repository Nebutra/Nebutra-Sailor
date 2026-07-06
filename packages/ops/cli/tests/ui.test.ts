import { describe, expect, it } from "vitest";
import { runCli } from "./helpers.js";

describe("ui command", () => {
  it("searches the generated UI agent contract as JSON", async () => {
    const result = await runCli(["ui", "search", "button", "--format", "json", "--limit", "3"]);

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.items[0].name).toBe("button");
    expect(parsed.total).toBeGreaterThanOrEqual(1);
  });

  it("prints one component contract", async () => {
    const result = await runCli(["ui", "component", "button", "--format", "json"]);

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.name).toBe("button");
    expect(parsed.imports.package).toBe("@nebutra/ui/primitives");
    expect(parsed.evidence.docs).toBe(true);
  });

  it("validates production evidence for a canonical component", async () => {
    const result = await runCli(["ui", "validate", "button", "--format", "json"]);

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed).toMatchObject({ name: "button", valid: true });
  });

  it("returns migration hints as a dry-run plan", async () => {
    const result = await runCli(["ui", "migrate", "button", "--format", "json"]);

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.component).toBe("button");
    expect(parsed.dryRun).toBe(true);
    expect(parsed.hints.length).toBeGreaterThan(0);
  });
});
