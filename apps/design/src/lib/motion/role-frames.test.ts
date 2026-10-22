import { describe, expect, it } from "vitest";
import { parseMs, ROLE_FRAME_IDS, roleFrames, roleTransition } from "./role-frames";

const allFrames = (reduced: boolean) =>
  ROLE_FRAME_IDS.flatMap((id) => {
    const frames = roleFrames(id, reduced);
    return [
      frames.subject.rest,
      frames.subject.active,
      frames.partner?.rest,
      frames.partner?.active,
    ];
  }).filter((frame) => frame !== undefined);

describe("roleFrames", () => {
  it("covers the five roles the tokens define", () => {
    expect(ROLE_FRAME_IDS).toEqual(["enter", "exit", "swap", "shared", "press"]);
  });

  it("never moves anything in the reduced variant", () => {
    for (const frame of allFrames(true)) {
      expect(frame.transform).toBeUndefined();
    }
    for (const id of ROLE_FRAME_IDS) {
      expect(roleFrames(id, true).property).toBe("opacity");
    }
  });

  it("moves things in the full variant, for every role", () => {
    for (const id of ROLE_FRAME_IDS) {
      const { subject, partner } = roleFrames(id, false);
      const moved = [subject.rest, subject.active, partner?.rest, partner?.active].some(
        (frame) => frame?.transform !== undefined && frame.transform !== "none",
      );
      expect(moved, `${id} should translate or scale`).toBe(true);
    }
  });

  it("takes every distance and scale from a token, never a literal", () => {
    for (const frame of allFrames(false)) {
      const transform = String(frame.transform ?? "");
      expect(transform).not.toMatch(/\d+(\.\d+)?(px|rem|em)\b/);
      expect(transform).not.toMatch(/scale\(\s*\d/);
    }
  });

  it("starts an entrance hidden and a departure visible", () => {
    expect(roleFrames("enter", false).subject.rest.opacity).toBe(0);
    expect(roleFrames("enter", false).subject.active.opacity).toBe(1);
    expect(roleFrames("exit", false).subject.rest.opacity).toBe(1);
    expect(roleFrames("exit", false).subject.active.opacity).toBe(0);
  });

  it("crossfades a swap: what leaves is what the incoming one replaces", () => {
    const { subject, partner } = roleFrames("swap", false);
    expect(subject.rest.opacity).toBe(1);
    expect(subject.active.opacity).toBe(0);
    expect(partner?.rest.opacity).toBe(0);
    expect(partner?.active.opacity).toBe(1);
  });

  it("hands a shared element over as a crossfade when motion is reduced", () => {
    const { subject, partner } = roleFrames("shared", true);
    expect(subject.rest.opacity).toBe(1);
    expect(subject.active.opacity).toBe(0);
    expect(partner?.active.opacity).toBe(1);
  });
});

describe("roleTransition", () => {
  it("is built from the role's duration and easing tokens, scaled by --slow", () => {
    const css = roleTransition("enter", "opacity, transform");
    expect(css).toBe(
      "opacity calc(var(--motion-enter-duration) * var(--slow)) var(--motion-enter-easing), " +
        "transform calc(var(--motion-enter-duration) * var(--slow)) var(--motion-enter-easing)",
    );
  });

  it("contains no literal time", () => {
    for (const id of ROLE_FRAME_IDS) {
      expect(roleTransition(id, "opacity")).not.toMatch(/\d+m?s\b/);
    }
  });
});

describe("parseMs", () => {
  it("reads ms and s durations", () => {
    expect(parseMs("300ms")).toBe(300);
    expect(parseMs("0.5s")).toBe(500);
  });

  it("returns 0 for anything that is not a time, instead of NaN", () => {
    expect(parseMs("linear(0, 1)")).toBe(0);
    expect(parseMs("")).toBe(0);
  });
});
