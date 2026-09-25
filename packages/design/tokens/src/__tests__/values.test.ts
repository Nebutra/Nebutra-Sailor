import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { extractValues } from "../../scripts/emit-values.mjs";
import {
  fontFamilies,
  fontStack,
  resolveTokenValue,
  TOKEN_VALUES,
  tokenColor,
  tokenValue,
} from "../values";

const stylesheet = readFileSync(
  fileURLToPath(new URL("../../styles.css", import.meta.url)),
  "utf8",
);

describe("@nebutra/tokens/values", () => {
  it("is the stylesheet apps import, not a copy of it", () => {
    const fromCss = Object.fromEntries(extractValues(stylesheet));
    assert.deepEqual(TOKEN_VALUES, fromCss);
  });

  it("returns the declared value, var() intact, dark falling back to light", () => {
    assert.match(tokenValue("--font-heading"), /^var\(--font-dm-sans\)/);
    assert.equal(tokenValue("--font-mono", "dark"), tokenValue("--font-mono"));
  });

  it("names the faces a font token renders with, runtime variables dropped", () => {
    assert.deepEqual(fontFamilies("--font-heading").slice(0, 2), ["DM Sans", "MiSans"]);
    assert.equal(fontFamilies("--font-sans")[0], "Geist");
    assert.doesNotMatch(fontStack("--font-sans"), /var\(/);
    assert.match(fontStack("--font-sans"), /BlinkMacSystemFont/); // original quoting kept
  });

  it("resolves token references and wraps HSL channels for non-CSS renderers", () => {
    assert.equal(resolveTokenValue("--brand-gradient"), `hsl(${resolveTokenValue("--primary")})`);
    assert.match(tokenColor("--primary"), /^hsl\([\d.]+ [\d.]+% [\d.]+%\)$/);
    assert.match(tokenColor("--neutral-1"), /^#[0-9a-f]{6}$/i);
  });
});
