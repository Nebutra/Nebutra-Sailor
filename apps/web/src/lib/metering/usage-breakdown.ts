import { logger } from "@nebutra/logger";
import {
  AI_TOKENS,
  API_CALLS,
  getMetering,
  type MeterDefinition,
  type PeriodType,
} from "@nebutra/metering";

// Server-side aggregation for the Usage Breakdown section.
//
// Honesty contract: every number here comes back from the configured metering
// provider (ClickHouse in production, in-memory in dev). A dimension that has
// not been recorded yields no group rather than a placeholder group, and a
// backend failure is reported as an error rather than as zero usage.

/** Maximum number of named rows per group before the tail is folded together. */
const MAX_ROWS = 6;

/**
 * Both providers stringify the raw property value, so an event that recorded the
 * dimension as absent/null arrives as one of these literals. They are dropped
 * rather than rendered as a row labelled "null".
 */
const MISSING_DIMENSION_VALUES: ReadonlySet<string> = new Set(["undefined", "null", "NaN"]);

export interface UsageBreakdownRow {
  /** Stable React key. */
  key: string;
  /** Dimension value as recorded on the usage event, or the folded-tail label. */
  label: string;
  /** Aggregated value for this dimension value. */
  value: number;
  /** Share of the group total, 0-100. */
  share: number;
}

export interface UsageBreakdownGroup {
  /** Stable identifier: `<meterId>:<dimension>`. */
  id: string;
  meterId: string;
  meterName: string;
  /** Unit of the underlying meter (tokens, requests, …). */
  unit: string;
  /** Event property the group is aggregated by. */
  dimension: string;
  /** Human-readable name for that property. */
  dimensionLabel: string;
  /** Sum of every row, including the folded tail. */
  total: number;
  rows: UsageBreakdownRow[];
}

export interface UsageBreakdown {
  /** Which metering backend answered — `clickhouse` or `memory`. */
  provider: string;
  period: PeriodType;
  periodStart: string | null;
  periodEnd: string | null;
  /** Only groups that carry recorded usage. Empty for a tenant with zero usage. */
  groups: UsageBreakdownGroup[];
}

export type UsageBreakdownResult =
  | { status: "ok"; breakdown: UsageBreakdown }
  | { status: "error"; message: string };

interface BreakdownDimension {
  key: string;
  label: string;
}

interface BreakdownSpec {
  meter: MeterDefinition;
  dimensions: ReadonlyArray<BreakdownDimension>;
}

/**
 * The meters and dimensions this surface reports on. Each dimension listed here
 * is a property that the ingest paths actually write onto their usage events —
 * `model` / `provider` / `surface` from the AI call sites, `path` / `method`
 * from the API-call middleware.
 */
const BREAKDOWN_SPECS: ReadonlyArray<BreakdownSpec> = [
  {
    meter: AI_TOKENS,
    dimensions: [
      { key: "model", label: "Model" },
      { key: "provider", label: "Provider" },
      { key: "surface", label: "Surface" },
    ],
  },
  {
    meter: API_CALLS,
    dimensions: [
      { key: "path", label: "Endpoint" },
      { key: "method", label: "Method" },
    ],
  },
];

function toRows(raw: Record<string, number>): UsageBreakdownRow[] {
  const entries = Object.entries(raw)
    .filter(
      ([key, value]) =>
        key.length > 0 && !MISSING_DIMENSION_VALUES.has(key) && Number.isFinite(value) && value > 0,
    )
    .sort((left, right) => right[1] - left[1]);

  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  if (total <= 0) {
    return [];
  }

  const named = entries.slice(0, MAX_ROWS).map(([key, value]) => ({
    key,
    label: key,
    value,
    share: (value / total) * 100,
  }));

  const tail = entries.slice(MAX_ROWS);
  if (tail.length === 0) {
    return named;
  }

  const tailValue = tail.reduce((sum, [, value]) => sum + value, 0);
  return [
    ...named,
    {
      key: "__folded_tail__",
      label: `${tail.length} other values`,
      value: tailValue,
      share: (tailValue / total) * 100,
    },
  ];
}

async function loadSpecGroups(
  metering: Awaited<ReturnType<typeof getMetering>>,
  spec: BreakdownSpec,
  tenantId: string,
  period: PeriodType,
): Promise<{
  groups: UsageBreakdownGroup[];
  periodStart: string | null;
  periodEnd: string | null;
}> {
  const summary = await metering.getUsage(tenantId, spec.meter.id, period);

  const periodStart = summary?.periodStart ?? null;
  const periodEnd = summary?.periodEnd ?? null;

  if (!summary || summary.value <= 0) {
    return { groups: [], periodStart, periodEnd };
  }

  const resolved = await Promise.all(
    spec.dimensions.map(async (dimension) => {
      const raw = await metering.getBreakdown(tenantId, spec.meter.id, dimension.key, period);
      const rows = toRows(raw);

      if (rows.length === 0) {
        return null;
      }

      const group: UsageBreakdownGroup = {
        id: `${spec.meter.id}:${dimension.key}`,
        meterId: spec.meter.id,
        meterName: spec.meter.name,
        unit: spec.meter.unit,
        dimension: dimension.key,
        dimensionLabel: dimension.label,
        total: rows.reduce((sum, row) => sum + row.value, 0),
        rows,
      };

      return group;
    }),
  );

  return {
    groups: resolved.filter((group): group is UsageBreakdownGroup => group !== null),
    periodStart,
    periodEnd,
  };
}

/**
 * Aggregate the current period's metered usage for a tenant, grouped by every
 * dimension the ingest paths record.
 *
 * Works against whichever provider `getMetering()` resolves: ClickHouse when
 * `CLICKHOUSE_URL` is configured, otherwise the in-memory provider, which keeps
 * the section functional (and honestly empty) in local development.
 */
export async function loadUsageBreakdown(
  tenantId: string,
  period: PeriodType = "monthly",
): Promise<UsageBreakdownResult> {
  try {
    const metering = await getMetering();

    // Both providers resolve a meter's aggregation from its registered
    // definition and read back empty for an unregistered meter, so the read
    // path declares the meters it reads. Registration is idempotent.
    await Promise.all(BREAKDOWN_SPECS.map((spec) => metering.defineMeter(spec.meter)));

    const results = await Promise.all(
      BREAKDOWN_SPECS.map((spec) => loadSpecGroups(metering, spec, tenantId, period)),
    );

    const groups = results.flatMap((result) => result.groups);
    const periodStart = results.find((result) => result.periodStart)?.periodStart ?? null;
    const periodEnd = results.find((result) => result.periodEnd)?.periodEnd ?? null;

    return {
      status: "ok",
      breakdown: {
        provider: metering.name,
        period,
        periodStart,
        periodEnd,
        groups,
      },
    };
  } catch (error) {
    logger.error("[usage.breakdown] Failed to aggregate metering usage", {
      tenantId,
      period,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      status: "error",
      message: "The metering backend did not return usage for this period.",
    };
  }
}
