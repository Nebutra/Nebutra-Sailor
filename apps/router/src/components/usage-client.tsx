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
} from "@nebutra/ui/primitives";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useCallback, useMemo, useState } from "react";
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {RANGE_OPTIONS.map((option) => {
            const active = option.key === range;
            return (
              <button
                key={option.key}
                type="button"
                aria-pressed={active}
                onClick={() => setParam({ range: option.key })}
                className={[
                  "h-7 rounded-full border px-3 text-[11px] transition-colors",
                  active
                    ? "border-[var(--neutral-8)] bg-[var(--neutral-3)] font-medium"
                    : "border-[var(--neutral-6)] text-[var(--neutral-11)] hover:bg-[var(--neutral-2)]",
                ].join(" ")}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="w-44">
            <Select
              label="模型"
              id="usage-model"
              size="small"
              value={model ?? ALL}
              onValueChange={(value) => setParam({ model: !value || value === ALL ? null : value })}
              options={[
                { value: ALL, label: "全部模型" },
                ...(byModel.resource.data ?? []).map((row) => ({
                  value: row.model,
                  label: row.model,
                })),
              ]}
            />
          </div>
          <div className="w-44">
            <Select
              label="Key"
              id="usage-key"
              size="small"
              value={keyId ?? ALL}
              onValueChange={(value) => setParam({ keyId: !value || value === ALL ? null : value })}
              options={[
                { value: ALL, label: "全部 Key" },
                ...(byKey.resource.data ?? []).map((row) => ({
                  value: row.keyId,
                  label: row.name ?? `${row.keyPrefix ?? row.keyId.slice(0, 8)}（已删除）`,
                })),
              ]}
            />
          </div>
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={refreshAll}>
            刷新
          </Button>
          <Button asChild variant="outline" size="sm" className="h-8">
            <a
              href={usageExportHref({ ...period, model, keyId })}
              download
              className="inline-flex items-center gap-1"
            >
              <Download className="h-3.5 w-3.5" />
              导出 CSV
            </a>
          </Button>
        </div>
      </div>

      <SummaryTiles resource={summary.resource} onRetry={summary.reload} />

      <Panel title="消费趋势" subtitle={granularity === "hour" ? "按小时 · UTC" : "按天 · UTC"}>
        <AsyncSection
          resource={history.resource}
          onRetry={history.reload}
          isEmpty={(data) => data.buckets.every((bucket) => bucket.cost === 0)}
          emptyTitle="这段时间没有产生费用"
          emptyDescription="换个时间范围，或者到快捷使用跑一次请求。"
          skeleton={<Skeleton className="m-3 h-32" />}
        >
          {(data) => <HistoryChart history={data} />}
        </AsyncSection>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="按模型">
          <AsyncSection
            resource={byModel.resource}
            onRetry={byModel.reload}
            isEmpty={(data) => data.length === 0}
            emptyTitle="这段时间没有模型调用"
            skeleton={<SkeletonRows rows={3} columns={4} />}
          >
            {(data) => (
              <Table bare className="w-full text-[12px]">
                <TableHeader>
                  <HeadRow labels={["模型", "请求", "输入 / 输出", "花费"]} />
                </TableHeader>
                <TableBody bordered>
                  {data.map((row) => (
                    <TableRow key={row.model}>
                      <TableCell alignment="start" className="font-mono text-[11px]">
                        {row.model}
                      </TableCell>
                      <TableCell alignment="end" className="tabular-nums">
                        {formatCount(row.requests)}
                      </TableCell>
                      <TableCell alignment="end" className="tabular-nums text-[11px]">
                        {formatTokens(row.promptTokens)} / {formatTokens(row.completionTokens)}
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

        <Panel title="按 Key">
          <AsyncSection
            resource={byKey.resource}
            onRetry={byKey.reload}
            isEmpty={(data) => data.length === 0}
            emptyTitle="这段时间没有 Key 产生花费"
            skeleton={<SkeletonRows rows={3} columns={3} />}
          >
            {(data) => (
              <Table bare className="w-full text-[12px]">
                <TableHeader>
                  <HeadRow labels={["Key", "请求", "花费"]} />
                </TableHeader>
                <TableBody bordered>
                  {data.map((row) => (
                    <TableRow key={row.keyId}>
                      <TableCell alignment="start">
                        {row.name ?? "已删除的 Key"}
                        <span className="ml-2 font-mono text-[10px] text-[var(--neutral-9)]">
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
    <TableRow className="bg-[var(--neutral-2)]/50 text-[11px] text-[var(--neutral-10)]">
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
    <section className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--neutral-6)]">
      <div className="flex items-center gap-2 border-b border-[var(--neutral-6)] bg-[var(--neutral-2)]/40 px-3 py-2">
        <h2 className="text-[12px] font-semibold">{title}</h2>
        {subtitle ? <span className="text-[11px] text-[var(--neutral-10)]">{subtitle}</span> : null}
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
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--neutral-6)]">
      <AsyncSection
        resource={resource}
        onRetry={onRetry}
        skeleton={
          <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
            {["cost", "requests", "tokens", "avg"].map((slot) => (
              <Skeleton key={slot} className="h-12" />
            ))}
          </div>
        }
      >
        {(data) => {
          const average = data.requestCount > 0 ? data.totalCost / data.requestCount : 0;
          return (
            <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
              <Tile label="花费" value={formatMoney(data.totalCost, data.currency)} />
              <Tile label="请求数" value={formatCount(data.requestCount)} />
              <Tile
                label="Token"
                value={formatTokens(data.totalTokens)}
                hint={`入 ${formatTokens(data.promptTokens)} · 出 ${formatTokens(data.completionTokens)}`}
              />
              <Tile
                label="单次均价"
                value={data.requestCount > 0 ? formatAmount(average) : "—"}
                hint={data.requestCount > 0 ? data.currency : "还没有请求"}
              />
            </div>
          );
        }}
      </AsyncSection>
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[var(--radius-md)] bg-[var(--neutral-2)]/50 px-3 py-2">
      <p className="text-[11px] text-[var(--neutral-10)]">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight">{value}</p>
      {hint ? <p className="mt-0.5 text-[10px] text-[var(--neutral-10)]">{hint}</p> : null}
    </div>
  );
}

/**
 * A bar per bucket. Empty buckets are returned as zeros by the API, so a gap in
 * this chart means "nothing was spent", never "we have no data" — which is why
 * the bars are drawn from the full bucket list rather than from the rows that
 * happen to be non-zero.
 */
function HistoryChart({ history }: { history: UsageHistory }) {
  const peak = history.buckets.reduce((max, bucket) => Math.max(max, bucket.cost), 0);
  return (
    <div className="p-3">
      <ul className="flex h-32 items-end gap-[2px]">
        {history.buckets.map((bucket) => {
          const height = peak > 0 ? Math.max(2, Math.round((bucket.cost / peak) * 100)) : 2;
          const label = `${formatBucket(bucket.bucket, history.granularity)} · ${formatAmount(bucket.cost)} · ${formatCount(bucket.requests)} 次`;
          return (
            <li
              key={bucket.bucket}
              className="min-w-[3px] flex-1 rounded-t-[2px] bg-[var(--neutral-8)]"
              style={{ height: `${height}%` }}
              title={label}
              aria-label={label}
            />
          );
        })}
      </ul>
      <div className="mt-1 flex justify-between text-[10px] text-[var(--neutral-10)]">
        <span>{formatBucket(history.buckets[0]?.bucket ?? "", history.granularity)}</span>
        <span>峰值 {formatAmount(peak)}</span>
        <span>
          {formatBucket(
            history.buckets[history.buckets.length - 1]?.bucket ?? "",
            history.granularity,
          )}
        </span>
      </div>
    </div>
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
      setMoreError(describeError(error));
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <Panel title="请求明细" subtitle="按时间倒序 · 每一行都对应一次扣费">
      <AsyncSection
        resource={resource}
        onRetry={reload}
        isEmpty={(data) => data.rows.length === 0}
        emptyTitle="这段时间没有请求"
        emptyDescription="调整筛选条件，或用一把 Key 调用 /v1/chat/completions 试试。"
        skeleton={<SkeletonRows rows={5} columns={6} />}
      >
        {(data) => (
          <>
            <div className="overflow-x-auto">
              <Table bare className="w-full min-w-[860px] text-[12px]">
                <TableHeader>
                  <HeadRow
                    labels={["时间", "模型", "状态", "输入 / 输出", "耗时", "单价", "花费"]}
                  />
                </TableHeader>
                <TableBody bordered>
                  {data.rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell alignment="start" className="whitespace-nowrap text-[11px]">
                        {formatDateTime(row.occurredAt)}
                        {row.requestId ? (
                          <span className="ml-2 font-mono text-[10px] text-[var(--neutral-9)]">
                            {row.requestId.slice(0, 8)}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell alignment="end" className="font-mono text-[11px]">
                        {row.model ?? "—"}
                      </TableCell>
                      <TableCell alignment="end" className="tabular-nums">
                        <StatusPill status={row.status} />
                      </TableCell>
                      <TableCell alignment="end" className="tabular-nums text-[11px]">
                        {formatTokens(row.promptTokens)} / {formatTokens(row.completionTokens)}
                      </TableCell>
                      <TableCell alignment="end" className="tabular-nums text-[11px]">
                        {formatLatency(row.latencyMs)}
                      </TableCell>
                      <TableCell alignment="end" className="tabular-nums text-[11px]">
                        {formatOptionalAmount(row.unitCost)}
                      </TableCell>
                      <TableCell alignment="end" className="tabular-nums font-medium">
                        {formatAmount(row.totalCost)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center gap-2 border-t border-[var(--neutral-6)] px-3 py-2">
              <span className="text-[11px] text-[var(--neutral-10)]">
                已加载 {data.rows.length} 行
              </span>
              {moreError ? (
                <span role="alert" className="text-[11px] text-[var(--status-danger)]">
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
                  {loadingMore ? "加载中…" : "加载更多"}
                </Button>
              ) : (
                <span className="ml-auto text-[11px] text-[var(--neutral-9)]">已经到底了</span>
              )}
            </div>
          </>
        )}
      </AsyncSection>
    </Panel>
  );
}

function StatusPill({ status }: { status: number | null }) {
  if (status === null) return <span className="text-[var(--neutral-9)]">—</span>;
  const ok = status >= 200 && status < 300;
  return (
    <span
      className={[
        "rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
        ok
          ? "bg-[color-mix(in_srgb,var(--status-success)_14%,transparent)] text-[var(--status-success)]"
          : "bg-[color-mix(in_srgb,var(--status-danger)_14%,transparent)] text-[var(--status-danger)]",
      ].join(" ")}
    >
      {status}
    </span>
  );
}
