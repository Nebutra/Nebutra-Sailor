import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Headings have one rule: packages/design/design-tokens/static/base.css sets
 * h1–h6 to --font-heading at --font-weight-heading. On 2026-09-26 three more
 * stylesheets re-declared it (@nebutra/ui fonts.css, apps/web and apps/landing
 * globals) and the last one loaded won — landing shipped Geist 600 headings
 * after the typeface decision set them to DM Sans 500.
 */
const HOME = "packages/design/design-tokens/static/base.css";

describe("one heading rule", () => {
  it("no stylesheet but base.css sets font-family on bare heading selectors", () => {
    const files = execFileSync(
      "git",
      ["ls-files", "--", "apps/*.css", "apps/**/*.css", "packages/design/**/*.css"],
      { encoding: "utf8" },
    )
      .split("\n")
      .filter((f) => f && f !== HOME && !/\/(skins|tokens\/styles\.css|theme\/skins\.css)/.test(f));
    const offenders: string[] = [];
    for (const file of files) {
      const css = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
        const selectors = (m[1] as string).split(",").map((s) => s.trim());
        const bareHeadings = selectors.filter((s) => /^(:where\()?h[1-6]\)?$/.test(s));
        if (bareHeadings.length >= 2 && /font-family\s*:/.test(m[2] as string)) {
          offenders.push(`${file}: ${selectors.join(", ")}`);
        }
      }
    }
    expect(offenders, "re-declared heading rules — delete them; base.css owns headings").toEqual(
      [],
    );
  });
});
