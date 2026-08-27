import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDemoBrandContext } from "@nebutra/generation-context";
import { afterEach, describe, expect, it } from "vitest";
import { AudioPipeline, readAudioDebug } from "./index";

let root: string | undefined;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
  root = undefined;
});

describe("AudioPipeline", () => {
  it("requires BrandContext", async () => {
    await expect(
      new AudioPipeline().generate({ type: "sfx", description: "click" }, undefined, true),
    ).rejects.toMatchObject({ capability: "audio-pipeline" });
  });

  it("writes a valid WAV header with commercial metadata", async () => {
    root = await mkdtemp(join(tmpdir(), "audio-pipeline-"));
    const asset = await new AudioPipeline({ root }).generate(
      { type: "bgm", durationS: 4, mood: "calm technical" },
      createDemoBrandContext(),
      true,
    );
    expect((await readFile(asset.path)).subarray(0, 4).toString()).toBe("RIFF");
    expect(asset.license.status).toBe("commercial-ok");
    expect(await readAudioDebug(root)).toHaveLength(1);
  });
});
