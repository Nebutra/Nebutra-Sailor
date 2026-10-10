import { describe, expect, it } from "vitest";
import { shouldArm } from "./use-reveal";

describe("scroll reveal arming", () => {
  it("arms a group that is still below the fold", () => {
    expect(shouldArm(1200, 900, false)).toBe(true);
  });

  it("never hides what is already on screen or above it", () => {
    expect(shouldArm(400, 900, false)).toBe(false);
    expect(shouldArm(900, 900, false)).toBe(false);
    expect(shouldArm(-300, 900, false)).toBe(false);
  });

  it("never arms under reduced motion", () => {
    expect(shouldArm(5000, 900, true)).toBe(false);
  });
});
