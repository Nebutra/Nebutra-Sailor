/** Register managed V1 providers before the chart consumes its source catalog. */
import {
  createHttpMarketDataTransport,
  createMarketDataProvider,
  dataSourceRegistry,
  type MarketDataProviderRegistry,
  marketDataProviderRegistry,
} from "@363045841yyt/klinechart-core/market-data";
import "@363045841yyt/klinechart-core/market-data/sources";
import { scopedPersistenceName } from "@363045841yyt/klinechart-core/persistence-scope";

const managedSources = [
  { id: "gotdx", path: "/market/tdx" },
  { id: "tradingview", path: "/market/python" },
] as const;
type PreferencesStorage = Pick<Storage, "getItem" | "setItem">;

/** Replace previously persisted loopback defaults in this account/workspace only. */
function migrateLoopbackEndpoints(storage: PreferencesStorage, origin: string) {
  const key = scopedPersistenceName("klinechart.aggregation-sources");
  try {
    const raw = storage.getItem(key);
    if (!raw) return;
    const stored = JSON.parse(raw);
    if (!stored || typeof stored !== "object" || !stored.baseUrls) return;
    let changed = false;
    for (const { id, path } of managedSources) {
      const value = stored.baseUrls[id];
      if (typeof value !== "string") continue;
      const url = new URL(value);
      if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
        stored.baseUrls[id] = origin + path;
        changed = true;
      }
    }
    if (changed) storage.setItem(key, JSON.stringify(stored));
  } catch {
    // The library owns invalid/denied preference storage; do not overwrite it.
  }
}

/** Use public transport factories so source-dialog resets keep hosted defaults. */
export function initializeMarketConnectors(
  origin: string,
  storage: PreferencesStorage,
  registry: MarketDataProviderRegistry = marketDataProviderRegistry,
) {
  registry.clear();
  for (const { id, path } of managedSources) {
    const baseUrl = origin + path;
    registry.register(
      createMarketDataProvider({
        source: { ...dataSourceRegistry[id], defaultBaseUrl: baseUrl },
        transport: createHttpMarketDataTransport({
          baseUrl: () => registry.getConfig(id).baseUrl ?? baseUrl,
          sourceLabel: id,
        }),
      }),
    );
  }
  migrateLoopbackEndpoints(storage, origin);
}
