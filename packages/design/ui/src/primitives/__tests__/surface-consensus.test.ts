import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Surface consensus — the static-edge contract for every non-form primitive,
 * layout, navigation, pattern and editorial surface.
 *
 * Resting edges are a low-contrast hairline (border-border / edge tokens /
 * shadow-border). Heavy foreground-coloured strokes, 2px borders and
 * transition-all read as wireframe and break the shared motion contract.
 * Form controls own their own contract (form-control-visual-contract.test).
 */

const srcRoot = join(process.cwd(), "src");
const roots = ["primitives", "layout", "navigation", "patterns", "editorial"] as const;

// Owned by the form-control track.
const FORM_CONTROL =
  /^primitives\/(?:button|input|textarea|select|combobox|checkbox|radio|switch|toggle|slider|form-control|field|label)/u;

// Physical-object illustrations drawn in fixed paper colours, not UI chrome.
const ILLUSTRATION = /^primitives\/(?:folder|book|macbook-pro)\./u;

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "__tests__" || entry.name === "fixtures" ? [] : walk(full);
    }
    return /\.tsx?$/u.test(entry.name) && !/\.(?:stories|test)\.tsx?$/u.test(entry.name)
      ? [full]
      : [];
  });
}

const files = roots
  .flatMap((root) => walk(join(srcRoot, root)))
  .map((file) => ({ file, rel: relative(srcRoot, file).split("\\").join("/") }))
  .filter(({ rel }) => !FORM_CONTROL.test(rel) && !ILLUSTRATION.test(rel));

/** Class tokens with no variant prefix (hover:, data-[..]:, group-hover/x:) — the resting state. */
function staticMatches(source: string, pattern: RegExp): string[] {
  const hits: string[] = [];
  for (const match of source.matchAll(pattern)) {
    const index = match.index ?? 0;
    const before = source[index - 1] ?? " ";
    if (/[\w:\-[\]/]/u.test(before)) continue; // prefixed by a variant, or part of a longer token
    hits.push(match[0]);
  }
  return hits;
}

function offenders(pattern: RegExp, { staticOnly = true } = {}) {
  return files.flatMap(({ file, rel }) => {
    const source = readFileSync(file, "utf8");
    const hits = staticOnly
      ? staticMatches(source, pattern)
      : Array.from(source.matchAll(pattern), (m) => m[0]);
    return hits.map((hit) => `${rel}: ${hit}`);
  });
}

describe("surface consensus (non-form primitives, layout, navigation, patterns, editorial)", () => {
  it("scans a meaningful number of source files", () => {
    expect(files.length).toBeGreaterThan(150);
  });

  it("draws no static foreground / black / white strokes", () => {
    // foreground/<=12 is a hairline tint; anything stronger is a heavy stroke.
    const heavy =
      /border-(?:foreground(?!\/(?:\d|1[0-2])(?![\d]))(?:\/\d+)?|black(?:\/\d+)?|white(?:\/\d+)?)(?![\w-])/gu;
    expect(offenders(heavy)).toEqual([]);
  });

  it("uses no 2px static borders", () => {
    expect(offenders(/border-2(?![\w-])/gu)).toEqual([]);
  });

  it("emphasises hover and focus edges with the edge tokens, not a foreground stroke", () => {
    // A hover edge that goes to foreground/20+ turns a hairline card into a black frame.
    expect(
      offenders(/border-foreground\/(?:1[3-9]|[2-9]\d|100)(?![\w-])/gu, { staticOnly: false }),
    ).toEqual([]);
  });

  it("never transitions all properties", () => {
    expect(offenders(/transition-all(?![\w-])/gu, { staticOnly: false })).toEqual([]);
  });

  it("never writes raw-millisecond durations instead of the motion rail", () => {
    expect(offenders(/duration-(?:100|150|200|300|500)(?![\w-])/gu, { staticOnly: false })).toEqual(
      [],
    );
  });

  it("expresses solid selection as a fill, not a black stroke on a foreground block", () => {
    expect(offenders(/bg-foreground[^"'`]*border-foreground(?![\w/-])/gu)).toEqual([]);
  });
});

const read = (relativePath: string) => readFileSync(join(srcRoot, relativePath), "utf8");

describe("Menu item motion", () => {
  it("keeps high-frequency menu item highlights instant", () => {
    const overlay = read("primitives/overlay.ts");
    const items = [
      "menuItemBaseClassName",
      "menubarItem",
      "menubarCheckboxItem",
      "menubarSubTrigger",
    ];

    for (const name of items) {
      const block =
        overlay.match(
          new RegExp(
            `(?:const )?${name}\\b[\\s\\S]*?\\]\\.join|${name}:\\s*\\[[\\s\\S]*?\\]\\.join`,
            "u",
          ),
        )?.[0] ?? "";
      expect(block, name).not.toBe("");
      expect(block, name).not.toMatch(/transition/u);
    }
  });
});

describe("Tabs surface", () => {
  const tabs = read("primitives/tabs.tsx");
  const block = (name: string) =>
    tabs.match(new RegExp(`const ${name} = cva\\([\\s\\S]*?\\n\\);`, "u"))?.[0] ?? "";

  it("rests the segmented list on a borderless muted track", () => {
    const list = block("tabsListVariants");
    const segmented = list.match(/default:\s*"([^"]*)"/u)?.[1] ?? "";

    expect(segmented).toMatch(/\bbg-muted\b/u);
    expect(segmented).not.toMatch(/(?<![\w-])border(?![\w-])/u);
  });

  it("lifts the active segment to a white card with a light shadow", () => {
    expect(block("tabsIndicatorVariants")).toMatch(/default:\s*"[^"]*bg-background shadow-xs/u);
  });

  it("draws the button variant as a hairline ring, not a bordered box", () => {
    const trigger = block("tabsTriggerVariants");
    const button = trigger.match(/button:\s*\n?\s*"([^"]*)"/u)?.[1] ?? "";

    expect(button).not.toMatch(/(?<![\w-])border(?![\w-])/u);
    expect(button).toMatch(/ring-\[var\(--edge-/u);
  });
});
