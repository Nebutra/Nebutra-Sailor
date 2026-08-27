import { describe, expect, it } from "vitest";
import { compileStartupProject } from "../../startup-os/compiler";
import { deriveCofounderProfileInput } from "../profile";

describe("deriveCofounderProfileInput", () => {
  it("derives arena and a non-empty headline from a real compiled company", () => {
    const project = compileStartupProject({
      thesis: "An AI copilot that turns founder theses into shippable companies",
      arena: "AI SaaS",
      now: "2026-06-05T00:00:00.000Z",
    });

    const input = deriveCofounderProfileInput(project);

    expect(input.arena).toBe("AI SaaS");
    expect(input.headline.length).toBeGreaterThan(0);
    expect(input.headline.length).toBeLessThanOrEqual(280);
  });

  it("never fabricates an archetype at opt-in time", () => {
    const project = compileStartupProject({
      thesis: "Developer tooling for reproducible local environments",
      arena: "Developer infrastructure",
      now: "2026-06-05T00:00:00.000Z",
    });

    expect(deriveCofounderProfileInput(project).archetype).toBeUndefined();
  });
});
