import { afterEach, describe, expect, it } from "vitest";
import { getTts, MockTtsProvider, resolveTtsProvider, TtsError } from "../index";

const SAVED = { ...process.env };
afterEach(() => {
  process.env = { ...SAVED };
});

describe("MockTtsProvider", () => {
  it("is deterministic: same text → same uri + duration", async () => {
    const p = new MockTtsProvider();
    const a = await p.synthesize({ text: "hello world", tenantId: "t1" });
    const b = await p.synthesize({ text: "hello world", tenantId: "t1" });
    expect(a).toEqual(b);
    expect(a.uri.startsWith("data:audio/")).toBe(true);
    expect(a.durationSec).toBeGreaterThan(0);
  });

  it("longer text → longer estimated duration", async () => {
    const p = new MockTtsProvider();
    const short = await p.synthesize({ text: "hi", tenantId: "t1" });
    const long = await p.synthesize({ text: "hi ".repeat(200), tenantId: "t1" });
    expect(long.durationSec).toBeGreaterThan(short.durationSec);
  });

  it("rejects empty text with a TtsError carrying a suggestion", async () => {
    const p = new MockTtsProvider();
    await expect(p.synthesize({ text: "   ", tenantId: "t1" })).rejects.toBeInstanceOf(TtsError);
    try {
      await p.synthesize({ text: "", tenantId: "t1" });
    } catch (e) {
      expect((e as TtsError).suggestion.length).toBeGreaterThan(0);
      expect((e as TtsError).code).toBe("TTS_EMPTY_TEXT");
    }
  });

  it("health() reports ok", async () => {
    expect((await new MockTtsProvider().health()).ok).toBe(true);
  });
});

describe("resolveTtsProvider", () => {
  it("falls back to mock with no env", () => {
    expect(resolveTtsProvider()).toBe("mock");
  });
  it("detects elevenlabs then openai by env", () => {
    process.env.OPENAI_API_KEY = "x";
    expect(resolveTtsProvider()).toBe("openai");
    process.env.ELEVENLABS_API_KEY = "y";
    expect(resolveTtsProvider()).toBe("elevenlabs");
  });
  it("explicit TTS_PROVIDER wins", () => {
    process.env.ELEVENLABS_API_KEY = "y";
    process.env.TTS_PROVIDER = "mock";
    expect(resolveTtsProvider()).toBe("mock");
  });
});

describe("getTts", () => {
  it("zero-config returns a working mock provider", async () => {
    const tts = await getTts();
    const out = await tts.synthesize({ text: "narration line", tenantId: "org_1" });
    expect(out.uri.startsWith("data:audio/")).toBe(true);
  });
  it("throws TtsError for an unimplemented real provider (stub, fail-loud)", async () => {
    await expect(getTts({ provider: "elevenlabs" })).rejects.toBeInstanceOf(TtsError);
  });
});
