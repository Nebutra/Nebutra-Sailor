"use client";

import { Bug, Check, Clock, Connection, RefreshClockwise } from "@nebutra/icons";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  StatusBadge,
  StatusDot,
  Table,
} from "@nebutra/ui/primitives";
import { ShowcaseFrame } from "./showcase-frame";
import type { PackageShowcaseProps } from "./types";

type DeliveryStatus = "success" | "warning" | "destructive" | "retrying";

type Delivery = {
  attempts: string;
  code: number;
  event: string;
  id: string;
  latency: number;
  status: DeliveryStatus;
  timestamp: { en: string; zh: string };
};

const DELIVERIES: Delivery[] = [
  {
    attempts: "1/5",
    code: 200,
    event: "invoice.paid",
    id: "evt_1f9c",
    latency: 184,
    status: "success",
    timestamp: { en: "2m ago", zh: "2 分钟前" },
  },
  {
    attempts: "1/5",
    code: 201,
    event: "user.created",
    id: "evt_8a3b",
    latency: 142,
    status: "success",
    timestamp: { en: "5m ago", zh: "5 分钟前" },
  },
  {
    attempts: "3/5",
    code: 503,
    event: "subscription.canceled",
    id: "evt_b021",
    latency: 4821,
    status: "retrying",
    timestamp: { en: "just now", zh: "刚刚" },
  },
  {
    attempts: "2/5",
    code: 429,
    event: "user.updated",
    id: "evt_44d2",
    latency: 312,
    status: "warning",
    timestamp: { en: "12m ago", zh: "12 分钟前" },
  },
  {
    attempts: "5/5",
    code: 500,
    event: "invoice.paid",
    id: "evt_77e1",
    latency: 1204,
    status: "destructive",
    timestamp: { en: "1h ago", zh: "1 小时前" },
  },
];

const COPY = {
  en: {
    active: "Active",
    attempts: "Attempts",
    code: "Code",
    delivered: "last delivered 2m ago",
    endpoint: "Endpoint",
    event: "Event",
    footer: "99.2% success · p95 248ms · signed HMAC",
    latency: "Latency",
    retry: "retrying",
    status: "Status",
    title: "Recent deliveries",
    when: "When",
  },
  zh: {
    active: "活跃",
    attempts: "尝试次数",
    code: "状态码",
    delivered: "上次投递 2 分钟前",
    endpoint: "端点",
    event: "事件",
    footer: "99.2% 成功 · p95 248ms · HMAC 签名",
    latency: "延迟",
    retry: "重试中",
    status: "状态",
    title: "最近投递",
    when: "时间",
  },
} as const;

const ENDPOINT_URL = "https://api.example.com/v1/hooks";

function StatusCell({ status, locale }: { status: DeliveryStatus; locale: "en" | "zh" }) {
  if (status === "retrying") {
    return <StatusDot state="BUILDING" decorative titlePrefix={COPY[locale].retry} />;
  }
  if (status === "success") {
    return (
      <Badge variant="green-subtle" size="sm" icon={<Check aria-hidden="true" />}>
        2xx
      </Badge>
    );
  }
  if (status === "warning") {
    return (
      <Badge variant="amber-subtle" size="sm">
        4xx
      </Badge>
    );
  }
  return (
    <Badge variant="red-subtle" size="sm" icon={<Bug aria-hidden="true" />}>
      5xx
    </Badge>
  );
}

export function WebhooksShowcase({ locale }: PackageShowcaseProps) {
  const t = COPY[locale];

  return (
    <ShowcaseFrame className="flex flex-col gap-4">
      <Card className="border-border/60 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 p-4 md:p-5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground">
              <Connection className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="truncate font-mono text-xs text-foreground md:text-sm">
              {ENDPOINT_URL}
            </span>
          </div>
          <StatusBadge
            status="success"
            leftIcon={Check}
            leftLabel={t.active}
            rightLabel={t.delivered}
          />
        </CardHeader>
      </Card>

      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-medium text-muted-foreground">{t.title}</span>
        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" aria-hidden="true" />
          {DELIVERIES.length}
        </span>
      </div>

      <Table wrapperClassName="border-border/60 bg-card/40" aria-label={t.title}>
        <Table.Header>
          <Table.Row>
            <Table.Head className="w-[88px]">{t.status}</Table.Head>
            <Table.Head>{t.event}</Table.Head>
            <Table.Head className="w-[70px]" numeric>
              {t.code}
            </Table.Head>
            <Table.Head className="w-[110px]">{t.attempts}</Table.Head>
            <Table.Head className="w-[100px]" numeric>
              {t.latency}
            </Table.Head>
            <Table.Head className="w-[110px]">{t.when}</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body bordered>
          {DELIVERIES.map((d) => (
            <Table.Row key={d.id}>
              <Table.Cell>
                <StatusCell status={d.status} locale={locale} />
              </Table.Cell>
              <Table.Cell>
                <Badge variant="gray-subtle" size="sm" className="font-mono">
                  {d.event}
                </Badge>
              </Table.Cell>
              <Table.Cell numeric className="font-mono text-xs">
                {d.code}
              </Table.Cell>
              <Table.Cell>
                <span className="inline-flex items-center gap-1.5">
                  <span className="font-mono text-xs text-muted-foreground">{d.attempts}</span>
                  {d.status === "retrying" && (
                    <Badge
                      variant="amber-subtle"
                      size="sm"
                      icon={<RefreshClockwise aria-hidden="true" />}
                    >
                      {t.retry}
                    </Badge>
                  )}
                </span>
              </Table.Cell>
              <Table.Cell numeric className="font-mono text-xs">
                {d.latency.toLocaleString(locale === "zh" ? "zh-CN" : "en-US")}ms
              </Table.Cell>
              <Table.Cell className="font-mono text-xs text-muted-foreground">
                {d.timestamp[locale]}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>

      <p className="px-1 text-center text-[11px] text-muted-foreground">{t.footer}</p>
    </ShowcaseFrame>
  );
}
