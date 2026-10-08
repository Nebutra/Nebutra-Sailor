/** Fixed-host Twelve Data adapter; API keys never enter URLs or errors. */
import { TZDate } from "@date-fns/tz";
import { z } from "zod";

export class MarketSourceError extends Error {
  constructor(
    public readonly status: 400 | 401 | 403 | 404 | 429 | 502 | 503,
    message: string,
    public readonly code = "FETCH_FAILED",
  ) {
    super(message);
  }
}
export const periods = {
  "1min": "1min",
  "5min": "5min",
  "15min": "15min",
  "30min": "30min",
  "60min": "1h",
  "4h": "4h",
  daily: "1day",
  weekly: "1week",
  monthly: "1month",
};
export const barsCapability = {
  periods: Object.keys(periods),
  adjustments: ["none", "splits"],
  aggregations: ["original"],
};
export const sourceCapabilities = {
  assetClasses: ["stock", "etf", "crypto", "index"],
  bars: barsCapability,
};
export const barRequest = z.object({
  sourceId: z.string().optional(),
  instrument: z.object({
    id: z.string().min(1).max(160),
    symbol: z.string().min(1).max(80),
    exchange: z.string().max(80),
  }),
  period: z.string().max(20),
  adjustment: z.string().max(20),
  barAggregation: z.string().max(30),
  limit: z.number().int().min(1).max(500),
  beforeTimestamp: z.number().int().min(0).max(8640000000000000).optional(),
});
const rowSchema = z.object({
  datetime: z.string(),
  open: z.coerce.number().finite(),
  high: z.coerce.number().finite(),
  low: z.coerce.number().finite(),
  close: z.coerce.number().finite(),
  volume: z.coerce.number().finite().optional(),
});
const seriesSchema = z.object({
  values: z.array(rowSchema).max(501),
  meta: z.object({ exchange_timezone: z.string() }).optional(),
});
const searchSchema = z.object({
  data: z.array(
    z.object({
      symbol: z.string(),
      instrument_name: z.string(),
      exchange: z.string(),
      instrument_type: z.string(),
      currency: z.string().optional(),
    }),
  ),
});

/** All operations use the customer's key only, never a platform fallback. */
export class TwelveDataAdapter {
  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  private async request(
    key: string,
    path: "time_series" | "symbol_search",
    params: Record<string, string>,
  ) {
    const url = new URL(`https://api.twelvedata.com/${path}`);
    for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
    let response: Response;
    try {
      response = await this.fetchImpl(url.toString(), {
        headers: { Authorization: `apikey ${key}` },
        redirect: "error",
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
      });
    } catch {
      throw new MarketSourceError(502, "行情源连接失败，请稍后重试。");
    }
    const data: unknown = await response.json().catch(() => null);
    const failure = z
      .object({ status: z.literal("error"), code: z.number().optional() })
      .safeParse(data);
    if (!response.ok || failure.success) {
      const code = failure.success ? (failure.data.code ?? response.status) : response.status;
      if (code === 429)
        throw new MarketSourceError(429, "行情源额度或频率已达上限，请检查该源账户。");
      if (code === 401) throw new MarketSourceError(401, "行情源 Key 无效，请替换后重试。");
      if (code === 403)
        throw new MarketSourceError(403, "行情源套餐不包含此数据，请检查账户权益。");
      throw new MarketSourceError(502, "行情源未返回可用数据，请检查商品及账户权益。");
    }
    return data;
  }

  /** Explicit test consumes one minimal historical request on the customer's plan. */
  async probe(key: string) {
    const data = seriesSchema.safeParse(
      await this.request(key, "time_series", {
        symbol: "AAPL",
        interval: "1day",
        outputsize: "1",
        timezone: "UTC",
        adjust: "none",
      }),
    );
    if (!data.success || !data.data.values.length)
      throw new MarketSourceError(502, "行情源响应格式无效。");
    return { status: "online", checkedAt: Date.now(), capabilities: sourceCapabilities };
  }

