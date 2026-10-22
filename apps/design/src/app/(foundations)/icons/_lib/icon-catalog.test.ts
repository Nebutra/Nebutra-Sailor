import * as AllIcons from "@nebutra/icons";
import { describe, expect, it } from "vitest";
import {
  CATEGORIES,
  categoryOf,
  importSnippet,
  jsxSnippet,
  kebab,
  searchIcons,
  tidySvg,
} from "./icon-catalog";

const NAMES = Object.keys(AllIcons).filter((name) => name !== "IconProps");

describe("kebab", () => {
  it("splits PascalCase on capitals and keeps digits with their word", () => {
    expect(kebab("ArrowUpRight")).toBe("arrow-up-right");
    expect(kebab("Check")).toBe("check");
    expect(kebab("Forward10Seconds")).toBe("forward10-seconds");
    expect(kebab("LogoGithubSmall")).toBe("logo-github-small");
  });
});

describe("categoryOf", () => {
  const cases: [string, string][] = [
    ["ArrowUpRight", "arrows"],
    ["ChevronDown", "arrows"],
    ["CornerLeftUp", "arrows"],
    ["LogoVercel", "brands"],
    ["BrowserChrome", "brands"],
    ["FileText", "files"],
    ["GitBranch", "files"],
    ["Terminal", "files"],
    ["Speaker", "media"],
    ["Play", "media"],
    ["Image", "media"],
    ["ChartBarPeak", "data"],
    ["Database", "data"],
    ["Check", "status"],
    ["Warning", "status"],
    ["Bell", "status"],
    ["User", "people"],
    ["Message", "people"],
    ["Lock", "platform"],
    ["Globe", "platform"],
    ["Cloud", "platform"],
    ["TextBold", "layout"],
    ["Sidebar", "layout"],
    ["Plus", "interface"],
  ];

  it.each(cases)("%s -> %s", (name, expected) => {
    expect(categoryOf(name)).toBe(expected);
  });

  it("gives every icon in the package a known category", () => {
    const ids = new Set(CATEGORIES.map((category) => category.id));
    for (const name of NAMES) expect(ids.has(categoryOf(name)), name).toBe(true);
  });

  it("uses every category, and does not leave most of the set in the catch-all", () => {
    const counts = new Map<string, number>();
    for (const name of NAMES) counts.set(categoryOf(name), (counts.get(categoryOf(name)) ?? 0) + 1);
    for (const category of CATEGORIES) {
      expect(counts.get(category.id) ?? 0, category.id).toBeGreaterThan(3);
    }
    expect((counts.get("interface") ?? 0) / NAMES.length).toBeLessThan(0.4);
  });
});

describe("searchIcons", () => {
  it("returns everything for an empty query and narrows by category", () => {
    expect(searchIcons(NAMES, "", "all")).toHaveLength(NAMES.length);
    const arrows = searchIcons(NAMES, "", "arrows");
    expect(arrows.length).toBeGreaterThan(10);
    expect(arrows.every((name) => categoryOf(name) === "arrows")).toBe(true);
  });

  it("matches case-insensitively on any part of the name", () => {
    expect(searchIcons(NAMES, "ARROWUP", "all")).toContain("ArrowUp");
    expect(searchIcons(NAMES, "arrow-up", "all")).toContain("ArrowUpRight");
  });

  it("requires every word of a multi-word query", () => {
    const result = searchIcons(NAMES, "arrow up", "all");
    expect(result).toContain("ArrowUp");
    expect(result).not.toContain("ArrowDown");
  });

  it("finds icons by the word a designer would use, not only the one the set chose", () => {
    expect(searchIcons(NAMES, "close", "all")).toContain("Cross");
    expect(searchIcons(NAMES, "delete", "all")).toContain("Trash");
    expect(searchIcons(NAMES, "search", "all")).toContain("MagnifyingGlass");
    expect(searchIcons(NAMES, "settings", "all")).toContain("SettingsGear");
  });

  it("intersects the query with the category", () => {
    const result = searchIcons(NAMES, "arrow", "brands");
    expect(result.every((name) => categoryOf(name) === "brands")).toBe(true);
  });

  it("returns nothing, not everything, when nothing matches", () => {
    expect(searchIcons(NAMES, "zzzzqqq", "all")).toEqual([]);
  });
});

describe("snippets", () => {
  it("writes the import line", () => {
    expect(importSnippet("ArrowUp")).toBe('import { ArrowUp } from "@nebutra/icons";');
  });

  it("omits every prop that is at its default", () => {
    expect(jsxSnippet("Check", { size: 16, weight: 0, tone: "inherit" })).toBe("<Check />");
  });

  it("writes the props that differ, in a stable order", () => {
    expect(jsxSnippet("Check", { size: 24, weight: 0, tone: "inherit" })).toBe(
      "<Check size={24} />",
    );
    expect(jsxSnippet("Check", { size: 24, weight: 0.5, tone: "primary" })).toBe(
      '<Check size={24} stroke="currentColor" strokeWidth={0.5} className="text-primary" />',
    );
  });
});

describe("tidySvg", () => {
  const raw =
    '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke-linejoin="round" viewBox="0 0 16 16" class="shrink-0" style="color: red"><path fill="currentColor" d="M1 1h2"></path><path fill="currentColor" d="M2 2h2"></path></svg>';

  it("drops presentation-only attributes and puts each element on its own line", () => {
    const out = tidySvg(raw);
    expect(out).not.toContain("aria-hidden");
    expect(out).not.toContain("class=");
    expect(out).not.toContain("style=");
    expect(out.split("\n")).toHaveLength(4);
    expect(out).toContain('viewBox="0 0 16 16"');
    expect(out).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it("self-closes empty path elements", () => {
    expect(tidySvg(raw)).toContain('d="M1 1h2" />');
  });

  it("keeps the drawing untouched", () => {
    const out = tidySvg(raw);
    expect(out).toContain('d="M1 1h2"');
    expect(out).toContain('d="M2 2h2"');
  });
});
