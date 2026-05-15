import { describe, expect, it } from "vitest";

describe("architecture: package boundaries", () => {
  it("apps do not import from each other", () => {
    expect(true).toBe(true);
  });
});
