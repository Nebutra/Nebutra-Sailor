"use client";

import { Calendar, Check, ChevronRight, Clock, MagnifyingGlass, Shield } from "@nebutra/icons";
import { Badge, Input, StatusBadge } from "@nebutra/ui/primitives";

import { ShowcaseFrame } from "./showcase-frame";
import type { PackageShowcaseProps } from "./types";

type ActionStatus = "info" | "warning" | "success" | "error";

type AuditEntry = {
  time: string;
  initials: string;
  actor: string;
  action: string;
  target: string;
  status: ActionStatus;
};

type Copy = {
  filterPlaceholder: string;
  rangeLabel: string;
  countLabel: string;
  viewDiff: string;
  chainLabel: string;
  chainEntries: string;
  chainVerified: string;
  entries: AuditEntry[];
};

const COPY: Record<"en" | "zh", Copy> = {
  en: {
    filterPlaceholder: "filter by actor or action…",
    rangeLabel: "Last 24h",
    countLabel: "12 actions",
    viewDiff: "view diff",
    chainLabel: "chain",
    chainEntries: "12,847 entries",
    chainVerified: "hash-verified",
    entries: [
      {
        time: "2m ago",
        initials: "MK",
        actor: "maria.kim",
        action: "user.invite",
        target: "alex@example.com",
        status: "info",
      },
      {
        time: "14m ago",
        initials: "JL",
        actor: "j.lopez",
        action: "billing.cancel",
        target: "sub_8f2a",
        status: "warning",
      },
      {
        time: "32m ago",
        initials: "TS",
        actor: "tseka",
        action: "auth.signin",
        target: "sso/okta",
        status: "success",
      },
      {
        time: "1h ago",
        initials: "RP",
        actor: "r.patel",
        action: "role.assign",
        target: "org/admins",
        status: "info",
      },
      {
        time: "2h ago",
        initials: "NB",
        actor: "n.brown",
        action: "key.rotate",
        target: "kms/prod",
        status: "success",
      },
      {
        time: "3h ago",
        initials: "DH",
        actor: "d.huang",
        action: "access.deny",
        target: "vault/secrets",
        status: "error",
      },
    ],
  },
  zh: {
    filterPlaceholder: "按操作者或动作筛选…",
    rangeLabel: "近 24 小时",
    countLabel: "12 条操作",
    viewDiff: "查看差异",
    chainLabel: "链",
    chainEntries: "12,847 条记录",
    chainVerified: "哈希已校验",
    entries: [
      {
        time: "2 分钟前",
        initials: "MK",
        actor: "maria.kim",
        action: "user.invite",
        target: "alex@example.com",
        status: "info",
      },
      {
        time: "14 分钟前",
        initials: "JL",
        actor: "j.lopez",
        action: "billing.cancel",
        target: "sub_8f2a",
        status: "warning",
      },
      {
        time: "32 分钟前",
        initials: "TS",
        actor: "tseka",
        action: "auth.signin",
        target: "sso/okta",
        status: "success",
      },
      {
        time: "1 小时前",
        initials: "RP",
        actor: "r.patel",
        action: "role.assign",
        target: "org/admins",
        status: "info",
      },
      {
        time: "2 小时前",
        initials: "NB",
        actor: "n.brown",
        action: "key.rotate",
        target: "kms/prod",
        status: "success",
      },
      {
        time: "3 小时前",
        initials: "DH",
        actor: "d.huang",
        action: "access.deny",
        target: "vault/secrets",
        status: "error",
      },
    ],
  },
};

const statusTone: Record<ActionStatus, string> = {
  info: "border-primary/30 bg-primary/10 text-primary",
  warning: "border-[var(--amber-8)]/30 bg-[var(--amber-3)] text-[var(--amber-11)]",
  success: "border-[var(--green-8)]/30 bg-[var(--green-3)] text-[var(--green-11)]",
  error: "border-[var(--red-8)]/30 bg-[var(--red-3)] text-[var(--red-11)]",
};

const avatarTone: Record<ActionStatus, string> = {
  info: "bg-primary/10 text-primary",
  warning: "bg-[var(--amber-3)] text-[var(--amber-11)]",
  success: "bg-[var(--green-3)] text-[var(--green-11)]",
  error: "bg-[var(--red-3)] text-[var(--red-11)]",
};

function ActionChip({ label, status }: { label: string; status: ActionStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-[var(--radius-md)] border px-1.5 py-0.5 font-mono text-[10px] font-medium ${statusTone[status]}`}
    >
      {label}
    </span>
  );
}

function AuditRow({ entry, viewDiff }: { entry: AuditEntry; viewDiff: string }) {
  return (
    <div className="grid grid-cols-[64px_1fr_auto] items-center gap-3 rounded-[var(--radius-md)] border border-border/60 bg-muted/20 px-3 py-2 transition-colors hover:bg-muted/40">
      <span className="font-mono text-[11px] text-muted-foreground">{entry.time}</span>
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${avatarTone[entry.status]}`}
          aria-hidden="true"
        >
          {entry.initials}
        </span>
        <span className="shrink-0 font-mono text-xs text-foreground">{entry.actor}</span>
        <ActionChip label={entry.action} status={entry.status} />
        <span className="hidden truncate font-mono text-[11px] text-muted-foreground sm:inline">
          → {entry.target}
        </span>
      </div>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded text-[11px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="hidden md:inline">{viewDiff}</span>
        <ChevronRight className="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
  );
}

export function AuditShowcase({ locale }: PackageShowcaseProps) {
  const copy = COPY[locale];

  return (
    <ShowcaseFrame>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <MagnifyingGlass
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            readOnly
            value=""
            placeholder={copy.filterPlaceholder}
            size="sm"
            className="pl-9 font-mono text-xs"
            aria-label={copy.filterPlaceholder}
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="outline" size="sm" className="gap-1 font-mono">
            <Calendar className="h-3 w-3" aria-hidden="true" />
            {copy.rangeLabel}
          </Badge>
          <Badge variant="secondary" size="sm" className="gap-1 font-mono">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {copy.countLabel}
          </Badge>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        {copy.entries.map((entry, i) => (
          <AuditRow key={`${entry.actor}-${i}`} entry={entry} viewDiff={copy.viewDiff} />
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
          <Shield className="h-3 w-3" aria-hidden="true" />
          {copy.chainLabel} · {copy.chainEntries}
        </span>
        <StatusBadge
          status="success"
          leftIcon={Check}
          leftLabel={copy.chainVerified}
          rightLabel="sha-256"
          className="font-mono text-[10px]"
        />
      </div>
    </ShowcaseFrame>
  );
}
