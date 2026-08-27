import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDemoBrandContext } from "@nebutra/generation-context";
import { afterEach, describe, expect, it } from "vitest";
import { MeshPipeline, readMeshDebug } from "./index";

let root: string | undefined;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
  root = undefined;
});

describe("MeshPipeline", () => {
  it("requires BrandContext", async () => {
    await expect(new MeshPipeline().fromText("robot", undefined)).rejects.toMatchObject({
      capability: "3d-pipeline",
    });
  });

  it("writes a glTF asset and preview", async () => {
    root = await mkdtemp(join(tmpdir(), "mesh-pipeline-"));
    const asset = await new MeshPipeline({ root }).fromText(
      "robot mascot",
      createDemoBrandContext(),
    );
    expect(JSON.parse(await readFile(asset.gltfPath, "utf8")).asset.version).toBe("2.0");
    expect(await readFile(asset.previewImagePath, "utf8")).toContain("<svg");
    expect(await readMeshDebug(root)).toHaveLength(1);
  });
});
