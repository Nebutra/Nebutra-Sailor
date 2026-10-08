/** BYOK metadata and transport lifecycle; browser storage never receives credentials. */
import {
  createHttpMarketDataTransport,
  createMarketDataProvider,
  marketDataProviderRegistry,
} from "@363045841yyt/klinechart-core/market-data";
import type { BrowserAuthContext } from "@nebutra/auth/browser";
import { shallowRef } from "vue";

export interface MarketConnection {
  id: string;
  provider: string;
  label: string;
  maskedKey: string;
  updatedAt: string;
}
function isConnection(value: unknown): value is MarketConnection {
  if (!value || typeof value !== "object") return false;
  return ["id", "provider", "label", "maskedKey", "updatedAt"].every(
    (key) => typeof Object.getOwnPropertyDescriptor(value, key)?.value === "string",
  );
}
const API = "/market/byok/connections";
export function createMarketConnections(
  context: BrowserAuthContext | null,
  origin: string,
  fetchImpl: typeof fetch = fetch,
) {
  const connections = shallowRef<MarketConnection[]>([]);
  const canManage = shallowRef(false);
  const error = shallowRef("");
  const busy = shallowRef(false);
  const workspace = context?.activeWorkspaceId ?? "personal";
  const authenticatedFetch: typeof fetch = (input, init = {}) => {
    const headers = new Headers(init.headers);
    headers.set("X-KCQ-Workspace", workspace);
    return fetchImpl(input, { ...init, headers, credentials: "same-origin", cache: "no-store" });
  };
  async function request(path: string, init?: RequestInit): Promise<unknown> {
    const response = await authenticatedFetch(API + path, init);
    if (response.status === 204) return null;
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const envelope =
        data && typeof data === "object"
          ? Object.getOwnPropertyDescriptor(data, "error")?.value
          : null;
      const message =
        envelope && typeof envelope === "object"
          ? Object.getOwnPropertyDescriptor(envelope, "message")?.value
          : null;
      throw new Error(typeof message === "string" ? message : "数据源服务暂不可用，请重试。");
    }
    return data;
  }
  function synchronize(items: MarketConnection[]) {
    const wanted = new Set(items.map((item) => `byok-${item.id}`));
    for (const provider of marketDataProviderRegistry.getAll()) {
      if (provider.source.id.startsWith("byok-") && !wanted.has(provider.source.id))
        marketDataProviderRegistry.unregister(provider.source.id);
    }
    for (const item of items) {
      const id = `byok-${item.id}`;
      const existing = marketDataProviderRegistry.get(id);
      if (existing) continue;
      const baseUrl = origin + API + "/" + encodeURIComponent(item.id);
      marketDataProviderRegistry.register(
        createMarketDataProvider({
          source: {
            id,
            displayName: item.label,
            description: "Twelve Data · 自有 Key",
            defaultBaseUrl: baseUrl,
            endpointEditable: false,
            marketSessions: {
              BYOK_CRYPTO: {
                timeZone: "UTC",
                sessions: [{ open: 0, close: 1440 }],
                slotMinutes: 1,
                tradingDays: [0, 1, 2, 3, 4, 5, 6],
              },
            },
          },
          transport: createHttpMarketDataTransport({
            baseUrl,
            fetchImpl: authenticatedFetch,
            sourceLabel: item.label,
          }),
        }),
      );
    }
    connections.value = items;
  }
  async function refresh() {
    if (!context) return;
    const payload = await request("");
    const rows =
      payload && typeof payload === "object"
        ? Object.getOwnPropertyDescriptor(payload, "connections")?.value
        : null;
    const manage =
      payload && typeof payload === "object"
        ? Object.getOwnPropertyDescriptor(payload, "canManage")?.value
        : null;
    if (!Array.isArray(rows) || !rows.every(isConnection) || typeof manage !== "boolean")
      throw new Error("数据源列表格式无效。");
    canManage.value = manage;
    synchronize(rows);
  }
  async function run(action: () => Promise<unknown>) {
    if (busy.value) return false;
    busy.value = true;
    error.value = "";
    try {
      await action();
      return true;
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : "连接操作失败，请重试。";
      return false;
    } finally {
      busy.value = false;
    }
  }
  return {
    connections,
    canManage,
    error,
    busy,
    initialize: () => run(refresh),
    save: (label: string, apiKey: string, id?: string) =>
      run(async () => {
        await request("", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label, apiKey, ...(id ? { id } : {}) }),
        });
        await refresh();
      }),
    remove: (id: string) =>
      run(async () => {
        await request("/" + encodeURIComponent(id), { method: "DELETE" });
        await refresh();
      }),
    test: (id: string) =>
      run(async () => {
        await request(
          `/${encodeURIComponent(id)}/api/v1/market-data/sources/byok-${encodeURIComponent(id)}/probe`,
        );
      }),
  };
}
export type MarketConnections = ReturnType<typeof createMarketConnections>;
