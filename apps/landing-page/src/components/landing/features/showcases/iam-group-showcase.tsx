"use client";

import { Check, Clock, Eye, Fingerprint, Key, LockClosed, Shield, User } from "@nebutra/icons";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  MetricCard,
  MetricGrid,
  Progress,
  StatusDot,
} from "@nebutra/ui/primitives";

import { ShowcaseFrame } from "./showcase-frame";
import type { PackageShowcaseProps } from "./types";

// ---------------------------------------------------------------------------
// Deterministic per-slug variation. Same slug always renders the same numbers,
// different slugs get visibly different policy checks + sessions + metrics.
// ---------------------------------------------------------------------------
function seeded(slug: string, max: number, offset = 0): number {
  let hash = offset;
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % max;
}

const ACTOR_INITIALS = ["AK", "MR", "JS", "LF", "TN", "EP", "VC"] as const;
const TENANT_PREFIX = ["acme", "globex", "umbrella", "stark", "wayne"] as const;
const ROLES: Record<"en" | "zh", readonly string[]> = {
  en: ["admin", "operator", "viewer", "owner", "service"],
  zh: ["管理员", "运维", "只读", "所有者", "服务"],
};

type Copy = {
  badgeIsolated: string;
  policyHeading: string;
  sessionHeading: string;
  checks: { actor: string; tenant: string; entry: (label: string) => string; audit: string };
  metricSessions: string;
  metricAudit: string;
  metricChecks: string;
  expires: string;
  footnote: string;
  msUnit: (n: number) => string;
};

const COPY: Record<"en" | "zh", Copy> = {
  en: {
    badgeIsolated: "Tenant-isolated",
    policyHeading: "Policy decision",
    sessionHeading: "Active session",
    checks: {
      actor: "Actor verified",
      tenant: "Tenant scope",
      entry: (label) => `${label} authorized`,
      audit: "Audit logged",
    },
    metricSessions: "Active sessions",
    metricAudit: "Audit entries / day",
    metricChecks: "Policy checks / s",
    expires: "Expires in",
    footnote: "Identity and trust · single boundary",
    msUnit: (n) => `${n} ms`,
  },
  zh: {
    badgeIsolated: "租户隔离",
    policyHeading: "策略判定",
    sessionHeading: "活跃会话",
    checks: {
      actor: "主体已验证",
      tenant: "租户范围",
      entry: (l) => `${l} 已授权`,
      audit: "审计已记录",
    },
    metricSessions: "活跃会话",
    metricAudit: "审计条目 / 天",
    metricChecks: "策略检查 / 秒",
    expires: "剩余",
    footnote: "身份与信任 · 单一边界",
    msUnit: (n) => `${n} 毫秒`,
  },
};

const CHECK_ICONS = [User, Shield, LockClosed, Check] as const;

