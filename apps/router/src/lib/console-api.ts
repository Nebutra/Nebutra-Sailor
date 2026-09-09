/**
 * Typed calls onto `/api/console/v1/*`.
 *
 * One decoder per endpoint, written against the shapes the route handlers
 * actually return (see the JSDoc on each `route.ts`). The decoders are pure and
 * total: an absent or wrong-typed field becomes its zero value rather than
 * `undefined` reaching a `.toFixed()`. That is the point — the console renders
 * money, and a blank cell is a better answer than a crash, while a *wrong*
 * number is worse than either, so nothing is invented: `null` stays `null` and
 * the UI prints "—".
 */

import {
  consoleFetch,
  type Decoder,
  decodeNothing,
  queryString,
  readArray,
  readBoolean,
  readNumber,
  readOptionalNumber,
  readOptionalString,
  readRecord,
  readString,
} from "@/lib/console-client";

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

export interface UsageWindow {
  from: string;
  to: string;
}

export interface UsageSummary {
  window: UsageWindow;
  totalCost: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  requestCount: number;
  currency: string;
}

export interface UsageByModelRow {
  model: string;
  cost: number;
  requests: number;
  promptTokens: number;
  completionTokens: number;
}

export interface UsageByKeyRow {
  keyId: string;
  name: string | null;
  keyPrefix: string | null;
  cost: number;
  requests: number;
}

export interface UsageBucket {
  bucket: string;
  cost: number;
  requests: number;
  tokens: number;
}

export interface UsageHistory {
  window: UsageWindow;
  granularity: "hour" | "day";
  buckets: UsageBucket[];
}

export interface UsageRecord {
  id: string;
  occurredAt: string;
  model: string | null;
  keyId: string | null;
  requestId: string | null;
  promptTokens: number;
  completionTokens: number;
  cachedPromptTokens: number;
  cacheWriteTokens: number;
  latencyMs: number | null;
  status: number | null;
  unitCost: number | null;
  totalCost: number;
  currency: string;
}

export interface UsageRecordsPage {
  rows: UsageRecord[];
  nextCursor: string | null;
}

export type ApiKeyStatus = "active" | "disabled" | "expired" | "revoked";

export interface ApiKeyRow {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  status: ApiKeyStatus;
  rateLimitRps: number;
  saveLogs: boolean;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  limits: { total: number | null; daily: number | null };
  cost: { daily: number; total: number };
}

export interface IssuedApiKey extends ApiKeyRow {
  fullKey: string;
}

export interface WalletBalance {
  balance: number;
  currency: string;
}

// ---------------------------------------------------------------------------
// Decoders
// ---------------------------------------------------------------------------

function decodeWindow(value: unknown): UsageWindow {
  const raw = readRecord(value);
  return { from: readString(raw.from), to: readString(raw.to) };
}

export const decodeUsageSummary: Decoder<UsageSummary> = (value) => {
  const raw = readRecord(value);
  return {
    window: decodeWindow(raw.window),
    totalCost: readNumber(raw.totalCost),
    totalTokens: readNumber(raw.totalTokens),
    promptTokens: readNumber(raw.promptTokens),
    completionTokens: readNumber(raw.completionTokens),
    requestCount: readNumber(raw.requestCount),
    currency: readString(raw.currency, "USD"),
  };
};

export const decodeUsageByModel: Decoder<UsageByModelRow[]> = (value) =>
  readArray(readRecord(value).rows).map((entry) => {
    const raw = readRecord(entry);
    return {
      model: readString(raw.model, "unknown"),
      cost: readNumber(raw.cost),
      requests: readNumber(raw.requests),
      promptTokens: readNumber(raw.promptTokens),
      completionTokens: readNumber(raw.completionTokens),
    };
  });

export const decodeUsageByKey: Decoder<UsageByKeyRow[]> = (value) =>
  readArray(readRecord(value).rows).map((entry) => {
    const raw = readRecord(entry);
    return {
      keyId: readString(raw.keyId),
      name: readOptionalString(raw.name),
      keyPrefix: readOptionalString(raw.keyPrefix),
      cost: readNumber(raw.cost),
      requests: readNumber(raw.requests),
    };
  });

export const decodeUsageHistory: Decoder<UsageHistory> = (value) => {
  const raw = readRecord(value);
  return {
    window: decodeWindow(raw.window),
    granularity: readString(raw.granularity, "day") === "hour" ? "hour" : "day",
    buckets: readArray(raw.buckets).map((entry) => {
      const bucket = readRecord(entry);
      return {
        bucket: readString(bucket.bucket),
        cost: readNumber(bucket.cost),
        requests: readNumber(bucket.requests),
        tokens: readNumber(bucket.tokens),
      };
    }),
  };
};

export const decodeUsageRecords: Decoder<UsageRecordsPage> = (value) => {
  const raw = readRecord(value);
  return {
    rows: readArray(raw.rows).map((entry) => {
      const row = readRecord(entry);
      return {
        id: readString(row.id),
        occurredAt: readString(row.occurredAt),
        model: readOptionalString(row.model),
        keyId: readOptionalString(row.keyId),
        requestId: readOptionalString(row.requestId),
        promptTokens: readNumber(row.promptTokens),
        completionTokens: readNumber(row.completionTokens),
        cachedPromptTokens: readNumber(row.cachedPromptTokens),
        cacheWriteTokens: readNumber(row.cacheWriteTokens),
        latencyMs: readOptionalNumber(row.latencyMs),
        status: readOptionalNumber(row.status),
        unitCost: readOptionalNumber(row.unitCost),
        totalCost: readNumber(row.totalCost),
        currency: readString(row.currency, "USD"),
      };
    }),
    nextCursor: readOptionalString(raw.nextCursor),
  };
};

