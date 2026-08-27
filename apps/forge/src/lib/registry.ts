import { F0_BATCH1_TOOLS, ForgeRegistry } from "@nebutra/forge-runtime";
import { mdToPdfTool } from "@nebutra/forge-runtime/pdf";

/**
 * Process-wide Forge registry.
 *
 * md-to-pdf stays **out** of `F0_BATCH1_TOOLS` / `openDefault()` so lean hosts
 * (edge, tests, non-PDF products) never pull the Playwright optional peer.
 * This product host registers it explicitly — see apps/forge/README.md § md-to-pdf.
 */
let cached: ForgeRegistry | undefined;

export function getForgeRegistry(): ForgeRegistry {
  if (!cached) {
    cached = new ForgeRegistry([...F0_BATCH1_TOOLS, mdToPdfTool]);
  }
  return cached;
}
