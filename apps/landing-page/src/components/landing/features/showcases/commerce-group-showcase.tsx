"use client";

import {
  BarChart,
  Briefcase,
  Calendar,
  Check,
  CreditCard,
  Email,
  FileText,
  KeyOld,
  Sparkles,
  Tag,
  Users,
} from "@nebutra/icons";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  MetricCard,
  MetricGrid,
  Progress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@nebutra/ui/primitives";
import type { ReactNode } from "react";

import type { PackageShowcaseProps } from "./types";

type Layout = "license" | "contracts" | "waitlist" | "marketing" | "default";
type Locale = "en" | "zh";
type Bi = readonly [string, string];
const L = (en: string, zh: string): Bi => [en, zh] as const;

function pickLayout(slug: string): Layout {
  if (slug === "license" || slug.startsWith("license-")) return "license";
  if (slug === "contracts") return "contracts";
  if (slug === "waitlist") return "waitlist";
  if (slug === "marketing" || slug === "legal") return "marketing";
  return "default";
}

const S = {
  sor: L("System of record", "记录系统"),
  volume: L("Total volume", "总交易额"),
  records: L("Active records", "活跃记录"),
  growth: L("MoM growth", "环比增长"),
  success: L("Success rate", "成功率"),
  footer: L("commercial record", "商业记录"),
  licenseKey: L("License key", "License Key"),
  active: L("Active", "已激活"),
  entitlements: L("Entitlements", "权益"),
  expires: L("Expires", "到期"),
  expiresValue: L("Dec 31, 2026", "2026 年 12 月 31 日"),
  contracts: L("Typed event contracts", "类型化事件契约"),
  hEvent: L("Event type", "事件类型"),
  hSchema: L("Payload schema", "Payload Schema"),
  hStatus: L("Status", "状态"),
  stable: L("Stable", "稳定"),
  beta: L("Beta", "Beta"),
  waitlist: L("Pre-launch waitlist", "预启动 Waitlist"),
  waiting: L("waiting", "人排队中"),
  position: L("Your position", "你的位置"),
  recent: L("Recent joiners", "最近加入"),
  marketing: L("Active campaign", "进行中的营销活动"),
  campaign: L("Spring product launch", "春季产品发布"),
  audience: L("Audience", "受众"),
  openRate: L("Open rate", "打开率"),
  ctr: L("CTR", "点击率"),
  running: L("Running", "运行中"),
  txn: L("Transaction record", "交易记录"),
  tenant: L("Tenant", "租户"),
  recorded: L("Recorded", "时间"),
  timestamp: L("May 23, 2026 · 14:02 UTC", "2026-05-23 · 14:02 UTC"),
  settled: L("Settled", "已结算"),
};

const FEATURES: Bi[] = [
  L("SSO", "SSO"),
  L("Audit log", "审计日志"),
  L("Multi-tenant", "多租户"),
  L("Priority support", "优先支持"),
];
const CONTRACT_ROWS = [
  { event: "invoice.paid", schema: "InvoicePaidV2", stable: true },
  { event: "subscription.created", schema: "SubscriptionV3", stable: true },
  { event: "subscription.canceled", schema: "SubscriptionV3", stable: true },
  { event: "checkout.expired", schema: "CheckoutV1", stable: false },
];
const JOINERS: { email: string; ago: Bi }[] = [
  { email: "j••••s@acme.dev", ago: L("2 min ago", "2 分钟前") },
  { email: "m•••@robot.co", ago: L("5 min ago", "5 分钟前") },
  { email: "a•••a@nebula.io", ago: L("12 min ago", "12 分钟前") },
  { email: "p•••r@sailor.dev", ago: L("21 min ago", "21 分钟前") },
];
const OPEN = 42;

const panel = "space-y-3 rounded-md border border-border/60 bg-card p-4";
const kicker =
  "flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground";
const micro = "text-[10px] uppercase tracking-wide text-muted-foreground";

function Stat({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div>
      <p className={micro}>{label}</p>
      <p className="mt-0.5 flex items-center gap-1 font-semibold tabular-nums text-foreground">
        {icon}
        {value}
      </p>
    </div>
  );
}