const KEY_STATUSES: readonly ApiKeyStatus[] = ["active", "disabled", "expired", "revoked"];

function decodeStatus(value: unknown): ApiKeyStatus {
  const raw = readString(value, "active");
  return KEY_STATUSES.find((candidate) => candidate === raw) ?? "active";
}

function decodeKeyRow(value: unknown): ApiKeyRow {
  const raw = readRecord(value);
  const limits = readRecord(raw.limits);
  const cost = readRecord(raw.cost);
  return {
    id: readString(raw.id),
    name: readString(raw.name, "default"),
    keyPrefix: readString(raw.keyPrefix),
    scopes: readArray(raw.scopes).map((scope) => readString(scope)),
    status: decodeStatus(raw.status),
    rateLimitRps: readNumber(raw.rateLimitRps),
    saveLogs: readBoolean(raw.saveLogs),
    createdAt: readString(raw.createdAt),
    lastUsedAt: readOptionalString(raw.lastUsedAt),
    expiresAt: readOptionalString(raw.expiresAt),
    limits: { total: readOptionalNumber(limits.total), daily: readOptionalNumber(limits.daily) },
    cost: { daily: readNumber(cost.daily), total: readNumber(cost.total) },
  };
}

export const decodeKeyList: Decoder<ApiKeyRow[]> = (value) =>
  readArray(readRecord(value).keys).map(decodeKeyRow);

export const decodeIssuedKey: Decoder<IssuedApiKey> = (value) => ({
  ...decodeKeyRow(value),
  fullKey: readString(readRecord(value).fullKey),
});

export const decodeKeyRowResponse: Decoder<ApiKeyRow> = decodeKeyRow;

export const decodeWallet: Decoder<WalletBalance> = (value) => {
  const raw = readRecord(value);
  return { balance: readNumber(raw.balance), currency: readString(raw.currency, "USD") };
};

// ---------------------------------------------------------------------------
// Calls
// ---------------------------------------------------------------------------

const BASE = "/api/console/v1";

export interface UsageQuery {
  from?: string;
  to?: string;
  model?: string | null;
  keyId?: string | null;
  granularity?: "hour" | "day";
  cursor?: string | null;
  limit?: number;
}

function usagePath(endpoint: string, query: UsageQuery): string {
  return `${BASE}/usage/${endpoint}${queryString({
    from: query.from,
    to: query.to,
    model: query.model,
    keyId: query.keyId,
    granularity: query.granularity,
    cursor: query.cursor,
    limit: query.limit,
  })}`;
}

/** The CSV export is a browser download, so it is a URL rather than a fetch. */
export function usageExportHref(query: UsageQuery): string {
  return usagePath("export", query);
}

export const consoleApi = {
  usageSummary: (query: UsageQuery, signal?: AbortSignal | undefined) =>
    consoleFetch({ path: usagePath("summary", query), decode: decodeUsageSummary, signal }),

  usageByModel: (query: UsageQuery, signal?: AbortSignal | undefined) =>
    consoleFetch({ path: usagePath("by-model", query), decode: decodeUsageByModel, signal }),

  usageByKey: (query: UsageQuery, signal?: AbortSignal | undefined) =>
    consoleFetch({ path: usagePath("by-key", query), decode: decodeUsageByKey, signal }),

  usageHistory: (query: UsageQuery, signal?: AbortSignal | undefined) =>
    consoleFetch({ path: usagePath("history", query), decode: decodeUsageHistory, signal }),

  usageRecords: (query: UsageQuery, signal?: AbortSignal | undefined) =>
    consoleFetch({ path: usagePath("records", query), decode: decodeUsageRecords, signal }),

  listKeys: (signal?: AbortSignal | undefined) =>
    consoleFetch({ path: `${BASE}/keys`, decode: decodeKeyList, signal }),

  createKey: (
    body: {
      name: string;
      rateLimitRps?: number;
      saveLogs?: boolean;
      limits?: { total?: number | null; daily?: number | null };
      expiresIn?: number;
    },
    signal?: AbortSignal | undefined,
  ) =>
    consoleFetch({ path: `${BASE}/keys`, method: "POST", body, decode: decodeIssuedKey, signal }),

  patchKey: (
    id: string,
    body: {
      name?: string;
      rateLimitRps?: number;
      saveLogs?: boolean;
      disabled?: boolean;
      expiresAt?: string | null;
      limits?: { total?: number | null; daily?: number | null };
    },
    signal?: AbortSignal | undefined,
  ) =>
    consoleFetch({
      path: `${BASE}/keys/${encodeURIComponent(id)}`,
      method: "PATCH",
      body,
      decode: decodeKeyRowResponse,
      signal,
    }),

  revokeKey: (id: string, signal?: AbortSignal | undefined) =>
    consoleFetch({
      path: `${BASE}/keys/${encodeURIComponent(id)}`,
      method: "DELETE",
      decode: decodeNothing,
      signal,
    }),

  wallet: (signal?: AbortSignal | undefined) =>
    consoleFetch({ path: `${BASE}/wallet`, decode: decodeWallet, signal }),

  topUp: (amount: number, signal?: AbortSignal | undefined) =>
    consoleFetch({
      path: `${BASE}/wallet/topup`,
      method: "POST",
      body: { amount },
      decode: decodeNothing,
      signal,
    }),
};
