import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { defaultTokensDir } from "../io";

describe("design-sync token source paths", () => {
  it("defaults to the current DTCG token source directory", () => {
    expect(defaultTokensDir("/repo")).toBe(
      join("/repo", "packages", "design", "design-tokens", "tokens"),
    );
  });
});
