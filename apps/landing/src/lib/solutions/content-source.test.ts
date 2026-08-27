import { describe, expect, it } from "vitest";
import { EmptyContentSource, getSolutionContentSource } from "./content-source";

describe("solution content source", () => {
  it("EmptyContentSource returns no posts", async () => {
    const posts = await EmptyContentSource.getRelatedPosts("go-global", "en", 3);
    expect(posts).toEqual([]);
  });

  it("getSolutionContentSource resolves a usable source while content is being built", async () => {
    const source = getSolutionContentSource();
    expect(typeof source.getRelatedPosts).toBe("function");
    expect(await source.getRelatedPosts("growth", "zh-Hans", 5)).toEqual([]);
  });
});
