import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * An anchored overlay must leave its ancestors' stacking context.
 *
 * On 2026-09-26 the router market's language panel rendered under the search
 * bar and category cards: it was an in-place absolute panel, and the utility
 * bar above it is backdrop-blurred — backdrop-filter (like transform, filter,
 * opacity, isolation) makes a stacking context, so the panel's popover-tier
 * z-index only counted inside that 36px bar. Three hand-rolled menus had the
 * same shape. The DS menus and popovers portal to <body>; these rules keep
 * app code on them.
 */
const files = execFileSync("git", ["ls-files", "--", "apps/**/*.tsx", "packages/**/*.tsx"], {
  encoding: "utf8",
})
  .split("\n")
  .filter(
    (f) =>
      f &&
      !f.startsWith("packages/design/ui/src/primitives/") &&
      !/\.(stories|test)\.tsx$/.test(f) &&
      !f.includes("/__tests__/"),
  );

const code = (file: string) =>
  readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");

describe("anchored overlays portal out of their stacking context", () => {
  it("no hand-rolled menu or listbox outside the design system", () => {
    const offenders = files.filter((f) => /\brole=["{]?"?(menu|listbox)"/.test(code(f)));
    expect(offenders, "use DropdownMenu / Select / Combobox from @nebutra/ui/primitives").toEqual(
      [],
    );
  });

  it("anything on the popover or panel tier is rendered through a portal", () => {
    const offenders = files.filter((f) => {
      const src = code(f);
      return /--layer-(popover|panel|dropdown)\b/.test(src) && !/createPortal|Portal\b/.test(src);
    });
    expect(
      offenders,
      "an in-place overlay tier is only as high as its nearest stacking context",
    ).toEqual([]);
  });
});
