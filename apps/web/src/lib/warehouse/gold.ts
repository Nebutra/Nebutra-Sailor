import { unstable_cache } from "next/cache";

type GoldMetricsRow = {
  tenant_id: string;
  day: string;
  signups: number | string;
  activations: number | string;
  conversions: number | string;
  revenue: number | string;
  active_users: number | string;
  total_events: number | string;
};

type ClickHouseJsonResponse = {
  data?: GoldMetricsRow[];
};

export interface GrowthSummary {
  tenantId: string;
  day: string | null;
  signups: number;
  activations: number;
  conversions: number;
  revenue: number;
  activeUsers: number;
  totalEvents: number;
}

const DEFAULT_DASHBOARD_TENANT = "demo_org";
const DEFAULT_DATABASE = "nebutra";
const TENANT_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const DATABASE_RE = /^[A-Za-z_][A-Za-z0-9_]{0,62}$/;

function toSafeNumber(value: unknown): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function emptySummary(tenantId: string): GrowthSummary {
  return {
    tenantId,
    day: null,
    signups: 0,
    activations: 0,
    conversions: 0,
    revenue: 0,
    activeUsers: 0,
    totalEvents: 0,
  };
}

function sanitizeTenantId(value: string): string {
  const trimmed = value.trim();
  return TENANT_ID_RE.test(trimmed) ? trimmed : DEFAULT_DASHBOARD_TENANT;
}

function sanitizeDatabaseName(value: string | undefined): string {
  if (!value) return DEFAULT_DATABASE;
  return DATABASE_RE.test(value) ? value : DEFAULT_DATABASE;
}

function buildClickHouseUrl(): URL {
  const url = new URL(process.env.CLICKHOUSE_HTTP_URL || "http://localhost:8123");
  if (process.env.CLICKHOUSE_USER) {
    url.username = process.env.CLICKHOUSE_USER;
  }
  if (process.env.CLICKHOUSE_PASSWORD) {
    url.password = process.env.CLICKHOUSE_PASSWORD;
  }
  return url;
}

function toGrowthSummary(row: GoldMetricsRow): GrowthSummary {
  return {
    tenantId: row.tenant_id,
    day: row.day,
    signups: toSafeNumber(row.signups),
    activations: toSafeNumber(row.activations),
    conversions: toSafeNumber(row.conversions),
    revenue: toSafeNumber(row.revenue),
    activeUsers: toSafeNumber(row.active_users),
    totalEvents: toSafeNumber(row.total_events),
  };
}

async function fetchGrowthSummary(tenantId: string): Promise<GrowthSummary> {
  const database = sanitizeDatabaseName(process.env.CLICKHOUSE_DATABASE);
  const clickhouseUrl = buildClickHouseUrl();
  clickhouseUrl.searchParams.set("param_tenant_id", tenantId);

  const sql = `
SELECT
  tenant_id,
  toString(day) AS day,
  signups,
  activations,
  conversions,
  revenue,
  active_users,
  total_events
FROM ${database}.growth_metrics_daily
WHERE tenant_id = {tenant_id:String}
ORDER BY day DESC
LIMIT 1
FORMAT JSON
`.trim();

  try {
    const response = await fetch(clickhouseUrl, {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: sql,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return emptySummary(tenantId);
    }

    const payload = (await response.json()) as ClickHouseJsonResponse;
    const row = payload.data?.[0];
    return row ? toGrowthSummary(row) : emptySummary(tenantId);
  } catch {
    return emptySummary(tenantId);
  }
}

const getCachedGrowthSummary = unstable_cache(
  async (tenantId: string) => fetchGrowthSummary(tenantId),
  ["growth-summary-v1"],
  {
    revalidate: 60,
    tags: ["growth-summary"],
  },
);

export async function getGrowthSummary(tenantId?: string): Promise<GrowthSummary> {
  const rawTenant =
    tenantId?.trim() || process.env.DEFAULT_DASHBOARD_TENANT_ID || DEFAULT_DASHBOARD_TENANT;

  const resolvedTenant = sanitizeTenantId(rawTenant);
  return getCachedGrowthSummary(resolvedTenant);
}

// ── Time-series (last N days) ─────────────────────────────────────────────────

async function fetchGrowthTimeSeries(tenantId: string, days: number): Promise<GrowthSummary[]> {
  const database = sanitizeDatabaseName(process.env.CLICKHOUSE_DATABASE);
  const clickhouseUrl = buildClickHouseUrl();
  clickhouseUrl.searchParams.set("param_tenant_id", tenantId);

  const sql = `
SELECT
  tenant_id,
  toString(day) AS day,
  signups,
  activations,
  conversions,
  revenue,
  active_users,
  total_events
FROM ${database}.growth_metrics_daily
WHERE tenant_id = {tenant_id:String}
  AND day >= today() - ${days}
ORDER BY day ASC
FORMAT JSON
`.trim();

  try {
    const response = await fetch(clickhouseUrl, {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: sql,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) return [];

    const payload = (await response.json()) as ClickHouseJsonResponse;
    return (payload.data ?? []).map(toGrowthSummary);
  } catch {
    return [];
  }
}

const getCachedGrowthTimeSeries = unstable_cache(
  async (tenantId: string, days: number) => fetchGrowthTimeSeries(tenantId, days),
  ["growth-time-series-v1"],
  { revalidate: 300, tags: ["growth-time-series"] },
);

export async function getGrowthTimeSeries(tenantId?: string, days = 30): Promise<GrowthSummary[]> {
  const rawTenant =
    tenantId?.trim() || process.env.DEFAULT_DASHBOARD_TENANT_ID || DEFAULT_DASHBOARD_TENANT;

  const resolvedTenant = sanitizeTenantId(rawTenant);
  return getCachedGrowthTimeSeries(resolvedTenant, days);
}
