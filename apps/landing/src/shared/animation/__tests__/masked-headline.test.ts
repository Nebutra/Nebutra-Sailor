import { describe, expect, it } from "vitest";
import { splitWords } from "../masked-headline";

describe("splitWords (hero headline masks)", () => {
  it("keeps Latin words whole, punctuation on the word, spaces between", () => {
    expect(splitWords("No company should be hard to start.", "en")).toEqual([
      "No",
      " ",
      "company",
      " ",
      "should",
      " ",
      "be",
      " ",
      "hard",
      " ",
      "to",
      " ",
      "start.",
    ]);
  });

  it("breaks Chinese into words, never into lone punctuation", () => {
    const parts = splitWords("让世界上没有难创的业。", "zh-Hans");
    expect(parts.join("")).toBe("让世界上没有难创的业。");
    expect(parts.length).toBeGreaterThan(2);
    expect(parts.every((p) => !/^[。，、：]/u.test(p))).toBe(true);
  });

  it("keeps an apostrophe and an opening quote with their word", () => {
    expect(splitWords("We're “here”", "en")).toEqual(["We're", " ", "“here”"]);
  });
});
