import { describe, expect, it } from "vitest";
import { nearestAspect } from "./uploads";

describe("upload framing", () => {
  it("frames an upload by its nearest supported aspect", () => {
    expect(nearestAspect(1920, 1080)).toBe("16:9");
    expect(nearestAspect(1024, 1024)).toBe("1:1");
    expect(nearestAspect(1200, 900)).toBe("4:3");
    expect(nearestAspect(1080, 1920)).toBe("9:16");
    expect(nearestAspect(956, 1280)).toBe("3:4");
    expect(nearestAspect(0, 0)).toBe("16:9");
  });
});
