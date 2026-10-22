import { describe, expect, it } from "vitest";
import { type CommandEntry, rank } from "./command-rank";

const entry = (label: string, keywords?: string): CommandEntry => ({
  href: `/${label}`,
  label,
  group: "Test",
  ...(keywords ? { keywords } : {}),
});

describe("rank", () => {
  it("returns -1 when neither the name nor the keywords match", () => {
    expect(rank(entry("Button", "action"), "zzz")).toBe(-1);
  });

  it("still finds a name by loose subsequence, the way people type into a palette", () => {
    expect(rank(entry("iPhone Mockup"), "ipmock")).toBeGreaterThanOrEqual(0);
  });

  it("ranks a name that contains the query above a keyword hit", () => {
    const byName = rank(entry("Icons gallery"), "icons");
    const byKeyword = rank(entry("IconBox", "icons glyph svg"), "icons");
    expect(byName).toBeGreaterThan(byKeyword);
  });

  it("ranks a keyword hit above a name that only matches as a loose subsequence", () => {
    // "icons" is a subsequence of "Notification Message List", but not what anyone meant.
    const loose = rank(entry("Notification Message List"), "icons");
    const byKeyword = rank(entry("IconBox", "icons glyph svg"), "icons");
    expect(byKeyword).toBeGreaterThan(loose);
  });

  it("ranks a prefix above a mid-name hit", () => {
    expect(rank(entry("Table"), "table")).toBeGreaterThan(rank(entry("Data Table"), "table"));
  });

  it("ranks a page above a showcase demo that merely has the word in its name", () => {
    const demo = { ...entry("Context Menu With Icons"), demo: true };
    const page = entry("IconBox", "icons glyph svg");
    expect(rank(page, "icons")).toBeGreaterThan(rank(demo, "icons"));
  });

  it("still finds a demo when nothing else matches", () => {
    const demo = { ...entry("Context Menu With Icons"), demo: true };
    expect(rank(demo, "context")).toBeGreaterThan(0);
  });
});
