import { describe, expect, it } from "vitest";
import { canvasHref, parseSeed, seedNode } from "./seed";

describe("parseSeed", () => {
  it("accepts the modes the origin can generate", () => {
    expect(parseSeed("image")).toBe("image");
    expect(parseSeed("text")).toBe("text");
  });

  it("rejects modes with no backend and anything else", () => {
    expect(parseSeed("video")).toBeNull();
    expect(parseSeed("audio")).toBeNull();
    expect(parseSeed("IMAGE")).toBeNull();
    expect(parseSeed("")).toBeNull();
    expect(parseSeed(null)).toBeNull();
    expect(parseSeed(undefined)).toBeNull();
  });
});

describe("seedNode", () => {
  it("makes an empty image generator centred on the view", () => {
    const n = seedNode("image", "n1", { x: 0, y: 0, zoom: 1 }, { width: 1000, height: 600 });
    expect(n).toMatchObject({
      id: "n1",
      type: "image",
      status: "empty",
      createdBy: "user",
      generator: { mode: "image", model: "Auto", count: 1 },
    });
    expect(n.x + n.width / 2).toBe(500);
    expect(n.y + n.height / 2).toBe(300);
  });

  it("makes an empty text node for the script tile", () => {
    const n = seedNode("text", "n2", { x: 0, y: 0, zoom: 1 });
    expect(n.type).toBe("text");
    expect(n.type === "text" && n.text).toBe("");
    expect(n.generator?.mode).toBe("text");
  });

  it("accounts for pan and zoom", () => {
    const n = seedNode("image", "n3", { x: -200, y: 100, zoom: 2 }, { width: 1000, height: 600 });
    // screen centre (500,300) → flow ((500+200)/2, (300-100)/2) = (350,100)
    expect(n.x + n.width / 2).toBe(350);
    expect(n.y + n.height / 2).toBe(100);
  });
});

describe("canvasHref", () => {
  it("adds the seed only when there is one", () => {
    expect(canvasHref("p", "w")).toBe("/p/p/w/w");
    expect(canvasHref("p", "w", null)).toBe("/p/p/w/w");
    expect(canvasHref("p", "w", "image")).toBe("/p/p/w/w?seed=image");
  });
});
