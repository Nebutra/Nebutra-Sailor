import { F0_BATCH1_TOOLS, ForgeRegistry } from "@nebutra/forge-runtime";
import { describe, expect, it } from "vitest";
import { getForgeRegistry } from "./registry";

describe("forge host registry", () => {
  it("registers md-to-pdf on the product host without putting it in F0 defaults", () => {
    expect(F0_BATCH1_TOOLS.some((t) => t.id === "doc/md-to-pdf")).toBe(false);
    expect(ForgeRegistry.openDefault().has("md-to-pdf")).toBe(false);

    const host = getForgeRegistry();
    expect(host.has("md-to-pdf")).toBe(true);
    expect(host.has("doc/md-to-pdf")).toBe(true);
    expect(host.get("md-to-pdf").slug).toBe("md-to-pdf");
  });

  it("keeps lab tools marked as lab for honest UI labeling", () => {
    const labs = getForgeRegistry()
      .list()
      .filter((t) => t.sotaStatus === "lab")
      .map((t) => t.slug)
      .sort();
    expect(labs).toEqual(["kinship", "phone-lookup"]);
  });
});
