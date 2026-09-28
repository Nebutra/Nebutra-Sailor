import { describe, expect, it } from "vitest";
import { carrierForPreset, PREVIEW_CARRIER_ROOT, paintedCarrierForPreset } from "../preset-carrier";

describe("carrierForPreset", () => {
  it("emits the production carrier scoped to the preview artboard", () => {
    const carrier = carrierForPreset({ base: "linear" });
    expect(carrier.brandId).toBe("studio");
    expect(carrier.css).toContain(`${PREVIEW_CARRIER_ROOT}[data-brand="studio"]`);
    expect(carrier.css).not.toMatch(/^:root/m);
  });

  it("keeps dual-mode languages switchable through the canonical .dark class", () => {
    expect(carrierForPreset({ base: "linear" }).css).toContain(`${PREVIEW_CARRIER_ROOT}.dark`);
  });

  it("paints nothing for plain factory: the artboard inherits the House tokens", () => {
    expect(carrierForPreset({ base: "factory" })).toEqual({ css: "" });
  });

  it("shows the knobs: a brand colour over factory reaches --primary", () => {
    const { css } = carrierForPreset({ base: "factory", brandColor: "#7c3aed" });
    expect(css).toMatch(/--primary:\s*262/);
  });

  it("says when a knob cannot apply", () => {
    expect(carrierForPreset({ base: "gsap", mode: "light" }).warning).toMatch(/one palette/);
  });

  it("paints factory explicitly where the page around it wears another brand", () => {
    const carrier = paintedCarrierForPreset({ base: "factory" });
    expect(carrier.brandId).toBe("studio");
    expect(carrier.css).toContain(`${PREVIEW_CARRIER_ROOT}[data-brand="studio"]`);
    expect(carrier.css).toContain(`${PREVIEW_CARRIER_ROOT}.dark[data-brand="studio"]`);
    expect(paintedCarrierForPreset({ base: "linear" })).toEqual(
      carrierForPreset({ base: "linear" }),
    );
  });
});