  /** Maps the provider's directory to KCQ identities; sessions currently support US equities and 24/7 markets. */
  async search(key: string, sourceId: string, keyword: string, limit: number) {
    const result = searchSchema.safeParse(
      await this.request(key, "symbol_search", {
        symbol: keyword,
        outputsize: String(limit),
        show_plan: "true",
      }),
    );
    if (!result.success) throw new MarketSourceError(502, "行情源目录格式无效。");
    const items = result.data.data.flatMap((item) => {
      const kind = item.instrument_type.toLowerCase();
      const assetClass = kind.includes("crypto")
        ? "crypto"
        : kind.includes("forex") || kind.includes("currency")
          ? "forex"
          : kind.includes("etf")
            ? "etf"
            : kind.includes("index")
              ? "index"
              : "stock";
      if (assetClass === "forex") return [];
      const sessionId =
        assetClass === "crypto"
          ? "BYOK_CRYPTO"
          : ["NASDAQ", "NYSE", "NYSE ARCA", "AMEX", "BATS"].includes(item.exchange.toUpperCase())
            ? "US"
            : undefined;
      if (!sessionId) return [];
      return [
        {
          id: `${item.symbol}@${item.exchange}`,
          sourceId,
          symbol: item.symbol,
          name: item.instrument_name,
          exchange: item.exchange,
          currency: item.currency,
          assetClass,
          sessionId,
          capabilities: { bars: barsCapability },
        },
      ];
    });
    return { items: items.slice(0, limit) };
  }

  /** UTC conversion, ascending bars, exclusive pagination and honest native aggregation. */
  async bars(key: string, request: z.infer<typeof barRequest>) {
    const interval = Object.entries(periods).find(([period]) => period === request.period)?.[1];
    if (
      !interval ||
      !barsCapability.adjustments.includes(request.adjustment) ||
      request.barAggregation !== "original"
    ) {
      throw new MarketSourceError(
        400,
        "行情源不支持此周期、复权或聚合方式。",
        "UNSUPPORTED_CAPABILITY",
      );
    }
    const params: Record<string, string> = {
      symbol: request.instrument.symbol,
      interval,
      outputsize: String(request.limit + (request.beforeTimestamp === undefined ? 0 : 1)),
      timezone: "UTC",
      adjust: request.adjustment,
    };
    if (request.instrument.exchange) params.exchange = request.instrument.exchange;
    if (request.beforeTimestamp !== undefined)
      params.end_date = new Date(request.beforeTimestamp - 1)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");
    const result = seriesSchema.safeParse(await this.request(key, "time_series", params));
    if (!result.success) throw new MarketSourceError(502, "行情源 K 线格式无效。");
    const items = result.data.values
      .map(({ datetime, ...bar }) => {
        // Daily/weekly/monthly labels are exchange dates: provider timezone applies only to intraday.
        const daily = datetime.length === 10;
        const exchangeTimezone = result.data.meta?.exchange_timezone ?? "UTC";
        const timestamp = daily
          ? TZDate.tz(
              exchangeTimezone,
              Number(datetime.slice(0, 4)),
              Number(datetime.slice(5, 7)) - 1,
              Number(datetime.slice(8, 10)),
            ).getTime()
          : Date.parse(`${datetime.replace(" ", "T")}Z`);
        if (!Number.isFinite(timestamp)) throw new MarketSourceError(502, "行情源时间格式无效。");
        return { timestamp, ...bar };
      })
      .filter(
        (bar) => request.beforeTimestamp === undefined || bar.timestamp < request.beforeTimestamp,
      )
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-request.limit);
    return {
      instrumentId: request.instrument.id,
      period: request.period,
      adjustment: request.adjustment,
      barAggregation: "original",
      timezone: "UTC",
      items,
      olderData: "unknown",
    };
  }
}
