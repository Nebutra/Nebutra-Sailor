import { isZhUiLocale } from "@/lib/i18n/localized";

("use client");

import { Check, Clock, Connection, Lightning, RefreshClockwise } from "@nebutra/icons";
import {
  Badge,
  MetricCard,
  StatusDot,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@nebutra/ui/primitives";
import { ShowcaseFrame } from "./showcase-frame";
import type { PackageShowcaseProps } from "./types";

type QueueKey = "email" | "billing" | "ai-tasks" | "webhooks";
type JobStatus = "processing" | "success" | "failed" | "pending";

type JobRow = {
  attempts: string;
  durationMs: number;
  id: string;
  queue: QueueKey;
  relative: { en: string; zh: string };
  status: JobStatus;
};

const QUEUE_PILLS: ReadonlyArray<{ count: number; key: QueueKey; label: string }> = [
  { count: 247, key: "email", label: "email" },
  { count: 89, key: "billing", label: "billing" },
  { count: 14, key: "ai-tasks", label: "ai-tasks" },
  { count: 31, key: "webhooks", label: "webhooks" },
];

const JOB_ROWS: ReadonlyArray<JobRow> = [
  {
    attempts: "1/3",
    durationMs: 412,
    id: "job_9f3a2c",
    queue: "ai-tasks",
    relative: { en: "now", zh: "刚刚" },
    status: "processing",
  },
  {
    attempts: "1/3",
    durationMs: 184,
    id: "job_8c41be",
    queue: "email",
    relative: { en: "12s ago", zh: "12 秒前" },
    status: "success",
  },
  {
    attempts: "1/3",
    durationMs: 76,
    id: "job_77d019",
    queue: "billing",
    relative: { en: "48s ago", zh: "48 秒前" },
    status: "success",
  },
  {
    attempts: "3/3",
    durationMs: 5012,
    id: "job_6b22f4",
    queue: "webhooks",
    relative: { en: "1m ago", zh: "1 分钟前" },
    status: "failed",
  },
  {
    attempts: "2/3",
    durationMs: 0,
    id: "job_5a18ee",
    queue: "email",
    relative: { en: "2m ago", zh: "2 分钟前" },
    status: "pending",
  },
  {
    attempts: "1/3",
    durationMs: 221,
    id: "job_4e0b7c",
    queue: "billing",
    relative: { en: "3m ago", zh: "3 分钟前" },
    status: "success",
  },
];

const STATUS_META: Record<
  JobStatus,
  {
    badge: "green-subtle" | "red-subtle" | "amber-subtle" | "blue-subtle";
    dot: "QUEUED" | "BUILDING" | "READY" | "ERROR";
    en: string;
    zh: string;
  }
> = {
  failed: { badge: "red-subtle", dot: "ERROR", en: "Failed", zh: "失败" },
  pending: { badge: "amber-subtle", dot: "QUEUED", en: "Pending", zh: "等待中" },
  processing: { badge: "blue-subtle", dot: "BUILDING", en: "Processing", zh: "执行中" },
  success: { badge: "green-subtle", dot: "READY", en: "Success", zh: "成功" },
};

export function QueueShowcase(props: PackageShowcaseProps) {
  const { locale } = props;
  const isZh = isZhUiLocale(locale);
  const numLocale = isZh ? "zh-CN" : "en-US";
  const t = {
    attempts: isZh ? "重试" : "Attempts",
    duration: isZh ? "耗时" : "Duration",
    job: "Job",
    queue: isZh ? "队列" : "Queue",
    status: isZh ? "状态" : "Status",
    throughput: isZh ? "吞吐量" : "Throughput",
    success: isZh ? "成功率" : "Success rate",
    when: isZh ? "时间" : "When",
    rate: isZh ? "条/分钟" : "jobs/min",
    latency: isZh ? "平均延迟" : "Avg latency",
    healthy: isZh ? "运行正常" : "Healthy",
    last60: isZh ? "过去 60 分钟" : "Last 60 min",
    live: isZh ? "实时刷新 · QStash / BullMQ" : "Live · QStash / BullMQ",
  };

  return (
    <ShowcaseFrame className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <Connection className="size-4 text-muted-foreground" aria-hidden="true" />
        {QUEUE_PILLS.map((pill) => {
          const isActive = pill.key === "email";
          return (
            <span
              key={pill.key}
              aria-pressed={isActive}
              className={`inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-medium ${
                isActive ? "bg-foreground text-background" : "bg-background text-muted-foreground"
              }`}
            >
              <span>{pill.label}</span>
              <span
                className={`tabular-nums ${isActive ? "text-background/70" : "text-muted-foreground/70"}`}
              >
                {pill.count.toLocaleString(numLocale)}
              </span>
            </span>
          );
        })}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t.status}</TableHead>
            <TableHead>{t.job}</TableHead>
            <TableHead>{t.queue}</TableHead>
            <TableHead numeric>{t.attempts}</TableHead>
            <TableHead numeric>{t.duration}</TableHead>
            <TableHead numeric>{t.when}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody bordered>
          {JOB_ROWS.map((row) => {
            const meta = STATUS_META[row.status];
            const isActive = row.status === "processing";
            return (
              <TableRow key={row.id} className={isActive ? "bg-muted/50" : undefined}>
                <TableCell>
                  <span className="inline-flex items-center gap-2">
                    <StatusDot state={meta.dot} decorative />
                    <Badge variant={meta.badge} size="sm">
                      {isZh ? meta.zh : meta.en}
                    </Badge>
                  </span>
                </TableCell>
                <TableCell className="font-mono text-xs text-foreground">{row.id}</TableCell>
                <TableCell>
                  <Badge variant="gray-subtle" size="sm">
                    {row.queue}
                  </Badge>
                </TableCell>
                <TableCell numeric className="text-xs text-muted-foreground">
                  {row.attempts}
                </TableCell>
                <TableCell numeric className="text-xs text-muted-foreground">
                  {row.durationMs === 0 ? "—" : `${row.durationMs.toLocaleString(numLocale)} ms`}
                </TableCell>
                <TableCell numeric className="text-xs text-muted-foreground">
                  {isZh ? row.relative.zh : row.relative.en}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <div className="grid grid-cols-2 gap-4 rounded-[var(--radius-xl)] border border-border bg-card p-4 sm:grid-cols-3">
        <MetricCard
          size="sm"
          label={t.throughput}
          value="1,247"
          description={t.rate}
          icon={<Lightning aria-hidden="true" />}
          trend="up"
          trendValue="+8.2%"
        />
        <MetricCard
          size="sm"
          label={t.success}
          value="99.4%"
          description={t.last60}
          icon={<Check aria-hidden="true" />}
          trend="up"
          trendValue="+0.3%"
        />
        <MetricCard
          size="sm"
          label={t.latency}
          value="184 ms"
          description={t.healthy}
          icon={<Clock aria-hidden="true" />}
          trend="neutral"
        />
        <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:col-span-3 sm:inline-flex">
          <RefreshClockwise className="size-3" aria-hidden="true" />
          {t.live}
        </span>
      </div>
    </ShowcaseFrame>
  );
}
