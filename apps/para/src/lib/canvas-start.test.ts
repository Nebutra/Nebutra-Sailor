import { describe, expect, it } from "vitest";
import { startHref, startKey } from "./canvas-start";

describe("startHref — the query-param contract with the canvas", () => {
  it("opens a blank or agent start without params", () => {
    expect(startHref("p1", "w1", "blank")).toBe("/p/p1/w/w1");
    expect(startHref("p1", "w1", "agent", { prompt: "一只猫" })).toBe("/p/p1/w/w1");
  });

  it("seeds a generator node by mode", () => {
    expect(startHref("p1", "w1", "image")).toBe("/p/p1/w/w1?seed=image");
    expect(startHref("p1", "w1", "blank", { seed: "text" })).toBe("/p/p1/w/w1?seed=text");
  });

  it("appends the template, alone or after a seed", () => {
    expect(startHref("p1", "w1", "blank", { template: "text-to-video" })).toBe(
      "/p/p1/w/w1?template=text-to-video",
    );
    expect(startHref("p1", "w1", "blank", { seed: "image", template: "character-sheet" })).toBe(
      "/p/p1/w/w1?seed=image&template=character-sheet",
    );
  });

  it("keys a busy entry by template, then seed, then start", () => {
    expect(startKey("blank", { template: "story-script" })).toBe("story-script");
    expect(startKey("blank", { seed: "image" })).toBe("image");
    expect(startKey("agent")).toBe("agent");
  });
});
