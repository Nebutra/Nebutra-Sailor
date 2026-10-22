/**
 * The docs shell's visual contract, read from source.
 *
 * The site reads as a wireframe when every box draws its own heavy line, every
 * selected chip is a solid black block, and each control is hand-rolled. These
 * checks keep the shell on hairlines, system controls and one motion path, so
 * the next edit cannot quietly put the heavy lines back.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = resolve(__dirname, "..");
const read = (file: string) => readFileSync(resolve(SRC, file), "utf8");

const SHELL_FILES = [
  "app/layout.tsx",
  "components/site-header.tsx",
  "components/site-nav.tsx",
  "components/site-footer.tsx",
  "components/page-toc.tsx",
  "components/command-palette.tsx",
  "components/language-switcher.tsx",
  "components/component-playground.tsx",
  "components/component-code.tsx",
  "components/component-api-table.tsx",
  "components/component-states-matrix.tsx",
  "components/code-sample.tsx",
  "components/component-section.tsx",
  "components/command-line.tsx",
  "components/segmented.tsx",
] as const;

describe("docs shell — no wireframe lines", () => {
  it.each(SHELL_FILES)("%s draws its lines with the hairline token", (file) => {
    // A skin's --border may be solid ink; the chrome's lines must not follow it.
    expect(read(file)).not.toMatch(/\b(?:border|divide|ring)-border\b/);
  });

  it.each(SHELL_FILES)("%s has no solid-ink border or selected block", (file) => {
    const source = read(file);
    expect(source).not.toMatch(/border-foreground/);
    expect(source).not.toMatch(/bg-foreground/);
    expect(source).not.toMatch(/border-(?:2|4|8)\b/);
  });
});

describe("playground — one workbench", () => {
  const source = read("components/component-playground.tsx");

  it("selects options with the system segmented control, not hand-rolled chips", () => {
    expect(source).toMatch(/<Segmented\b/);
    expect(source).not.toMatch(/aria-pressed/);
    expect(read("components/segmented.tsx")).toMatch(/ToggleGroup/);
  });

  it("draws one container, with dividers between stage, props and code", () => {
    // A single outer frame; the panes inside are separated by hairlines.
    expect(source.match(/rounded-card border/g) ?? []).toHaveLength(1);
    expect(source).toMatch(/divide-|border-t|border-l/);
  });

  it("sits the stage on the dot matrix", () => {
    expect(source).toMatch(/bg-dot-matrix/);
  });

  it("edits text and boolean props with system controls", () => {
    expect(source).toMatch(/<Input\b/);
    expect(source).toMatch(/<Toggle\b/);
  });
});

describe("install and code blocks — one card", () => {
  const source = read("components/component-code.tsx");

  it("shares one frame between CodeBlock and InstallCard", () => {
    expect(source).toMatch(/function CodeFrame/);
    expect(source.match(/rounded-lg border/g) ?? []).toHaveLength(1);
  });

  it("switches package manager with the system segmented control", () => {
    expect(source).toMatch(/<Segmented\b/);
    expect(source).not.toMatch(/aria-pressed/);
  });
});

describe("chrome — muted selection, hairline rules", () => {
  it("marks the current page with a muted fill, not an accent block", () => {
    const nav = read("components/site-nav.tsx");
    expect(nav).toMatch(/bg-muted text-foreground/);
    expect(nav).not.toMatch(/"bg-accent text-foreground"/);
  });

  it("marks the current section in the on-this-page rail without solid ink", () => {
    expect(read("components/page-toc.tsx")).not.toMatch(/border-foreground/);
  });
});

describe("motion — one entrance path, quiet controls", () => {
  it("brings each page section in through AnimateIn", () => {
    const section = read("components/component-section.tsx");
    expect(section).toMatch(/AnimateIn/);
    expect(section).not.toMatch(/motion\.div|<m\.div/);
  });

  it("keeps h2 a direct child of its section for the on-this-page rail", () => {
    const section = read("components/component-section.tsx");
    expect(section).toMatch(/<section[^>]*>\s*<h2/);
  });

  it("gives every hand-written interactive element a transition", () => {
    for (const file of ["components/site-nav.tsx", "components/page-toc.tsx"]) {
      const source = read(file);
      const anchors = source.match(/className=\{?cn\(|className="/g) ?? [];
      expect(anchors.length).toBeGreaterThan(0);
      expect(source).toMatch(/transition-colors/);
    }
  });

  it("respects reduced motion for hand-written transitions", () => {
    const css = read("app/globals.css");
    expect(css).toMatch(/prefers-reduced-motion/);
  });
});

describe("motion — baseline, press feedback, rail indicator", () => {
  const css = read("app/globals.css");
  // Biome quotes attribute values, so accept both spellings.
  const SELECTOR = String.raw`:where\(a, button, \[role="?tab"?\], summary, \[role="?button"?\]\)`;

  it("gives bare links and buttons a colour-only baseline transition, in the base layer", () => {
    const rule = css.match(new RegExp(String.raw`@layer base \{\s*${SELECTOR}\s*\{([^}]*)\}`));
    expect(rule, "baseline rule inside @layer base").not.toBeNull();
    const body = rule?.[1] ?? "";
    expect(body).toMatch(
      /transition-property:\s*color,\s*background-color,\s*border-color,\s*box-shadow,\s*opacity;/,
    );
    expect(body).not.toMatch(/transform/);
    expect(body).toMatch(/transition-duration:\s*var\(--duration-micro\)/);
    expect(body).toMatch(/transition-timing-function:\s*var\(--ease-out\)/);
  });

  it("calms the baseline under reduced motion", () => {
    const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduced).toMatch(new RegExp(SELECTOR));
  });

  it.each([
    ["lib/components/demo-kit.tsx", /Show code/],
    ["components/component-code.tsx", /Copy install command/],
  ])("%s presses to scale(0.97) with a transform transition", (file, label) => {
    const source = read(file);
    expect(source).toMatch(label);
    expect(source).toMatch(/active:scale-\[0\.97\]/);
    expect(source).toMatch(/transition-\[[^\]]*transform[^\]]*\]/);
    expect(source).toMatch(/motion-reduce:/);
  });

  it("draws the current on-this-page marker 2px wide in a restrained colour", () => {
    const toc = read("components/page-toc.tsx");
    expect(toc).toMatch(/border-l-2/);
    expect(toc).not.toMatch(/border-foreground/);
  });
});
