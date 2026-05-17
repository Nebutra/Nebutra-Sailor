import { describe, expect, it } from "vitest";
import { selectBestFrame } from "../best-frame";
import { buildCameraTree, resolveContinuityChain } from "../camera-tree";
import { runFilmPipeline } from "../director";
import { CinemaError } from "../errors";
import { compressNovel, extractScenes } from "../novel-segment";

const cams = [
  { id: "c0", shotIds: ["s0", "s1"] },
  { id: "c1", shotIds: ["s2"] },
  { id: "c2", shotIds: ["s3"] },
];

describe("buildCameraTree", () => {
  it("builds an acyclic tree with the first camera as root", async () => {
    const tree = await buildCameraTree(cams, async () => [
      { cameraId: "c0", parentCameraId: null, parentShotId: null, fullyCovers: true },
      { cameraId: "c1", parentCameraId: "c0", parentShotId: "s0", fullyCovers: true },
      { cameraId: "c2", parentCameraId: "c1", parentShotId: "s2", fullyCovers: false },
    ]);
    expect(tree.rootId).toBe("c0");
    expect(tree.parentOf("c1")).toBe("c0");
  });

  it("rejects a cyclic parent assignment (graph-model guard)", async () => {
    await expect(
      buildCameraTree(cams, async () => [
        { cameraId: "c0", parentCameraId: "c2", parentShotId: "s3", fullyCovers: true },
        { cameraId: "c1", parentCameraId: "c0", parentShotId: "s0", fullyCovers: true },
        { cameraId: "c2", parentCameraId: "c1", parentShotId: "s2", fullyCovers: true },
      ]),
    ).rejects.toBeInstanceOf(CinemaError);
  });

  it("rejects when the first camera is not a root", async () => {
    await expect(
      buildCameraTree(cams, async () => [
        { cameraId: "c0", parentCameraId: "c1", parentShotId: "s2", fullyCovers: true },
        { cameraId: "c1", parentCameraId: null, parentShotId: null, fullyCovers: true },
        { cameraId: "c2", parentCameraId: "c1", parentShotId: "s2", fullyCovers: true },
      ]),
    ).rejects.toThrow(/root/i);
  });

  it("resolveContinuityChain returns the root→node inheritance order", async () => {
    const tree = await buildCameraTree(cams, async () => [
      { cameraId: "c0", parentCameraId: null, parentShotId: null, fullyCovers: true },
      { cameraId: "c1", parentCameraId: "c0", parentShotId: "s0", fullyCovers: true },
      { cameraId: "c2", parentCameraId: "c1", parentShotId: "s2", fullyCovers: true },
    ]);
    expect(resolveContinuityChain(tree, "c2")).toEqual(["c0", "c1", "c2"]);
    expect(resolveContinuityChain(tree, "c0")).toEqual(["c0"]);
  });
});

describe("selectBestFrame", () => {
  const cands = [
    { id: "a", uri: "data:a" },
    { id: "b", uri: "data:b" },
  ];
  it("returns the ranked best and its reason", async () => {
    const r = await selectBestFrame(cands, "Alice on the left", async () => ({
      bestId: "b",
      reason: "best character consistency",
    }));
    expect(r.best.id).toBe("b");
    expect(r.reason).toMatch(/consistency/);
  });
  it("throws CinemaError on empty candidates", async () => {
    await expect(
      selectBestFrame([], "x", async () => ({ bestId: "", reason: "" })),
    ).rejects.toBeInstanceOf(CinemaError);
  });
  it("throws when the ranker picks an unknown id", async () => {
    await expect(
      selectBestFrame(cands, "x", async () => ({ bestId: "zzz", reason: "" })),
    ).rejects.toThrow(/not among/i);
  });
});

describe("novel segmentation", () => {
  it("compressNovel preserves chunk order", async () => {
    const out = await compressNovel(["AAA", "BBB"], async (p) => `c:${p.slice(-3)}`);
    expect(out).toEqual(["c:AAA", "c:BBB"]);
  });
  it("extractScenes parses a JSON array, tolerating prose wrapping", async () => {
    const scenes = await extractScenes("novel", async () => 'noise ["scene 1","scene 2"] tail');
    expect(scenes).toEqual(["scene 1", "scene 2"]);
  });
  it("extractScenes throws CinemaError on unparseable output", async () => {
    await expect(extractScenes("x", async () => "no array here")).rejects.toBeInstanceOf(
      CinemaError,
    );
  });
});

describe("runFilmPipeline", () => {
  it("threads idea→script→shots→cameras→frames in order and returns the assembly", async () => {
    const calls: string[] = [];
    const result = await runFilmPipeline(
      { idea: "a dog learns to fly" },
      {
        writeScript: async (idea) => {
          calls.push("script");
          return `SCRIPT(${idea})`;
        },
        splitShots: async (script) => {
          calls.push("shots");
          return [`${script}#0`, `${script}#1`];
        },
        buildCameras: async (shots) => {
          calls.push("cameras");
          return shots.map((_, i) => ({ id: `c${i}`, shotIds: [`s${i}`] }));
        },
        inferParents: async (cameras) =>
          cameras.map((c, i) => ({
            cameraId: c.id,
            parentCameraId: i === 0 ? null : `c${i - 1}`,
            parentShotId: i === 0 ? null : `s${i - 1}`,
            fullyCovers: true,
          })),
        renderShot: async (shot) => {
          calls.push(`render:${shot}`);
          return { uri: `mp4:${shot}` };
        },
      },
    );
    expect(calls).toEqual([
      "script",
      "shots",
      "cameras",
      "render:SCRIPT(a dog learns to fly)#0",
      "render:SCRIPT(a dog learns to fly)#1",
    ]);
    expect(result.clips.map((c) => c.uri)).toEqual([
      "mp4:SCRIPT(a dog learns to fly)#0",
      "mp4:SCRIPT(a dog learns to fly)#1",
    ]);
    expect(result.cameraTree.rootId).toBe("c0");
  });
});
