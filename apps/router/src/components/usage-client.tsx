"use client";

import { Download } from "@nebutra/icons";
import {
  Button,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  ToggleGroup,
  ToggleGroupItem,
} from "@nebutra/ui/primitives";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { type MouseEvent, type ReactNode, useCallback, useId, useMemo, useState } from "react";
import { AsyncSection, Skeleton, SkeletonRows } from "@/components/console-states";
import {
  consoleApi,
  type UsageByKeyRow,
  type UsageByModelRow,
  type UsageHistory,
  type UsageRecordsPage,
  type UsageSummary,
  usageExportHref,
} from "@/lib/console-api";
import { describeError } from "@/lib/console-client";
import {
  formatAmount,
  formatBucket,
  formatCount,
  formatDateTime,
  formatLatency,
  formatMoney,
  formatOptionalAmount,
  formatTokens,
  granularityFor,
  parseRange,
  RANGE_OPTIONS,
  rangeWindow,
} from "@/lib/console-format";
import { type ConsoleResource, useConsoleResource } from "@/lib/use-console-resource";

/**
 * 用量 — where the money went.
 *
 * Every number on this page comes from `usage_ledger_entries`, the rows the
 * customer is billed from, so the total at the top and the rows at the bottom
 * cannot disagree.
 *
 * The filters live in the URL and nowhere else. Holding them in `useState` as
 * well is what made the catalogue write a stale category back on blur: two
 * copies of one fact, updated from different handlers. Here `useSearchParams`
 * is the only reader and `router.replace` the only writer.
 */

const ALL = "__all__";

