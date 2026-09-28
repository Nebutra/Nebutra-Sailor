import { describe, expect, it } from "vitest";
import { AUTO_MODEL, featuredModel, modelInfo, modelsFor, reconcileModel } from "./models";

describe("model registry accessor", () => {
  it("lists Auto first in every mode", () => {
    for (const mode of ["image", "video", "text", "audio"] as const) {
      expect(modelsFor(mode)[0]?.id).toBe(AUTO_MODEL);
    }
  });

  it("carries the planned roster but only holds live models", () => {
    const planned = modelsFor("video").filter((m) => !m.live);
    expect(planned.length).toBeGreaterThan(0);
    for (const m of planned) expect(reconcileModel("video", m.id)).toBe(AUTO_MODEL);
    expect(reconcileModel("video", "wan-2.7")).toBe("wan-2.7");
    expect(reconcileModel("image", "wan-2.7")).toBe(AUTO_MODEL);
  });

  it("gives video models their durations and resolutions", () => {
    const wan = modelInfo("video", "wan-2.7");
    expect(wan.durations?.length).toBeGreaterThan(0);
    expect(wan.resolutions?.length).toBeGreaterThan(0);
    expect(modelInfo("video", "nope").id).toBe(AUTO_MODEL);
  });

  it("features a live named model on the starter cards", () => {
    expect(featuredModel("video")?.live).toBe(true);
    expect(featuredModel("text")).toBeUndefined();
  });
});
