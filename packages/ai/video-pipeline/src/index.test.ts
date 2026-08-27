import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDemoBrandContext } from "@nebutra/generation-context";
import { afterEach, describe, expect, it } from "vitest";
import { VideoPipeline } from "./index";

let root: string | undefined;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
  root = undefined;
});

describe("VideoPipeline", () => {
  it("requires storyboard before render", async () => {
    root = await mkdtemp(join(tmpdir(), "video-pipeline-"));
    const pipeline = new VideoPipeline({ root });
    const brand = createDemoBrandContext();
    const storyboard = await pipeline.plan(
      { type: "brand-film", durationS: 20, theme: "launch" },
      brand,
    );
    expect(storyboard.scenes.length).toBeGreaterThan(1);
    const asset = await pipeline.render(storyboard, brand);
    expect(await readFile(asset.path, "utf8")).toContain(storyboard.id);
  });

  it("requires BrandContext", async () => {
    await expect(
      new VideoPipeline().plan({ type: "clip", durationS: 4, prompt: "ship" }, undefined),
    ).rejects.toMatchObject({ capability: "video-pipeline" });
  });
});
