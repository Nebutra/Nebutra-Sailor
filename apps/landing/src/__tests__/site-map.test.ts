import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { SECTIONS, SITE_MAP } from "../site-map";

/**
 * The site map is the one source for sections and page ownership. It drifts
 * the moment a page is added, moved or deleted without it — so the app
 * directory and the map must agree, both ways.
 */
const LANG = join(__dirname, "..", "app", "[lang]");
const GROUPS = ["(marketing)", "(legal)"];

function routes(): string[] {
  const out: string[] = [];
  const walk = (dir: string, root: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) {
        if (name === "__tests__" || name.startsWith("_")) continue;
        walk(p, root);
      } else if (name === "page.tsx") {
        const rel = relative(root, dir);
        out.push(rel === "" ? "/" : `/${rel}`);
      }
    }
  };
  for (const g of GROUPS) walk(join(LANG, g), join(LANG, g));
  return out.sort();
}

describe("site map", () => {
  const built = routes();
  const listed = new Map(SITE_MAP.map((p) => [p.path, p]));

  it("lists every page that exists", () => {
    expect(built.filter((r) => !listed.has(r))).toEqual([]);
  });

  it("every live or redirect entry exists; planned entries do not yet", () => {
    for (const p of SITE_MAP) {
      if (p.status === "planned")
        expect(built, `${p.path} is planned but exists`).not.toContain(p.path);
      else expect(built, `${p.path} is ${p.status} but has no page`).toContain(p.path);
    }
  });

  it("paths are unique and every page names a known section", () => {
    expect(new Set(SITE_MAP.map((p) => p.path)).size).toBe(SITE_MAP.length);
    const ids = new Set(SECTIONS.map((s) => s.id));
    for (const p of SITE_MAP) expect(ids.has(p.section), p.path).toBe(true);
  });

  it("the rail lists live, linkable pages only — and keeps Sailor's product pages in reach", () => {
    const rail = SITE_MAP.filter((p) => p.rail);
    for (const p of rail) {
      expect(p.status, `${p.path} is in the rail but ${p.status}`).toBe("live");
      expect(p.path, `${p.path} is a pattern, not a page`).not.toMatch(/\[/);
      expect(p.chrome, `${p.path} draws its own frame`).not.toBe("bare");
    }
    // These were unreachable from the site's navigation once the rail replaced
    // the top nav (2026-09-28).
    for (const path of ["/features", "/pricing", "/changelog", "/sailor/studio"]) {
      expect(listed.get(path)?.rail, path).toBe(true);
    }
  });

  it("Ideas belongs to Sleptons — it is the UGC of ideas and needs, not the essays", () => {
    expect(listed.get("/ideas")?.section).toBe("sleptons");
    expect(SECTIONS.find((s) => s.id === "journal")?.path).toBe("/blog");
  });
});

describe("pageAt", () => {
  it("resolves static and dynamic routes to their entry", async () => {
    const { pageAt } = await import("../site-map");
    expect(pageAt("/")?.path).toBe("/");
    expect(pageAt("/changelog")?.chrome).toBe("over-dark");
    expect(pageAt("/changelog/1.8.0")?.path).toBe("/changelog/[version]");
    expect(pageAt("/solutions/china-vc/abc")?.path).toBe("/solutions/china-vc/[id]");
    expect(pageAt("/blog/tag/ai")?.path).toBe("/blog/tag/[tag]");
    expect(pageAt("/sailor/studio/frame")?.chrome).toBe("bare");
    // Studio is a tool: top bar, no footer, the rest of the viewport.
    expect(pageAt("/sailor/studio")?.chrome).toBe("tool");
    // The status page sits in the site frame; it carries no brand header of its own.
    expect(pageAt("/status")?.chrome).toBeUndefined();
    expect(pageAt("/nowhere")).toBeUndefined();
  });
});
