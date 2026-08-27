import { describe, expect, it } from "vitest";
import { createDemoBrandContext, requireBrandContext, summarizeBrandContext } from "./index";

describe("generation-context", () => {
  it("requires BrandContext for every generation capability", () => {
    expect(() => requireBrandContext(undefined, "image-pipeline")).toThrow(/BrandContext/);
  });

  it("summarizes the shared brand contract without owning generation", () => {
    const brand = createDemoBrandContext();
    expect(summarizeBrandContext(brand)).toContain("Loop");
    expect(summarizeBrandContext(brand)).toContain("palette=");
  });
});
