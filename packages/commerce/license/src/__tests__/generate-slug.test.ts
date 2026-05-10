import { describe, expect, it } from "vitest";
import { generateSlug } from "../generate-slug";

describe("generateSlug", () => {
  it("converts display name to lowercase kebab-case with member number suffix", () => {
    expect(generateSlug("Test Founder", 42)).toBe("test-founder-42");
  });

  it("strips special characters", () => {
    expect(generateSlug("José García!", 7)).toBe("jos-garca-7");
  });

  it("collapses multiple spaces into single hyphen", () => {
    expect(generateSlug("Alice   Bob", 1)).toBe("alice-bob-1");
  });

  it("trims leading and trailing whitespace", () => {
    expect(generateSlug("  padded  ", 3)).toBe("padded-3");
  });

  it("truncates base to 40 characters", () => {
    const longName = "a".repeat(60);
    const slug = generateSlug(longName, 1);
    // base is 40 chars + "-1" suffix
    expect(slug).toBe(`${"a".repeat(40)}-1`);
  });

  it("handles empty string gracefully", () => {
    const slug = generateSlug("", 1);
    expect(slug).toBe("-1");
  });

  it("handles CJK characters (stripped as non-alphanumeric)", () => {
    expect(generateSlug("张三 zhangsan", 10)).toBe("zhangsan-10");
  });
});
