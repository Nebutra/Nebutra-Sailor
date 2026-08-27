import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDemoBrandContext } from "@nebutra/generation-context";
import { afterEach, describe, expect, it } from "vitest";
import { readVoiceDebug, VoiceRealtime } from "./index";

let root: string | undefined;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
  root = undefined;
});

describe("VoiceRealtime", () => {
  it("starts a thread-bound voice session without importing the runtime", async () => {
    const session = await new VoiceRealtime().startSession({
      tenantId: "tenant_a",
      threadId: "thread_1",
    });
    expect(session.state).toBe("listening");
  });

  it("synthesizes narration with BrandContext", async () => {
    root = await mkdtemp(join(tmpdir(), "voice-realtime-"));
    const asset = await new VoiceRealtime({ root }).synthesizeNarration(
      { script: "Ship the story with the founder voice.", targetDurationS: 2 },
      createDemoBrandContext(),
    );
    expect((await readFile(asset.path)).subarray(0, 4).toString()).toBe("RIFF");
    expect(await readVoiceDebug(root)).toHaveLength(1);
  });
});
