import { describe, expect, it } from "vitest";
import { createDesignSync } from "../factory";

describe("factory.createDesignSync — design-md stub", () => {
  it("rejects with a not-yet-implemented message when provider is 'design-md'", async () => {
    await expect(createDesignSync({ provider: "design-md" })).rejects.toThrow(
      "[design-sync] design-md provider is not yet implemented.",
    );
  });

  it("not-yet-implemented message names the usable providers", async () => {
    await expect(createDesignSync({ provider: "design-md" })).rejects.toThrow(
      "Set DESIGN_SYNC_PROVIDER to 'figma', 'penpot', 'git-only', or 'memory'.",
    );
  });
});
