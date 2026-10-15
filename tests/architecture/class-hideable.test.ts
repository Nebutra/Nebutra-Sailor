import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { openingTags } from "../../scripts/lib/jsx-count-ratchet.mjs";
import { stripComments } from "../../scripts/lib/strip-comments.mjs";

/**
 * A shared component that accepts `className` must be hideable by a class.
 *
 * On 2026-10-16 every themed logo pair on the product (`dark:hidden` beside
 * `hidden dark:block`) rendered both logos — "NebutraNebutra" in the header
 * and footer — because @nebutra/brand's Logo put `display: inline-flex` in the
 * style attribute of the very element that carried the caller's class. An
 * inline declaration beats every utility; `hidden`, `md:block`, `dark:hidden`
 * and `invisible` all stop working, with no error anywhere (#772).
 *
 * Rule, for the shared libraries every app renders (@nebutra/brand and
 * @nebutra/ui): an element whose className includes the caller's `className`
 * must not set `display` or `visibility` inline. Put the default display in the
 * class list (`inline-flex`, `block`) where a caller's class can override it.
 * packages/design/brand/src/components/visibility.test.ts renders every brand
 * component with className="hidden" as the behavioural half of this check.
 */
const ROOTS = [
  "packages/design/brand/src/*.tsx",
  "packages/design/brand/src/**/*.tsx",
  "packages/design/ui/src/*.tsx",
  "packages/design/ui/src/**/*.tsx",
];

describe("shared components stay hideable by class", () => {
  it("no element that takes the caller's className sets display or visibility inline", () => {
    const files = execFileSync("git", ["ls-files", ...ROOTS], { encoding: "utf8" })
      .split("\n")
      .filter((f) => f && !/\.(test|stories)\.tsx$/.test(f));
    // A scan that reads nothing passes everything.
    expect(files.length).toBeGreaterThan(300);

    const offenders: string[] = [];
    for (const file of files) {
      const src = stripComments(readFileSync(file, "utf8"));
      for (const { tag, attrs, index } of openingTags(src)) {
        if (!/\bclassName=\{[^}]*\bclassName\b/.test(attrs)) continue;
        const style = /\bstyle=\{\{([\s\S]*?)\}\}/.exec(attrs)?.[1];
        if (style && /(^|[\s,{])(display|visibility)\s*:/.test(style)) {
          offenders.push(`${file}:${src.slice(0, index).split("\n").length} <${tag}>`);
        }
      }
    }
    expect(
      offenders,
      "inline display/visibility on an element that carries the caller's className — move it into the class list",
    ).toEqual([]);
  });
});
