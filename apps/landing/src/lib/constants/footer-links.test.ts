import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { describe, expect, it } from "vitest";
import { FOOTER_COLUMNS } from "./footer-links";

describe("landing footer columns", () => {
  it("exposes a follow link to the public Forge origin", () => {
    const product = FOOTER_COLUMNS.find((column) => column.titleKey === "product");
    const forge = product?.links.find((link) => link.labelKey === "forge");

    expect(forge).toEqual({
      labelKey: "forge",
      href: getBrandOrigin("forge"),
      external: true,
    });
    expect(forge?.href).toMatch(/^https:\/\//);
  });
});
