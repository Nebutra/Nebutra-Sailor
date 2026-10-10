"use client";

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
import { useFormatLocale } from "./use-format-locale";

type QueueKey = "email" | "billing" | "ai-tasks" | "webhooks";
type JobStatus = "processing" | "success" | "failed" | "pending";

type JobRow = {
  attempts: string;
  durationMs: number;
  id: string;
  queue: QueueKey;
  status: JobStatus;
};

const QUEUE_PILLS: ReadonlyArray<{ count: number; key: QueueKey; label: string }> = [
  { count: 247, key: "email", label: "email" },
  { count: 89, key: "billing", label: "billing" },
  { count: 14, key: "ai-tasks", label: "ai-tasks" },
  { count: 31, key: "webhooks", label: "webhooks" },
];

const JOB_ROWS: ReadonlyArray<JobRow> = [
  { attempts: "1/3", durationMs: 412, id: "job_9f3a2c", queue: "ai-tasks", status: "processing" },
  { attempts: "1/3", durationMs: 184, id: "job_8c41be", queue: "email", status: "success" },
  { attempts: "1/3", durationMs: 76, id: "job_77d019", queue: "billing", status: "success" },
  { attempts: "3/3", durationMs: 5012, id: "job_6b22f4", queue: "webhooks", status: "failed" },
  { attempts: "2/3", durationMs: 0, id: "job_5a18ee", queue: "email", status: "pending" },
  { attempts: "1/3", durationMs: 221, id: "job_4e0b7c", queue: "billing", status: "success" },
];

const STATUS_DECOR: Record<
  JobStatus,
  {
    badge: "green-subtle" | "red-subtle" | "amber-subtle" | "blue-subtle";
    dot: "QUEUED" | "BUILDING" | "READY" | "ERROR";
  }
> = {
  failed: { badge: "red-subtle", dot: "ERROR" },
  pending: { badge: "amber-subtle", dot: "QUEUED" },
  processing: { badge: "blue-subtle", dot: "BUILDING" },
  success: { badge: "green-subtle", dot: "READY" },
};

type QueueCopy = {
  jobs: Record<string, { relative: string }>;
  statusMeta: Record<JobStatus, string>;
  attempts: string;
  duration: string;
  queue: string;
  status: string;
  throughput: string;
  success: string;
  when: string;
  rate: string;
  latency: string;
  healthy: string;
  last60: string;
  live: string;
};

// "Job" is the literal table-header abbreviation for a job id — same on every locale.
const JOB_LABEL = "Job";

export function QueueShowcase(props: PackageShowcaseProps) {
  const { copy } = props;
  const numLocale = useFormatLocale();
  const t = copy as QueueCopy;

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
            <TableHead>{JOB_LABEL}</TableHead>
            <TableHead>{t.queue}</TableHead>
            <TableHead numeric>{t.attempts}</TableHead>
            <TableHead numeric>{t.duration}</TableHead>
            <TableHead numeric>{t.when}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody bordered>
          {JOB_ROWS.map((row, index) => {
            const decor = STATUS_DECOR[row.status];
            const isActive = row.status === "processing";
            return (
              <TableRow key={row.id} className={isActive ? "bg-muted/50" : undefined}>
                <TableCell>
                  <span className="inline-flex items-center gap-2">
                    <StatusDot state={decor.dot} decorative />
                    <Badge variant={decor.badge} size="sm">
                      {t.statusMeta[row.status]}
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
                  {t.jobs[String(index)].relative}
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
