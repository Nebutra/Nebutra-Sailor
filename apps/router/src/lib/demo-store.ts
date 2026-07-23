import {
  DEFAULT_PRODUCT_SCOPES,
  type IssuedApiKey,
  issueApiKey,
  MemoryPrepaidWallet,
} from "@nebutra/prepaid-wallet";
import { listPublicModels, parseAliasTableJson } from "@nebutra/router-supply";

export interface StoredKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: readonly string[];
  createdAt: string;
  /** Full key only kept in demo memory for copy-once UX after create. */
  fullKeyOnce?: string;
}

const g = globalThis as unknown as {
  __routerWallet?: MemoryPrepaidWallet;
  __routerKeys?: StoredKey[];
  __routerKeySeq?: number;
};

export function getWallet(): MemoryPrepaidWallet {
  if (!g.__routerWallet) {
    const w = new MemoryPrepaidWallet();
    w.seed("demo", 25);
    g.__routerWallet = w;
  }
  return g.__routerWallet;
}

export function listKeys(): StoredKey[] {
  if (!g.__routerKeys) g.__routerKeys = [];
  return g.__routerKeys.map(({ fullKeyOnce: _, ...rest }) => rest);
}

export function createKey(name: string): StoredKey & { fullKey: string } {
  if (!g.__routerKeys) g.__routerKeys = [];
  g.__routerKeySeq = (g.__routerKeySeq ?? 0) + 1;
  const issued: IssuedApiKey = issueApiKey({ scopes: DEFAULT_PRODUCT_SCOPES });
  const row: StoredKey = {
    id: `key_${g.__routerKeySeq}`,
    name: name || "default",
    keyPrefix: issued.keyPrefix,
    scopes: issued.scopes,
    createdAt: new Date().toISOString(),
    fullKeyOnce: issued.fullKey,
  };
  g.__routerKeys.unshift(row);
  return { ...row, fullKey: issued.fullKey };
}

export function getModels() {
  const aliases = parseAliasTableJson(process.env.NEBUTRA_MODEL_ALIASES);
  return listPublicModels(aliases);
}

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
  return process.env.NEXT_PUBLIC_ROUTER_API_BASE ?? "https://router.nebutra.com/v1";
}
