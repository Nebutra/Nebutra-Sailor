import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDemoBrandContext } from "@nebutra/generation-context";
import { afterEach, describe, expect, it } from "vitest";
import { ImagePipeline, readImageDebug } from "./index";

let root: string | undefined;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
  root = undefined;
});

describe("ImagePipeline", () => {
  it("requires BrandContext", async () => {
    const pipeline = new ImagePipeline();
    await expect(
      pipeline.generate({ type: "icon", subject: "debugger" }, undefined),
    ).rejects.toMatchObject({ capability: "image-pipeline", suggestion: expect.any(String) });
  });

  it("writes a deterministic SVG asset with brand metadata", async () => {
    root = await mkdtemp(join(tmpdir(), "image-pipeline-"));
    const asset = await new ImagePipeline({ root }).generate(
      { type: "logo", company: "Loop", oneLiner: "AI debugging" },
      createDemoBrandContext(),
    );
    expect(asset.format).toBe("svg");
    expect(await readFile(asset.path, "utf8")).toContain("Loop");
    expect(await readImageDebug(root)).toHaveLength(1);
  });
});
