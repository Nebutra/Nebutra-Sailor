import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { parseAliasTableJson } from "@nebutra/router-supply";

export interface ModelRouteRow {
  publicModel: string;
  routes: readonly { engineId: string; upstreamModel: string; priority: number }[];
}

/** Public model → ordered upstream engine routes for console display. */
export function getModelRoutes(): ModelRouteRow[] {
  const aliases = parseAliasTableJson(process.env.NEBUTRA_MODEL_ALIASES);
  const byModel = new Map<string, ModelRouteRow["routes"][number][]>();
  for (const e of aliases.entries) {
    if (e.publicModel === "*") continue;
    const list = byModel.get(e.publicModel) ?? [];
    list.push({
      engineId: e.engineId,
      upstreamModel: e.upstreamModel,
      priority: e.priority,
    });
    byModel.set(e.publicModel, list);
  }
  return [...byModel.entries()]
    .map(([publicModel, routes]) => ({
      publicModel,
      routes: [...routes].sort((a, b) => a.priority - b.priority),
    }))
    .sort((a, b) => a.publicModel.localeCompare(b.publicModel));
}

export function getBaseUrlHint() {
  return process.env.NEXT_PUBLIC_ROUTER_API_BASE?.trim() || `${getBrandOrigin("router")}/v1`;
}