function Body({ layout, locale }: { layout: Layout; locale: Locale }) {
  const P = (bi: Bi) => bi[locale === "en" ? 0 : 1];
  if (layout === "license")
    return (
      <div className={panel}>
        <div className="flex items-center justify-between gap-2">
          <span className={kicker}>{P(S.licenseKey)}</span>
          <Badge variant="green-subtle" size="sm">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            {P(S.active)}
          </Badge>
        </div>
        <p className="break-all font-mono text-sm text-foreground">NBTRA-XK7Q-••••-••••-A19F</p>
        <div>
          <p className={micro}>{P(S.entitlements)}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {FEATURES.map((f) => (
              <Badge key={f[0]} variant="gray-subtle" size="sm">
                <Check className="h-3 w-3" aria-hidden="true" />
                {P(f)}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{P(S.expires)}</span>
          <span className="font-medium text-foreground">{P(S.expiresValue)}</span>
        </div>
      </div>
    );
  if (layout === "contracts")
    return (
      <div className={panel}>
        <span className={kicker}>
          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
          {P(S.contracts)}
        </span>
        <Table wrapperClassName="border-0 bg-transparent p-0">
          <TableHeader>
            <TableRow>
              <TableHead>{P(S.hEvent)}</TableHead>
              <TableHead>{P(S.hSchema)}</TableHead>
              <TableHead>{P(S.hStatus)}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody bordered>
            {CONTRACT_ROWS.map((row) => (
              <TableRow key={row.event}>
                <TableCell className="font-mono text-xs">{row.event}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {row.schema}
                </TableCell>
                <TableCell>
                  <Badge variant={row.stable ? "green-subtle" : "amber-subtle"} size="sm">
                    {P(row.stable ? S.stable : S.beta)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  if (layout === "waitlist")
    return (
      <div className="grid gap-4 md:grid-cols-5">
        <div className={`${panel} md:col-span-2`}>
          <span className={kicker}>
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            {P(S.waitlist)}
          </span>
          <div>
            <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              1,843
            </p>
            <p className="text-xs text-muted-foreground">{P(S.waiting)}</p>
          </div>
          <div className="rounded-md border border-border/60 bg-muted/30 p-3">
            <p className={micro}>{P(S.position)}</p>
            <p className="mt-1 font-mono text-lg font-semibold text-foreground">#142</p>
          </div>
        </div>
        <div className={`${panel} md:col-span-3`}>
          <span className={kicker}>{P(S.recent)}</span>
          <ul className="space-y-1.5">
            {JOINERS.map((j) => (
              <li
                key={j.email}
                className="flex items-center justify-between gap-2 px-1 py-1 text-xs"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <Email className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="truncate font-mono text-foreground">{j.email}</span>
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground">{P(j.ago)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  if (layout === "marketing")
    return (
      <div className={panel}>
        <div className="flex items-center justify-between gap-2">
          <span className={kicker}>
            <Tag className="h-3.5 w-3.5" aria-hidden="true" />
            {P(S.marketing)}
          </span>
          <Badge variant="green-subtle" size="sm">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            {P(S.running)}
          </Badge>
        </div>
        <p className="truncate text-sm font-semibold text-foreground">{P(S.campaign)}</p>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <Stat
            label={P(S.audience)}
            value="24,800"
            icon={<Users className="h-3 w-3 text-muted-foreground" aria-hidden="true" />}
          />
          <Stat
            label={P(S.ctr)}
            value="3.4%"
            icon={<BarChart className="h-3 w-3 text-muted-foreground" aria-hidden="true" />}
          />
          <Stat label={P(S.openRate)} value={`${OPEN}%`} />
        </div>
        <Progress value={OPEN} max={100} size="sm" aria-label={P(S.openRate)} />
      </div>
    );
  return (
    <div className={panel}>
      <div className="flex items-center justify-between gap-2">
        <span className={kicker}>{P(S.txn)}</span>
        <Badge variant="green-subtle" size="sm">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          {P(S.settled)}
        </Badge>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
          $249.00
        </span>
        <Badge variant="gray-subtle" size="sm">
          USD
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-3 border-t border-border/60 pt-3 text-xs">
        <Stat label={P(S.tenant)} value="org_8d2f••••" />
        <Stat
          label={P(S.recorded)}
          value={P(S.timestamp)}
          icon={<Calendar className="h-3 w-3 text-muted-foreground" aria-hidden="true" />}
        />
      </div>
    </div>
  );
}

export function CommerceGroupShowcase({ entry, locale }: PackageShowcaseProps) {
  const layout = pickLayout(entry.slug);
  const HeaderIcon = layout === "license" ? KeyOld : Briefcase;
  const P = (bi: Bi) => bi[locale === "en" ? 0 : 1];
  return (
    <div
      className="rounded-[var(--radius-lg)] border border-border bg-background p-4 md:p-6"
      style={{ minHeight: 400 }}
    >
      <Card className="border-border/60 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 p-4 md:p-5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[image:var(--brand-gradient)] text-white">
              <HeaderIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="truncate text-sm font-semibold text-foreground">{entry.label}</span>
            <span className="hidden truncate font-mono text-[11px] text-muted-foreground sm:inline">
              {entry.path}
            </span>
          </div>
          <Badge variant="blue-subtle" size="sm">
            {P(S.sor)}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-5 p-4 pt-0 md:p-5 md:pt-0">
          <Body layout={layout} locale={locale} />
          <div className="rounded-md border border-border/60 bg-muted/30 p-3">
            <MetricGrid columns={4} className="gap-3">
              <MetricCard size="sm" label={P(S.volume)} value="$1.24M" />
              <MetricCard size="sm" label={P(S.records)} value="8,472" />
              <MetricCard size="sm" label={P(S.growth)} value="+8.4%" trend="up" />
              <MetricCard size="sm" label={P(S.success)} value="99.6%" />
            </MetricGrid>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <CreditCard className="h-3 w-3" aria-hidden="true" />
            <span className="font-mono">{entry.path}</span>
            <span>·</span>
            <span>{P(S.footer)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
