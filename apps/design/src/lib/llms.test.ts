import { describe, expect, it } from "vitest";
import { COMPONENTS } from "@/lib/components/registry";
import { ECOSYSTEM } from "@/lib/ecosystem";
import { buildLlmsTxt } from "@/lib/llms";
import { navSections } from "@/lib/nav";
import { SITE_ORIGIN } from "@/lib/site";

const text = buildLlmsTxt();
const lines = text.split("\n");

describe("llms.txt", () => {
  it("opens with the site name and a one-line summary, as the format asks", () => {
    expect(lines[0]).toMatch(/^# \S/);
    expect(lines[2]).toMatch(/^> \S/);
  });

  it("lists every documented component with an absolute link and its blurb", () => {
    for (const entry of COMPONENTS) {
      const link = `[${entry.name}](${SITE_ORIGIN}/components/${entry.slug})`;
      const line = lines.find((candidate) => candidate.includes(link));
      expect(line, entry.slug).toBeDefined();
      expect(line).toContain(entry.blurb);
    }
  });

  it("links every page the sidebar shows, once", () => {
    const pages = new Set(
      navSections()
        .filter((section) => section.group !== "map")
        .flatMap((section) => section.items)
        .filter((item) => !item.kind)
        .map((item) => `${SITE_ORIGIN}${item.href}`),
    );
    for (const url of pages) {
      expect(text.split(`(${url})`).length - 1, url).toBeGreaterThanOrEqual(1);
    }
  });

  it("states the status of every ecosystem item, planned ones included", () => {
    for (const item of ECOSYSTEM) {
      const line = lines.find((candidate) => candidate.includes(`**${item.name}**`));
      expect(line, item.id).toBeDefined();
      expect(line?.toLowerCase(), item.id).toContain(item.status);
    }
  });

  it("never links a planned item", () => {
    for (const item of ECOSYSTEM.filter((entry) => entry.status === "planned")) {
      const line = lines.find((candidate) => candidate.includes(`**${item.name}**`)) ?? "";
      expect(line, item.id).not.toMatch(/\]\(/);
    }
  });

  it("uses no relative URLs and ends with a newline", () => {
    expect(text).not.toMatch(/\]\(\//);
    expect(text.endsWith("\n")).toBe(true);
  });
});
