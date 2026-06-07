import { describe, expect, it } from "vitest";
import { generateField } from "../generate";
import { createEmptyContext } from "../repository";

const NOW = "2026-06-05T00:00:00.000Z";

describe("generateField", () => {
  it("returns null with no injected model (keyless)", async () => {
    const ctx = createEmptyContext("p", "pre_seed", NOW);
    expect(await generateField({ context: ctx, layerId: "L1", fieldKey: "mission" })).toBeNull();
  });

  it("fills a line field from the injected model (trimmed)", async () => {
    const ctx = createEmptyContext("p", "pre_seed", NOW);
    const value = await generateField({
      context: ctx,
      layerId: "L1",
      fieldKey: "mission",
      invokeModel: async () => "  Make founders unstoppable.  ",
    });
    expect(value).toBe("Make founders unstoppable.");
  });

  it("parses a list field's JSON and strips a code fence", async () => {
    const ctx = createEmptyContext("p", "pre_seed", NOW);
    const value = await generateField({
      context: ctx,
      layerId: "L3",
      fieldKey: "values",
      invokeModel: async () => '```json\n["clarity","speed"]\n```',
    });
    expect(value).toEqual(["clarity", "speed"]);
  });

  it("returns null when the model yields an empty string", async () => {
    const ctx = createEmptyContext("p", "pre_seed", NOW);
    expect(
      await generateField({
        context: ctx,
        layerId: "L1",
        fieldKey: "why",
        invokeModel: async () => "   ",
      }),
    ).toBeNull();
  });
});