export function IamGroupShowcase({ entry, locale }: PackageShowcaseProps) {
  const t = COPY[locale];
  const sessions = 120 + seeded(entry.slug, 880, 3);
  const auditPerDay = 8_000 + seeded(entry.slug, 42_000, 7);
  const checksPerSec = 40 + seeded(entry.slug, 260, 19);
  const initials = ACTOR_INITIALS[seeded(entry.slug, ACTOR_INITIALS.length, 23)] ?? "AK";
  const tenantId = `${TENANT_PREFIX[seeded(entry.slug, TENANT_PREFIX.length, 29)] ?? "acme"}_${(
    1000 + seeded(entry.slug, 8999, 31)
  ).toString()}`;
  const role = ROLES[locale][seeded(entry.slug, ROLES[locale].length, 37)] ?? ROLES[locale][0];
  const minutesLeft = 4 + seeded(entry.slug, 56, 41);

  const checks = [
    { label: t.checks.actor, Icon: CHECK_ICONS[0], ms: 8 + seeded(entry.slug, 18) },
    { label: t.checks.tenant, Icon: CHECK_ICONS[1], ms: 6 + seeded(entry.slug, 14, 5) },
    {
      label: t.checks.entry(entry.label),
      Icon: CHECK_ICONS[2],
      ms: 12 + seeded(entry.slug, 24, 11),
    },
    { label: t.checks.audit, Icon: CHECK_ICONS[3], ms: 4 + seeded(entry.slug, 10, 17) },
  ];

  return (
    <ShowcaseFrame>
      <Card className="border-border/60 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 p-4 md:p-5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-[var(--radius-md)] bg-[image:var(--brand-gradient)] text-white">
              <Shield className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="truncate text-sm font-semibold text-foreground">{entry.label}</span>
            <Badge variant="outline" size="sm" className="font-mono">
              {entry.path}
            </Badge>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="blue-subtle" size="sm" icon={<Fingerprint />}>
              {t.badgeIsolated}
            </Badge>
            <StatusDot state="READY" decorative titlePrefix={`${entry.label} policy`} />
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-4 pt-0 md:p-5 md:pt-0">
          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            {/* Policy decision diagram */}
            <div className="space-y-2 rounded-[var(--radius-md)] border border-border/60 bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{t.policyHeading}</span>
                <Badge variant="green-subtle" size="sm" icon={<Check />}>
                  pass
                </Badge>
              </div>
              <ul className="flex flex-col gap-1.5" aria-label={t.policyHeading}>
                {checks.map((c, idx) => (
                  <li
                    key={c.label}
                    className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border/40 bg-background/70 px-2 py-1.5"
                  >
                    <c.Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                    <span className="flex-1 truncate text-xs text-foreground">{c.label}</span>
                    <Progress
                      value={Math.max(72, 100 - c.ms * 2)}
                      size="sm"
                      variant="success"
                      className="hidden h-1.5 w-14 sm:block"
                      aria-label={`check-${idx}`}
                    />
                    <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                      {t.msUnit(c.ms)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Session card */}
            <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-border/60 bg-muted/30 p-3">
              <span className="text-xs font-medium text-muted-foreground">{t.sessionHeading}</span>
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[image:var(--brand-gradient)] text-[11px] font-semibold text-white"
                  aria-hidden="true"
                >
                  {initials}
                </span>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-xs font-semibold text-foreground">
                    actor_{initials.toLowerCase()}
                  </span>
                  <span className="truncate font-mono text-[10px] text-muted-foreground">
                    {tenantId}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge size="sm" variant="purple-subtle" icon={<Key />}>
                  {role}
                </Badge>
                <Badge size="sm" variant="outline" icon={<Eye />}>
                  mfa
                </Badge>
              </div>
              <div className="mt-auto flex items-center gap-1.5 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" aria-hidden="true" />
                <span>
                  {t.expires} {minutesLeft}m
                </span>
              </div>
            </div>
          </div>

          {/* Footer metrics */}
          <div className="rounded-[var(--radius-md)] border border-border/60 bg-muted/30 p-3">
            <MetricGrid columns={3} className="gap-3">
              <MetricCard
                size="sm"
                label={t.metricSessions}
                value={sessions}
                icon={<User />}
                trend="up"
                trendValue={`+${1 + seeded(entry.slug, 18, 43)}%`}
              />
              <MetricCard
                size="sm"
                label={t.metricAudit}
                value={auditPerDay}
                icon={<Eye />}
                trend="neutral"
              />
              <MetricCard
                size="sm"
                label={t.metricChecks}
                value={checksPerSec}
                icon={<Shield />}
                trend="up"
                trendValue={`+${1 + seeded(entry.slug, 9, 47)}%`}
              />
            </MetricGrid>
          </div>

          <div className="flex items-center justify-between gap-2 font-mono text-[11px] text-muted-foreground">
            <span className="truncate">{entry.path}</span>
            <span className="shrink-0">{t.footnote}</span>
          </div>
        </CardContent>
      </Card>
    </ShowcaseFrame>
  );
}
