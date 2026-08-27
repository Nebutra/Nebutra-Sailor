import { describe, expect, it } from "vitest";
import { composeTimeline, getVideoCompose, MockCompositor, VideoComposeError } from "../index";

const clips = [
  { uri: "mp4:a", durationSec: 4 },
  { uri: "mp4:b", durationSec: 6 },
  { uri: "mp4:c", durationSec: 2 },
];

describe("composeTimeline", () => {
  it("concatenates: cumulative starts, total = sum", () => {
    const t = composeTimeline(clips);
    expect(t.totalDurationSec).toBe(12);
    expect(t.segments.map((s) => s.startSec)).toEqual([0, 4, 10]);
    expect(t.segments.map((s) => s.uri)).toEqual(["mp4:a", "mp4:b", "mp4:c"]);
  });

  it("crossfade overlaps each next clip, shortening the total", () => {
    const t = composeTimeline(clips, { crossfadeSec: 1 });
    // total = 12 - 1*(3-1) = 10; starts overlap by the crossfade
    expect(t.totalDurationSec).toBe(10);
    expect(t.segments.map((s) => s.startSec)).toEqual([0, 3, 8]);
    expect(t.segments[1]?.transitionInSec).toBe(1);
    expect(t.segments[0]?.transitionInSec ?? 0).toBe(0);
  });

  it("starts are strictly monotonic", () => {
    const t = composeTimeline(clips, { crossfadeSec: 1.5 });
    for (let i = 1; i < t.segments.length; i++) {
      expect(t.segments[i]!.startSec).toBeGreaterThan(t.segments[i - 1]!.startSec);
    }
  });

  it("rejects empty clip list", () => {
    expect(() => composeTimeline([])).toThrow(VideoComposeError);
  });

  it("rejects a crossfade not shorter than the shortest clip", () => {
    expect(() => composeTimeline(clips, { crossfadeSec: 2 })).toThrow(/crossfade/i);
  });
});

describe("MockCompositor", () => {
  it("renders a deterministic descriptor whose duration matches the timeline", async () => {
    const t = composeTimeline(clips);
    const c = new MockCompositor();
    const a = await c.render(t);
    const b = await c.render(t);
    expect(a).toEqual(b);
    expect(a.durationSec).toBe(12);
    expect(a.uri.startsWith("data:video/")).toBe(true);
  });
  it("health() ok", async () => {
    expect((await new MockCompositor().health()).ok).toBe(true);
  });
});

describe("getVideoCompose", () => {
  it("zero-config → working mock compositor", async () => {
    const vc = await getVideoCompose();
    const out = await vc.render(composeTimeline(clips));
    expect(out.uri.startsWith("data:video/")).toBe(true);
  });
  it("ffmpeg provider is a fail-loud stub until landed", async () => {
    await expect(getVideoCompose({ provider: "ffmpeg" })).rejects.toBeInstanceOf(VideoComposeError);
  });
});
