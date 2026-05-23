"use client";

import { CheckCircle, Clock, CreditCard, Lightning, Sparkles } from "@nebutra/icons";
import {
  AnimatedList,
  MetricCard,
  Progress,
  SliderNumberFlow,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@nebutra/ui/primitives";
import type { PackageFeatureEntry } from "../package-feature-data";
import { entrySignature, getSpecimenNodes, pad } from "./specimen-utils";

type Props = { entry: PackageFeatureEntry; locale: "en" | "zh"; compact?: boolean };
type RowStatus = "settled" | "pending" | "metered";

const STATUS_MAP = {
  settled: { badgeStatus: "success", icon: CheckCircle, en: "settled", zh: "已结算" },
  pending: { badgeStatus: "warning", icon: Clock, en: "pending", zh: "待结算" },
  metered: { badgeStatus: "info", icon: Lightning, en: "metered", zh: "计量中" },
} as const satisfies Record<
  RowStatus,
  { badgeStatus: "success" | "warning" | "info"; icon: typeof CheckCircle; en: string; zh: string }
>;
const STATUSES: RowStatus[] = ["settled", "metered", "pending"];

/**
 * Commerce specimen — metered ledger of billable events.
 * Built on @nebutra/ui/primitives: Table + AnimatedList + StatusBadge +
 * Progress + MetricCard + SliderNumberFlow. Amounts seeded from entry
 * signature so siblings differ but each entry is stable across reloads.
 */
export function LedgerSpecimen({ entry, locale, compact = false }: Props) {
  const nodes = getSpecimenNodes(entry, compact ? 3 : 6);
  const sig = entrySignature(entry);
  const accent = entry.tone.accent;
  const minHeight = compact ? "240px" : "clamp(380px, 50vw, 520px)";

  const valuesFor = (index: number) => {
    const code = sig.charCodeAt(index % sig.length) + index * 17;
    const amount = (code % 9000) + 1000;
    const meter = (amount % 80) + 10;
    const status = STATUSES[(code + index) % STATUSES.length] ?? "settled";
    return { amount, meter, status };
  };
  const total = nodes.reduce((sum, _, i) => sum + valuesFor(i).amount, 0);
  const txns = nodes.length;

  const halo = (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        background: `radial-gradient(ellipse at 100% 50%, ${entry.tone.halo}, transparent 65%)`,
      }}
    />
  );

  if (compact) {
    return (
      <div
        className="relative flex w-full flex-col gap-3 overflow-hidden p-4"
        role="img"
        aria-label={`${entry.label} ledger specimen`}
        style={{ minHeight }}
      >
        {halo}
        <AnimatedList delay={900} className="relative z-10 !items-stretch !gap-2">
          {nodes.map((node, index) => {
            const { amount, status } = valuesFor(index);
            const cfg = STATUS_MAP[status];
            return (
              <div
                key={`${node}-${index}`}
                className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-card/80 px-3 py-1.5"
              >
                <StatusBadge
                  leftIcon={cfg.icon}
                  leftLabel={pad(index + 1, 3)}
                  rightLabel={locale === "zh" ? cfg.zh : cfg.en}
                  status={cfg.badgeStatus}
                />
                <span
                  className="font-mono text-[11px] tabular-nums text-muted-foreground"
                  translate="no"
                >
                  ${amount.toLocaleString()}
                </span>
              </div>
            );
          })}
        </AnimatedList>
        <div className="relative z-10 mt-auto">
          <MetricCard
            size="sm"
            icon={<CreditCard aria-hidden="true" />}
            label={locale === "zh" ? "本期合计" : "period total"}
            value={`$${total.toLocaleString()}`}
            trend="up"
            trendValue={`${txns}×`}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full overflow-hidden p-[6%]"
      role="img"
      aria-label={`${entry.label} ledger specimen`}
      style={{ minHeight }}
    >
      {halo}
      <div className="relative z-10 flex h-full flex-col gap-3">
        <div
          className="flex items-center justify-between border-b pb-2"
          style={{ borderColor: entry.tone.hairline }}
        >
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            <span translate="no">ledger</span>
            <span style={{ color: accent }} translate="no">
              {entry.slug.toUpperCase()} · {sig}
            </span>
          </div>
          <AnimatedList delay={1200} className="!flex-row !items-center !gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/70 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
              translate="no"
            >
              <Sparkles className="size-3" aria-hidden="true" />
              {locale === "zh" ? "新事件入账" : "event ingested"}
            </span>
          </AnimatedList>
        </div>

        <Table
          wrapperClassName="flex-1 !min-w-0 bg-card/40 backdrop-blur-sm"
          aria-label={locale === "zh" ? "计量账本" : "metered ledger"}
        >
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>{locale === "zh" ? "事件" : "event"}</TableHead>
              <TableHead>{locale === "zh" ? "状态" : "status"}</TableHead>
              <TableHead className="hidden md:table-cell">
                {locale === "zh" ? "用量" : "usage"}
              </TableHead>
              <TableHead numeric>{locale === "zh" ? "金额" : "amount"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody striped bordered>
            {nodes.map((node, index) => {
              const { amount, meter, status } = valuesFor(index);
              const cfg = STATUS_MAP[status];
              const progressType =
                cfg.badgeStatus === "success"
                  ? "success"
                  : cfg.badgeStatus === "warning"
                    ? "warning"
                    : undefined;
              return (
                <TableRow key={`${node}-${index}`}>
                  <TableCell className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {pad(index + 1, 3)}
                  </TableCell>
                  <TableCell className="font-mono text-[12px] uppercase tracking-[0.06em]">
                    {node}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      leftIcon={cfg.icon}
                      leftLabel={locale === "zh" ? cfg.zh : cfg.en}
                      rightLabel={pad(meter, 2)}
                      status={cfg.badgeStatus}
                    />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Progress
                      size="sm"
                      value={meter}
                      type={progressType}
                      animated
                      aria-label={`${node} meter`}
                    />
                  </TableCell>
                  <TableCell numeric className="text-[12px]">
                    ${amount.toLocaleString()}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <div
          className="grid grid-cols-1 gap-4 border-t pt-3 sm:grid-cols-2"
          style={{ borderColor: entry.tone.hairline }}
        >
          <MetricCard
            size="default"
            icon={<CreditCard aria-hidden="true" />}
            label={locale === "zh" ? "本期合计" : "period total"}
            value={`$${total.toLocaleString()}`}
            trend="up"
            trendValue={`${txns} ${locale === "zh" ? "笔" : "txns"}`}
            description={locale === "zh" ? "用量计量 · 自动入账" : "metered usage · auto-posted"}
          />
          <div className="flex flex-col justify-end gap-2">
            <span
              className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground"
              translate="no"
            >
              Σ
            </span>
            <SliderNumberFlow
              value={Math.min(Math.round(total / 1000), 100)}
              min={0}
              max={100}
              disabled
              aria-label={locale === "zh" ? "合计指针" : "total dial"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
