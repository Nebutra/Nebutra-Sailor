/**
 * Storyboard: shot-id numeric tolerance, result-routing scheme, output-history
 * ring, robust JSON-array parse, and the injected-completion split flow.
 */

import { describe, expect, it } from "vitest";
import {
  buildShotSourceId,
  getSplitPrompt,
  isSameShotId,
  MAX_STORYBOARD_OUTPUT_HISTORY,
  parseJsonArrayFromText,
  parseShotSourceId,
  pushOutputHistory,
  type Shot,
  splitScriptIntoShots,
} from "../index";

describe("shot identity", () => {
  it("is strict, with numeric tolerance only when both ids are numeric", () => {
    expect(isSameShotId("3", "3")).toBe(true);
    expect(isSameShotId("3", "3.0")).toBe(true);
    expect(isSameShotId("3", "03")).toBe(true);
    expect(isSameShotId("shot-a", "shot-b")).toBe(false);
    expect(isSameShotId("3", "shot-3")).toBe(false);
    expect(isSameShotId("", "")).toBe(false);
  });
});

describe("result routing scheme", () => {
  it("round-trips storyboard[-img]-{node}-shot-{shot}", () => {
    const id = buildShotSourceId("nodeX", "7", true);
    expect(id).toBe("storyboard-img-nodeX-shot-7");
    expect(parseShotSourceId(id)).toEqual({
      nodeId: "nodeX",
      shotId: "7",
      imageMode: true,
    });
    expect(parseShotSourceId("storyboard-n1-shot-2")).toEqual({
      nodeId: "n1",
      shotId: "2",
      imageMode: false,
    });
    expect(parseShotSourceId("not-a-storyboard-id")).toBeNull();
  });
});

describe("output-history ring", () => {
  it("caps at MAX and parks the cursor at newest", () => {
    let shot: Shot = {
      id: "s",
      sceneIndex: 1,
      prompt: "",
      description: "",
      status: "draft",
      outputEnabled: false,
      selectedImageIndex: -1,
      outputHistory: [],
      outputHistoryCursor: -1,
      referenceImages: [],
    };
    for (let i = 0; i < MAX_STORYBOARD_OUTPUT_HISTORY + 5; i++) {
      shot = pushOutputHistory(shot, `url-${i}`);
    }
    expect(shot.outputHistory).toHaveLength(MAX_STORYBOARD_OUTPUT_HISTORY);
    expect(shot.outputHistory.at(-1)).toBe("url-24");
    expect(shot.outputHistoryCursor).toBe(MAX_STORYBOARD_OUTPUT_HISTORY - 1);
  });
});

describe("parseJsonArrayFromText", () => {
  it("extracts an array through code fences and prose", () => {
    expect(parseJsonArrayFromText('here:\n```json\n[{"prompt":"a"}]\n``` done')).toEqual([
      { prompt: "a" },
    ]);
    expect(parseJsonArrayFromText("no json here")).toEqual([]);
  });
});

describe("splitScriptIntoShots", () => {
  it("splits via injected completion and applies defaults", async () => {
    const complete = async (system: string, _user: string) => {
      expect(system).toBe(getSplitPrompt("script"));
      return '[{"prompt":"wide shot of a city"},{"prompt":"close on a face"}]';
    };
    const shots = await splitScriptIntoShots("INT. CITY - DAY", complete, {
      defaults: { model: "mock-image-1", ratio: "16:9" },
    });
    expect(shots).toHaveLength(2);
    expect(shots[0]?.sceneIndex).toBe(1);
    expect(shots[0]?.model).toBe("mock-image-1");
    expect(shots[1]?.prompt).toBe("close on a face");
  });

  it("respects scene_index from table-summary mode", async () => {
    const complete = async () =>
      '[{"scene_index":5,"prompt":"P5"},{"scene_index":6,"prompt":"P6"}]';
    const shots = await splitScriptIntoShots("table", complete, {
      mode: "table-summary",
    });
    expect(shots[0]?.sceneIndex).toBe(5);
    expect(shots[1]?.sceneIndex).toBe(6);
  });

  it("throws on empty script and on unparseable output", async () => {
    await expect(splitScriptIntoShots("  ", async () => "[]")).rejects.toThrow("empty");
    await expect(splitScriptIntoShots("x", async () => "garbage")).rejects.toThrow(
      "no usable shots",
    );
  });
});
