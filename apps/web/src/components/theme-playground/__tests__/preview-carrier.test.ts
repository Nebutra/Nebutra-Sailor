/**
 * The preview must paint with the same carrier the app applies: the shipped
 * Brand Package for a design language, a compiled Brand Package for a DESIGN.md
 * import, and nothing at all for factory (the artboard inherits the tokens
 * SSOT). These tests pin the emitted selectors and values so a parallel token
 * map cannot grow back.
 */

import { describe, expect, it } from "vitest";
import { carrierForImported, carrierForLanguage, PREVIEW_CARRIER_ROOT } from "../preview-carrier";

describe("carrierForLanguage", () => {
  it("emits the production carrier scoped to the preview artboard", () => {
    const carrier = carrierForLanguage("cosmos");
    expect(carrier.brandId).toBe("cosmos");
    expect(carrier.css).toContain(`${PREVIEW_CARRIER_ROOT}[data-brand="cosmos"]`);
    // Cosmos's own Ink Black, straight from the Brand Package.
    expect(carrier.css).toContain("--primary: 0 0% 5%");
    // The carrier never binds :root — the preview cannot leak app-wide.
    expect(carrier.css).not.toMatch(/^:root/m);
    expect(carrier.css).not.toContain("html[data-brand");
  });

  it("keeps dual-mode languages switchable through the canonical .dark class", () => {
    const carrier = carrierForLanguage("cosmos");
    expect(carrier.css).toContain(`${PREVIEW_CARRIER_ROOT}.dark[data-brand="cosmos"]`);
  });

  it("emits no carrier for factory or an unknown id", () => {
    for (const id of ["factory", "default", "nebutra", "does-not-exist"]) {
      const carrier = carrierForLanguage(id);
      expect(carrier.css, id).toBe("");
      expect(carrier.brandId, id).toBeUndefined();
    }
  });
});

describe("carrierForImported", () => {
  it("compiles a DESIGN.md token set into the same scoped carrier", () => {
    const carrier = carrierForImported("Sunset", {
      color: {
        primary: { $value: "#ff5a1f", $type: "color" },
        background: { $value: "#fff7ed", $type: "color" },
        foreground: { $value: "#1a1a1a", $type: "color" },
      },
    });
    expect(carrier.brandId).toBe("imported");
    expect(carrier.css).toContain(`${PREVIEW_CARRIER_ROOT}[data-brand="imported"]`);
    // Compiled brands normalize to the HSL triple contract the utilities read.
    expect(carrier.css).toMatch(/--primary: \d/);
    expect(carrier.warning).toBeUndefined();
  });

  it("reports a set with no color tokens and leaves the artboard on factory", () => {
    const carrier = carrierForImported("Empty", {});
    expect(carrier.css).toBe("");
    expect(carrier.brandId).toBeUndefined();
    expect(carrier.warning).toMatch(/No color tokens/);
  });
});
