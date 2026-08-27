import { describe, expect, it } from "vitest";
import { brandEasing } from "../motion";

describe("brand motion easing", () => {
  it("exits with ease-out, never ease-in", () => {
    expect(brandEasing.exit).toEqual(brandEasing.brand);
    expect(brandEasing.exit).not.toEqual([0.4, 0, 1, 1]);
  });
});
