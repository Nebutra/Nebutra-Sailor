/**
 * A utility class must be able to hide every brand component.
 *
 * On 2026-10-16 every themed logo pair (`dark:hidden` / `hidden dark:block`)
 * rendered both logos: Logo had moved to inline SVG with `display: inline-flex`
 * in the outer element's style attribute, and an inline declaration beats any
 * class (#772). Logo.test.ts covers the two components that broke; this covers
 * every exported component and every variant, so a new one cannot reintroduce
 * it. The outer element must carry the caller's class and set neither
 * `display` nor `visibility` inline.
 */
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BrandMark, BrandWordmark } from "./BrandLockup";
import { Logo, Logomark, type LogoVariant, Wordmark } from "./Logo";
import { LogoEnColorSVG, LogoEnSVG, LogomarkSVG, WordmarkEnSVG } from "./LogoSVG";

const LOGO_VARIANTS: LogoVariant[] = [
  "color",
  "inverse",
  "mono",
  "en",
  "zh",
  "zh-en",
  "horizontal-en",
  "horizontal-zh",
  "vertical-en",
  "vertical-zh",
  "horizontal-en-mono",
  "horizontal-zh-mono",
  "vertical-en-mono",
  "vertical-zh-mono",
];

const HIDE = "hidden";

const cases: Array<[string, ReactElement]> = [
  ...LOGO_VARIANTS.flatMap(
    (variant): Array<[string, ReactElement]> => [
      [`Logo ${variant}`, createElement(Logo, { variant, size: 120, className: HIDE })],
      [
        `Logo ${variant} compliant`,
        createElement(Logo, { variant, size: 120, edition: "compliant", className: HIDE }),
      ],
    ],
  ),
  ...(["color", "inverse", "mono"] as const).map((variant): [string, ReactElement] => [
    `Logomark ${variant}`,
    createElement(Logomark, { variant, size: 32, className: HIDE }),
  ]),
  ...(["en", "zh", "zh-en"] as const).map((variant): [string, ReactElement] => [
    `Wordmark ${variant}`,
    createElement(Wordmark, { variant, size: 120, className: HIDE }),
  ]),
  ["BrandMark", createElement(BrandMark, { className: HIDE })],
  ["BrandWordmark", createElement(BrandWordmark, { className: HIDE })],
  ["BrandWordmark inline", createElement(BrandWordmark, { className: HIDE, inline: true })],
  ["LogomarkSVG", createElement(LogomarkSVG, { className: HIDE })],
  ["WordmarkEnSVG", createElement(WordmarkEnSVG, { className: HIDE })],
  ["LogoEnSVG", createElement(LogoEnSVG, { className: HIDE })],
  ["LogoEnColorSVG", createElement(LogoEnColorSVG, { className: HIDE })],
];

/** The component's own outer element — React emits resource hints (an image
 *  preload <link>) ahead of it in a static render. */
function outerTag(html: string): string {
  const body = html.replace(/^(?:<link\b[^>]*>|<style\b[\s\S]*?<\/style>)+/, "");
  return body.slice(0, body.indexOf(">") + 1);
}

describe("brand components can be hidden by a class", () => {
  for (const [name, node] of cases) {
    it(name, () => {
      const outer = outerTag(renderToStaticMarkup(node));
      expect(outer, `${name} must put the caller's class on its outer element`).toMatch(
        /class="[^"]*\bhidden\b[^"]*"/,
      );
      const style = /style="([^"]*)"/.exec(outer)?.[1] ?? "";
      expect(style, `${name}: an inline display beats hidden / dark:hidden`).not.toMatch(
        /(^|;)\s*display\s*:/,
      );
      expect(style, `${name}: an inline visibility beats invisible / sr-only`).not.toMatch(
        /(^|;)\s*visibility\s*:/,
      );
    });
  }
});
