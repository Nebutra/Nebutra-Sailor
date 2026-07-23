"use client";

import { ArrowRight, Bell, Check, Connection, Database, Envelope, Lightning } from "@nebutra/icons";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  MagicCard,
  MetricCard,
  MetricGrid,
  Progress,
  StatusDot,
} from "@nebutra/ui/primitives";
import { ShowcaseFrame } from "./showcase-frame";
import type { PackageShowcaseProps } from "./types";

// ---------------------------------------------------------------------------
// Per-slug provider variation. Deterministic — same slug always picks the same
// providers/metrics. Distinct slugs ("email" vs "sms") look visibly different.
// ---------------------------------------------------------------------------

const PROVIDERS_FOR_SLUG: Record<string, string[]> = {
  email: ["Resend", "SES", "Postmark", "SMTP"],
  uploads: ["S3", "R2", "Tigris", "Tus"],
  storage: ["S3", "R2", "GCS", "Filebase"],
  notifications: ["Novu", "Knock", "Direct"],
  collab: ["Liveblocks", "Yjs", "Custom"],
  "event-bus": ["NATS", "Kafka", "Inngest"],
  sms: ["Twilio", "AWS SNS", "Vonage"],
};

const DEFAULT_PROVIDERS = ["Adapter A", "Adapter B", "Adapter C"];

function seeded(slug: string, max: number, offset = 0): number {
  let hash = offset;
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % Math.max(max, 1);
}

const PAYLOAD_BY_SLUG: Record<string, string> = {
  email: 'to: "user@example.com", subject: "Welcome"',
  uploads: 'key: "demo.mp4", size: 18432000',
  storage: 'bucket: "assets", key: "logo.svg"',
  notifications: 'user: "usr_8c41", type: "invoice.paid"',
  collab: 'room: "doc_4521", op: "patch"',
  "event-bus": 'topic: "orders.created", v: 1',
  sms: 'to: "+1 415 555 0142", body: "OTP 4821"',
};

const COPY = {
  en: {
    available: "Available providers",
    request: "Inbound request",
    active: "Active",
    provider: "Provider",
    latency: "Latency p50",
    success: "Success rate",
    volume: "Volume today",
    msUnit: "ms",
    stages: ["Adapter resolve", "Dispatch", "Acked"],
  },
  zh: {
    available: "可用提供方",
    request: "传入请求",
    active: "在用",
    provider: "提供方",
    latency: "P50 延迟",
    success: "成功率",
    volume: "今日总量",
    msUnit: "毫秒",
    stages: ["Adapter 解析", "分发", "已确认"],
  },
} as const;

function pickStageIcon(slug: string): typeof Envelope {
  if (slug === "notifications") return Bell;
  if (slug === "storage" || slug === "uploads") return Database;
  if (slug === "email") return Envelope;
  return Lightning;
}

export function IntegrationsGroupShowcase({ entry, locale }: PackageShowcaseProps) {
  const copy = COPY[locale];
  const numLocale = locale === "zh" ? "zh-CN" : "en-US";
  const providers = PROVIDERS_FOR_SLUG[entry.slug] ?? DEFAULT_PROVIDERS;
  const activeIdx = seeded(entry.slug, providers.length);
  const activeProvider = providers[activeIdx] ?? providers[0] ?? "Adapter";
  const latency = 22 + seeded(entry.slug, 140, 5);
  const successPct = 96 + seeded(entry.slug, 4, 11);
  const volume = 1200 + seeded(entry.slug, 8000, 17);
  const stageLatencies = [
    1 + seeded(entry.slug, 4, 23),
    Math.max(8, latency - 8 - seeded(entry.slug, 6, 29)),
    2 + seeded(entry.slug, 3, 31),
  ];
  const payload = PAYLOAD_BY_SLUG[entry.slug] ?? `slug: "${entry.slug}", v: 1`;
  const StageMidIcon = pickStageIcon(entry.slug);

  return (
    <ShowcaseFrame>
      <Card className="border-border/60 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 p-4 md:p-5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-[var(--radius-md)] bg-primary text-white">
              <Connection className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="truncate text-sm font-semibold text-foreground">{entry.label}</span>
            <Badge variant="outline" size="sm" className="font-mono">
              {entry.path}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="blue-subtle" size="sm">
              Provider-agnostic
            </Badge>
            <StatusDot state="READY" titlePrefix={`${entry.label} adapter`} />
          </div>
        </CardHeader>

        <CardContent className="space-y-5 p-4 pt-0 md:p-5 md:pt-0">
          <div>
            <div className="mb-2 text-xs font-medium text-muted-foreground">{copy.available}</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {providers.map((name, i) => {
                const isActive = i === activeIdx;
                return (
                  <MagicCard
                    key={name}
                    className="rounded-[var(--radius-md)]"
                    gradientSize={120}
                    gradientOpacity={isActive ? 0.8 : 0.4}
                  >
                    <div className="flex h-14 flex-col items-start justify-center gap-1 px-3 py-2">
                      <span className="truncate text-xs font-semibold text-foreground">{name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {isActive ? copy.active : "standby"}
                      </span>
                    </div>
                  </MagicCard>
                );
              })}
            </div>
          </div>

          <div className="rounded-[var(--radius-md)] border border-border/60 bg-muted/30 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">{copy.request}</span>
              <Badge variant="gray-subtle" size="sm" className="font-mono">
                {entry.slug}
              </Badge>
            </div>
            <div className="mb-3 truncate rounded border border-border/60 bg-background px-2 py-1.5 font-mono text-[11px] text-muted-foreground">
              {`{ ${payload} }`}
            </div>
            <div className="grid grid-cols-3 items-stretch gap-2">
              {copy.stages.map((label, i) => {
                const Icon = i === 0 ? ArrowRight : i === 1 ? StageMidIcon : Check;
                const accent = i === 1;
                return (
                  <div
                    key={label}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-[var(--radius-md)] border px-2 py-2 ${
                      accent
                        ? "border-transparent bg-primary text-white"
                        : "border-border bg-background text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    <span
                      className={`text-center text-[11px] font-medium ${accent ? "text-white" : ""}`}
                    >
                      {i === 1 ? `${entry.label} ${label}` : label}
                    </span>
                    <span
                      className={`font-mono text-[10px] ${accent ? "text-white/80" : "text-muted-foreground"}`}
                    >
                      {stageLatencies[i]}
                      {copy.msUnit}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3">
              <Progress value={Math.min(99, successPct)} size="sm" />
            </div>
          </div>

          <MetricGrid columns={4} className="gap-3">
            <MetricCard
              size="sm"
              label={copy.provider}
              value={activeProvider}
              icon={<Connection />}
            />
            <MetricCard
              size="sm"
              label={copy.latency}
              value={`${latency} ${copy.msUnit}`}
              icon={<Lightning />}
              trend="neutral"
            />
            <MetricCard
              size="sm"
              label={copy.success}
              value={`${successPct}%`}
              icon={<Check />}
              trend="up"
              trendValue={`+${(seeded(entry.slug, 9, 37) / 10).toFixed(1)}%`}
            />
            <MetricCard
              size="sm"
              label={copy.volume}
              value={volume.toLocaleString(numLocale)}
              icon={<ArrowRight />}
            />
          </MetricGrid>

          <div className="flex items-center justify-between gap-2 font-mono text-[11px] text-muted-foreground">
            <span className="truncate">{entry.path}</span>
            <span className="shrink-0">provider-agnostic</span>
          </div>
        </CardContent>
      </Card>
    </ShowcaseFrame>
  );
}
