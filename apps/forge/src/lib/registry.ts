import { ForgeRegistry } from "@nebutra/forge-runtime";

/** Process-wide default registry (pure tools, safe to share). */
let cached: ForgeRegistry | undefined;

export function getForgeRegistry(): ForgeRegistry {
  if (!cached) {
    cached = ForgeRegistry.openDefault();
  }
  return cached;
}