export function UsageClient() {
  const t = useTranslations("console.usage");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const range = parseRange(params.get("range"));
  const model = params.get("model");
  const keyId = params.get("keyId");
  const granularity = granularityFor(range);

  // A new window on every render would restart every load; it is pinned to the
  // range and to an explicit refresh instead.
  const [nonce, setNonce] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `nonce` is the refresh trigger — bumping it is how 刷新 re-pins the window
  const period = useMemo(() => {
    const { from, to } = rangeWindow(range);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [range, nonce]);

  const windowKey = `${period.from}|${period.to}`;

  const setParam = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null) next.delete(key);
        else next.set(key, value);
      }
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  const summary = useConsoleResource<UsageSummary>(`summary:${windowKey}`, (signal) =>
    consoleApi.usageSummary(period, signal),
  );
  const history = useConsoleResource<UsageHistory>(
    `history:${windowKey}:${granularity}`,
    (signal) => consoleApi.usageHistory({ ...period, granularity }, signal),
  );
  const byModel = useConsoleResource<UsageByModelRow[]>(`by-model:${windowKey}`, (signal) =>
    consoleApi.usageByModel(period, signal),
  );
  const byKey = useConsoleResource<UsageByKeyRow[]>(`by-key:${windowKey}`, (signal) =>
    consoleApi.usageByKey(period, signal),
  );

  const refreshAll = () => setNonce((value) => value + 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <ToggleGroup
          type="single"
          size="sm"
          aria-label={t("range.label")}
          value={range}
          onValueChange={(value) => {
            if (typeof value === "string" && value) setParam({ range: value });
          }}
        >
          {RANGE_OPTIONS.map((option) => (
            <ToggleGroupItem key={option.key} value={option.key} className="px-2.5 text-xs">
              {t(`range.${option.key}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="w-44">
            <Select
              label={t("filter.model")}
              id="usage-model"
              size="small"
              value={model ?? ALL}
              onValueChange={(value) => setParam({ model: !value || value === ALL ? null : value })}
              options={[
                { value: ALL, label: t("filter.allModels") },
                ...(byModel.resource.data ?? []).map((row) => ({
                  value: row.model,
                  label: row.model,
                })),
              ]}
            />
          </div>
          <div className="w-44">
            <Select
              label={t("filter.key")}
              id="usage-key"
              size="small"
              value={keyId ?? ALL}
              onValueChange={(value) => setParam({ keyId: !value || value === ALL ? null : value })}
              options={[
                { value: ALL, label: t("filter.allKeys") },
                ...(byKey.resource.data ?? []).map((row) => ({
                  value: row.keyId,
                  label:
                    row.name ??
                    t("filter.deletedKey", { label: row.keyPrefix ?? row.keyId.slice(0, 8) }),
                })),
              ]}
            />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={refreshAll}>
            {t("refresh")}
          </Button>
          <Button asChild variant="outline" size="sm">
            <a
              href={usageExportHref({ ...period, model, keyId })}
              download
              className="inline-flex items-center gap-1"
            >
              <Download aria-hidden className="size-4" />
              {t("export")}
            </a>
          </Button>
        </div>
      </div>

      <SummaryTiles resource={summary.resource} onRetry={summary.reload} />

      <Panel
        title={t("trend.title")}
        subtitle={granularity === "hour" ? t("trend.hourly") : t("trend.daily")}
      >
        <AsyncSection
          resource={history.resource}
          onRetry={history.reload}
          skeleton={<Skeleton className="m-4 h-48" />}
        >
          {(data) => <HistoryChart history={data} />}
        </AsyncSection>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={t("byModel.title")}>
          <AsyncSection
            resource={byModel.resource}
            onRetry={byModel.reload}
            skeleton={<SkeletonRows rows={3} columns={3} />}
          >
            {(data) => <ModelShare rows={data} />}
          </AsyncSection>
        </Panel>

        <Panel title={t("byKey.title")}>
          <AsyncSection
            resource={byKey.resource}
            onRetry={byKey.reload}
            isEmpty={(data) => data.length === 0}
            emptyTitle={t("byKey.emptyTitle")}
            skeleton={<SkeletonRows rows={3} columns={3} />}
          >
            {(data) => (
              <Table bare className="w-full text-xs">
                <TableHeader>
                  <HeadRow labels={[t("col.key"), t("col.requests"), t("col.cost")]} />
                </TableHeader>
                <TableBody bordered>
                  {data.map((row) => (
                    <TableRow key={row.keyId}>
                      <TableCell alignment="start">
                        {row.name ?? t("byKey.deleted")}
                        <span className="ml-2 font-mono text-xs text-muted-foreground">
                          {row.keyPrefix ? `${row.keyPrefix}…` : row.keyId.slice(0, 8)}
                        </span>
                      </TableCell>
                      <TableCell alignment="end" className="tabular-nums">
                        {formatCount(row.requests)}
                      </TableCell>
                      <TableCell alignment="end" className="tabular-nums font-medium">
                        {formatAmount(row.cost)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </AsyncSection>
        </Panel>
      </div>

      <RecordsPanel period={period} model={model} keyId={keyId} />
    </div>
  );
}

function HeadRow({ labels }: { labels: readonly string[] }) {
  return (
    <TableRow className="bg-neutral-2/50 text-xs text-muted-foreground">
      {labels.map((label, index) => (
        <TableHead
          key={label}
          alignment={index === 0 ? "start" : "end"}
          className="font-medium whitespace-nowrap"
        >
          {label}
        </TableHead>
      ))}
    </TableRow>
  );
}

function Panel({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[var(--radius-xl)] border border-border bg-card shadow-glass-sm">
      <div className="flex h-11 items-center gap-2 border-b border-border px-4">
        <h2 className="text-sm">{title}</h2>
        {subtitle ? <span className="text-xs text-muted-foreground">{subtitle}</span> : null}
        {actions ? <div className="ml-auto">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function SummaryTiles({
  resource,
  onRetry,
}: {
  resource: ConsoleResource<UsageSummary>;
  onRetry: () => void;
}) {
  const t = useTranslations("console.usage.tiles");
  return (
    <div>
      <AsyncSection
        resource={resource}
        onRetry={onRetry}
        skeleton={
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {["cost", "requests", "tokens", "avg"].map((slot) => (
              <Skeleton key={slot} className="h-[5.25rem]" />
            ))}
          </div>
        }
      >
        {(data) => {
          const average = data.requestCount > 0 ? data.totalCost / data.requestCount : 0;
          return (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Tile label={t("cost")} value={formatMoney(data.totalCost, data.currency)} />
              <Tile label={t("requests")} value={formatCount(data.requestCount)} />
              <Tile
                label={t("tokens")}
                value={formatTokens(data.totalTokens)}
                hint={t("tokensHint", {
                  input: formatTokens(data.promptTokens),
                  output: formatTokens(data.completionTokens),
                })}
              />
              <Tile
                label={t("average")}
                value={data.requestCount > 0 ? formatAmount(average) : null}
                hint={data.requestCount > 0 ? data.currency : t("averageEmpty")}
              />
            </div>
          );
        }}
      </AsyncSection>
    </div>
  );
}

/** A metric tile. A value that cannot exist yet (no requests → no average) is omitted, not dashed. */
function Tile({ label, value, hint }: { label: string; value: string | null; hint?: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      {value !== null ? <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p> : null}
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Axis labels carry only the precision the scale needs: 0.25, not 0.2500. */
function formatTick(value: number, ceiling: number): string {
  if (value === 0) return "0";
  const digits = ceiling >= 10 ? 0 : ceiling >= 1 ? 1 : ceiling >= 0.1 ? 2 : 4;
  return value.toFixed(digits);
}

/** Three gridlines at round fractions of a "nice" ceiling above the peak. */
function niceCeiling(peak: number): number {
  if (peak <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(peak));
  for (const step of [1, 2, 2.5, 5, 10]) if (peak <= step * exp) return step * exp;
  return 10 * exp;
}

/**
 * Spend per bucket. Empty buckets come back from the API as zeros, so a gap
 * means "nothing was spent", never "no data" — the bars are drawn from the full
 * bucket list. Hovering a bar reads it out in the header line; each bar carries
 * the same reading as its accessible name.
 *
 * With no spend at all the chart keeps its frame as a ghost: the axis and a
 * faint baseline stay, so the page has the same shape before the first call as
 * after it, and the empty message sits where the bars will be.
 */
function HistoryChart({ history }: { history: UsageHistory }) {
  const t = useTranslations("console.usage.trend");
  const gradientId = useId();
  const [active, setActive] = useState<number | null>(null);
  const buckets = history.buckets;
  const peak = buckets.reduce((max, bucket) => Math.max(max, bucket.cost), 0);
  const empty = peak === 0;
  const ceiling = niceCeiling(peak);
  const total = buckets.reduce((sum, bucket) => sum + bucket.cost, 0);
  const focus = active !== null ? buckets[active] : undefined;
  const ticks = [1, 0.5, 0];
  const first = buckets[0]?.bucket ?? "";
  const last = buckets[buckets.length - 1]?.bucket ?? "";

  // Plot in a 0..100 box; the SVG stretches to the frame.
  const n = Math.max(buckets.length - 1, 1);
  const x = (i: number) => (i / n) * 100;
  const y = (cost: number) => 100 - (cost / ceiling) * 100;
  const line = buckets.map((b, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(b.cost)}`).join(" ");
  const area = `${line} L100,100 L0,100 Z`;

  const onMove = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    setActive(Math.max(0, Math.min(buckets.length - 1, Math.round(ratio * n))));
  };

  return (
    <div className="px-4 pt-4 pb-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-2xl tabular-nums">
          {formatAmount(focus ? focus.cost : total)}
          <span className="ml-1.5 text-xs text-muted-foreground">USD</span>
        </p>
        <p className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
          {focus
            ? t("readout", {
                bucket: formatBucket(focus.bucket, history.granularity),
                amount: formatAmount(focus.cost),
                count: Math.round(focus.requests),
              })
            : t("windowTotal")}
        </p>
      </div>
      <div className="relative mt-4 flex h-52 gap-3">
        <div
          aria-hidden
          className="flex w-10 shrink-0 flex-col justify-between text-right text-xs text-muted-foreground tabular-nums"
        >
          {ticks.map((tick) => (
            <span key={tick} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
              {empty ? "" : formatTick(ceiling * tick, ceiling)}
            </span>
          ))}
        </div>
        <div
          className="relative min-w-0 flex-1"
          onMouseMove={empty ? undefined : onMove}
          onMouseLeave={() => setActive(null)}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex flex-col justify-between"
          >
            {ticks.map((tick) => (
              <span
                key={tick}
                className={
                  tick === 0 ? "border-t border-border" : "border-t border-dashed border-border/70"
                }
              />
            ))}
          </div>
          {empty ? (
            <>
              {/* Ghost: the shape of a chart, so the page reads the same before the first call. */}
              <svg
                aria-hidden
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full text-muted-foreground opacity-15"
              >
                <path
                  d="M0,80 C15,70 25,74 38,60 S60,52 72,44 S90,40 100,30 L100,100 L0,100 Z"
                  fill="currentColor"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <p className="text-sm font-medium">{t("emptyTitle")}</p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  {t("emptyDescription")}
                </p>
              </div>
            </>
          ) : (
            <>
              <svg
                role="img"
                aria-label={t("chartLabel", { amount: formatAmount(total) })}
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full overflow-visible"
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--ring))" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="hsl(var(--ring))" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={area} fill={`url(#${gradientId})`} />
                <path
                  d={line}
                  fill="none"
                  stroke="hsl(var(--ring))"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                  strokeLinejoin="round"
                />
              </svg>
              {focus && active !== null ? (
                <>
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 border-l border-foreground/30"
                    style={{ left: `${x(active)}%` }}
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-ring shadow-sm"
                    style={{ left: `${x(active)}%`, top: `${y(focus.cost)}%` }}
                  />
                </>
              ) : null}
              <table className="sr-only">
                <caption>{t("title")}</caption>
                <tbody>
                  {buckets.map((bucket) => (
                    <tr key={bucket.bucket}>
                      <th scope="row">{formatBucket(bucket.bucket, history.granularity)}</th>
                      <td>{formatAmount(bucket.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
      <div className="mt-2 flex justify-between pl-13 text-xs text-muted-foreground tabular-nums">
        <span>{formatBucket(first, history.granularity)}</span>
        <span>{formatBucket(last, history.granularity)}</span>
      </div>
    </div>
  );
}

/**
 * Where the money went, by model: one bar per model scaled to the largest
 * spender, with cost, share and requests. Empty keeps the panel's shape.
 */
function ModelShare({ rows }: { rows: readonly UsageByModelRow[] }) {
  const t = useTranslations("console.usage");
  if (rows.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center px-4 text-center">
        <p className="text-sm font-medium">{t("byModel.emptyTitle")}</p>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          {t("byModel.emptyDescription")}
        </p>
      </div>
    );
  }
  const sorted = [...rows].sort((a, b) => b.cost - a.cost);
  const max = sorted[0]?.cost ?? 0;
  const total = sorted.reduce((sum, row) => sum + row.cost, 0);
  return (
    <ul className="divide-y divide-border">
      {sorted.map((row) => {
        const share = total > 0 ? row.cost / total : 0;
        return (
          <li key={row.model} className="px-4 py-3">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-mono">{row.model}</span>
              <span className="shrink-0 font-mono tabular-nums">{formatAmount(row.cost)}</span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-ring"
                  style={{ width: `${max > 0 ? (row.cost / max) * 100 : 0}%` }}
                />
              </span>
              <span className="w-28 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                {t("byModel.share", {
                  share: Math.round(share * 100),
                  count: formatCount(row.requests),
                })}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function RecordsPanel({
  period,
  model,
  keyId,
}: {
  period: { from: string; to: string };
  model: string | null;
  keyId: string | null;
}) {
  const t = useTranslations("console.usage");
  const tErrors = useTranslations("console.errors");
  const query = { ...period, model, keyId, limit: 50 };
  const { resource, reload, set } = useConsoleResource<UsageRecordsPage>(
    `records:${period.from}|${period.to}|${model ?? ""}|${keyId ?? ""}`,
    (signal) => consoleApi.usageRecords(query, signal),
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);

  const loadMore = async () => {
    const page = resource.data;
    if (!page?.nextCursor) return;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const next = await consoleApi.usageRecords({ ...query, cursor: page.nextCursor });
      set({ rows: [...page.rows, ...next.rows], nextCursor: next.nextCursor });
    } catch (error) {
      setMoreError(describeError(error, tErrors));
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <Panel title={t("records.title")} subtitle={t("records.subtitle")}>
      <AsyncSection
        resource={resource}
        onRetry={reload}
        isEmpty={(data) => data.rows.length === 0}
        emptyTitle={t("records.emptyTitle")}
        emptyDescription={t("records.emptyDescription")}
        skeleton={<SkeletonRows rows={5} columns={6} />}
      >
        {(data) => (
          <>
            <div className="overflow-x-auto">
              <Table bare className="w-full min-w-[860px] text-xs">
                <TableHeader>
                  <HeadRow
                    labels={[
                      t("col.time"),
                      t("col.model"),
                      t("col.status"),
                      t("col.tokens"),
                      t("col.latency"),
                      t("col.unitCost"),
                      t("col.cost"),
                    ]}
                  />
                </TableHeader>
                <TableBody bordered>
                  {data.rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell alignment="start" className="whitespace-nowrap text-xs">
                        {formatDateTime(row.occurredAt)}
                        {row.requestId ? (
                          <span className="ml-2 font-mono text-xs text-muted-foreground">
                            {row.requestId.slice(0, 8)}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell alignment="end" className="font-mono text-xs">
                        {row.model ?? <Blank />}
                      </TableCell>
                      <TableCell alignment="end" className="tabular-nums">
                        <StatusPill status={row.status} />
                      </TableCell>
                      <TableCell alignment="end" className="tabular-nums text-xs">
                        {formatTokens(row.promptTokens)} / {formatTokens(row.completionTokens)}
                      </TableCell>
                      <TableCell alignment="end" className="tabular-nums text-xs">
                        {row.latencyMs === null ? <Blank /> : formatLatency(row.latencyMs)}
                      </TableCell>
                      <TableCell alignment="end" className="tabular-nums text-xs">
                        {row.unitCost === null ? <Blank /> : formatOptionalAmount(row.unitCost)}
                      </TableCell>
                      <TableCell alignment="end" className="tabular-nums font-medium">
                        {formatAmount(row.totalCost)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center gap-2 border-t border-neutral-6 px-3 py-2">
              <span className="text-xs text-muted-foreground">
                {t("records.loaded", { count: data.rows.length })}
              </span>
              {moreError ? (
                <span role="alert" className="text-xs text-destructive-strong">
                  {moreError}
                </span>
              ) : null}
              {data.nextCursor ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="ml-auto h-7"
                  disabled={loadingMore}
                  onClick={() => void loadMore()}
                >
                  {loadingMore ? t("records.loading") : t("records.more")}
                </Button>
              ) : (
                <span className="ml-auto text-xs text-muted-foreground">{t("records.end")}</span>
              )}
            </div>
          </>
        )}
      </AsyncSection>
    </Panel>
  );
}

/** An unrecorded value: an empty cell for the eye, a word for a screen reader — never a dash. */
function Blank() {
  const t = useTranslations("console.usage");
  return <span className="sr-only">{t("notRecorded")}</span>;
}

function StatusPill({ status }: { status: number | null }) {
  if (status === null) return <Blank />;
  const ok = status >= 200 && status < 300;
  return (
    <span
      className={[
        "rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums",
        ok ? "bg-success/14 text-success-strong" : "bg-destructive/14 text-destructive-strong",
      ].join(" ")}
    >
      {status}
    </span>
  );
}
