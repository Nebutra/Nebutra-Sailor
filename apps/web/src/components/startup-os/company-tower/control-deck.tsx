"use client";

import { ChartActivity, LoaderCircle, Target } from "@nebutra/icons";
import type { ContextLayer, FieldValue } from "@nebutra/startup-os/company-context/model";
import {
  Badge,
  ColorBadge,
  KpiCard,
  MetricCard,
  Progress,
  Separator,
  StatusBadge,
} from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import { useTranslations } from "next-intl";

/**
 * ControlDeck — the L9 (执行 · execution) expanded body. A quiet "mission
 * control" surface composed from existing wheels: KpiCard / MetricCard for the
 * north-star + bets, Progress bars for key-result completion, ColorBadge for
 * the Now / Next / Later roadmap, and StatusBadge rows for live runs. Every
 * datum (KR %, run id, OKR number) is `font-mono` — precise-tool aesthetic.
 *
 * All value shapes arrive as `unknown` (the model is value-blind). The parsers
 * below are TOTAL and defensive: a malformed or absent value degrades to an
 * empty section, never throws. No field value is rendered beyond what the L9
 * slice actually holds.
 */

export interface ControlDeckProps {
  /** The L9 layer slice — its field definitions + stored values. */
  readonly layer: ContextLayer;
}

// ---------------------------------------------------------------------------
// Value-blind, total parsers (the model stores `unknown`).
// ---------------------------------------------------------------------------

interface KeyResult {
  readonly label: string;
  readonly value: number;
  readonly target: number;
}

interface RoadmapItem {
  readonly label: string;
  readonly phase: "now" | "next" | "later";
}

interface LiveRun {
  readonly id: string;
  readonly stage: string;
  readonly status: "success" | "warning" | "error" | "info" | "default";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** Read the stored value for one L9 field, or `undefined`. */
function fieldValueOf(layer: ContextLayer, fieldKey: string): unknown {
  const stored: FieldValue | undefined = layer.values[fieldKey];
  return stored?.value;
}

/** OKR key-results: `{ key_results: [{ label, value, target }] }` (best-effort). */
function parseKeyResults(raw: unknown): readonly KeyResult[] {
  const record = asRecord(raw);
  const list = Array.isArray(record.key_results) ? record.key_results : [];
  return list
    .map((entry): KeyResult | undefined => {
      const item = asRecord(entry);
      const label = asText(item.label);
      const value = asNumber(item.value);
      const target = asNumber(item.target);
      if (label === undefined || value === undefined || target === undefined || target <= 0) {
        return undefined;
      }
      return { label, value, target };
    })
    .filter((item): item is KeyResult => item !== undefined);
}

/** Objective headline: `{ objective: string }`. */
function parseObjective(raw: unknown): string | undefined {
  return asText(asRecord(raw).objective);
}

/** Roadmap items: `{ now: string[], next: string[], later: string[] }`. */
function parseRoadmap(raw: unknown): readonly RoadmapItem[] {
  const record = asRecord(raw);
  const phases: readonly RoadmapItem["phase"][] = ["now", "next", "later"];
  return phases.flatMap((phase) => {
    const items = Array.isArray(record[phase]) ? (record[phase] as unknown[]) : [];
    return items
      .map((entry) => asText(entry))
      .filter((label): label is string => label !== undefined)
      .map((label) => ({ label, phase }));
  });
}

/** Live runs from the `live_runs` link field: `[{ id, stage, status }]`. */
function parseLiveRuns(raw: unknown): readonly LiveRun[] {
  const list = Array.isArray(raw) ? raw : [];
  const allowed: ReadonlySet<LiveRun["status"]> = new Set([
    "success",
    "warning",
    "error",
    "info",
    "default",
  ]);
  return list
    .map((entry): LiveRun | undefined => {
      const item = asRecord(entry);
      const id = asText(item.id);
      const stage = asText(item.stage) ?? "—";
      const rawStatus = asText(item.status);
      const status: LiveRun["status"] =
        rawStatus !== undefined && allowed.has(rawStatus as LiveRun["status"])
          ? (rawStatus as LiveRun["status"])
          : "default";
      return id === undefined ? undefined : { id, stage, status };
    })
    .filter((item): item is LiveRun => item !== undefined);
}

/** Bets list: `string[]`. */
function parseBets(raw: unknown): readonly string[] {
  return Array.isArray(raw)
    ? raw.map((entry) => asText(entry)).filter((entry): entry is string => entry !== undefined)
    : [];
}

// ---------------------------------------------------------------------------
// Roadmap phase -> quiet ColorBadge variant.
// ---------------------------------------------------------------------------

const ROADMAP_VARIANT = {
  now: "blue-subtle",
  next: "gray-subtle",
  later: "amber-subtle",
} as const;

const ROADMAP_LABEL = { now: "Now", next: "Next", later: "Later" } as const;

// ---------------------------------------------------------------------------
// Sections.
// ---------------------------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="font-mono text-[10px] uppercase tracking-wide text-neutral-9">{children}</h4>
  );
}

function NorthStarRow({ layer }: { layer: ContextLayer }) {
  const t = useTranslations("startupOs");
  const nsm = asText(fieldValueOf(layer, "nsm"));
  const bets = parseBets(fieldValueOf(layer, "bets"));

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <KpiCard
        title="North-star metric"
        value={nsm ?? "Not set"}
        icon={<Target aria-hidden="true" className="size-5 text-neutral-10" />}
        description={nsm ? undefined : "Define the single metric the company optimizes."}
      />
      <div className="rounded-[var(--radius-lg)] border border-neutral-6 bg-card p-4">
        <MetricCard
          label="Active bets"
          value={bets.length}
          icon={<ChartActivity aria-hidden="true" />}
          description={bets.length > 0 ? bets.slice(0, 2).join(" · ") : t("execution.noBets")}
        />
      </div>
    </div>
  );
}

function OkrSection({ layer }: { layer: ContextLayer }) {
  const okrRaw = fieldValueOf(layer, "okrs");
  const objective = parseObjective(okrRaw);
  const keyResults = parseKeyResults(okrRaw);

  if (objective === undefined && keyResults.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-2">
      <SectionLabel>OKR</SectionLabel>
      {objective ? <p className="text-sm text-neutral-12">{objective}</p> : null}
      <div className="flex flex-col gap-2.5">
        {keyResults.map((kr) => {
          const pct = Math.round((kr.value / kr.target) * 100);
          return (
            <div key={kr.label} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-xs text-neutral-11">{kr.label}</span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-neutral-10">
                  {kr.value}/{kr.target}
                  <span className="ml-1.5 text-neutral-9">{pct}%</span>
                </span>
              </div>
              <Progress
                value={kr.value}
                max={kr.target}
                size="sm"
                aria-label={`${kr.label}: ${pct}% complete`}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RoadmapSection({ layer }: { layer: ContextLayer }) {
  const items = parseRoadmap(fieldValueOf(layer, "roadmap"));
  if (items.length === 0) {
    return null;
  }
  return (
    <section className="flex flex-col gap-2">
      <SectionLabel>Roadmap</SectionLabel>
      <div className="flex flex-wrap items-center gap-1.5">
        {items.map((item) => (
          <ColorBadge
            key={`${item.phase}-${item.label}`}
            variant={ROADMAP_VARIANT[item.phase]}
            size="sm"
            capitalize={false}
          >
            <span className="font-mono text-[10px] uppercase tracking-wide">
              {ROADMAP_LABEL[item.phase]}
            </span>
            <span className="ml-1.5">{item.label}</span>
          </ColorBadge>
        ))}
      </div>
    </section>
  );
}

function LiveRunsSection({ layer }: { layer: ContextLayer }) {
  const t = useTranslations("startupOs");
  const runs = parseLiveRuns(fieldValueOf(layer, "live_runs"));
  return (
    <section className="flex flex-col gap-2">
      <SectionLabel>Live runs</SectionLabel>
      {runs.length === 0 ? (
        <p className="text-xs italic text-neutral-9">{t("execution.noRuns")}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {runs.map((run) => (
            <li key={run.id} className="flex items-center gap-2">
              <span className="font-mono text-xs tabular-nums text-neutral-11">{run.id}</span>
              <StatusBadge
                leftIcon={LoaderCircle}
                leftLabel={run.stage}
                rightLabel={run.status}
                status={run.status}
                className={cn("font-mono text-[11px]")}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ControlDeck({ layer }: ControlDeckProps) {
  const bets = parseBets(fieldValueOf(layer, "bets"));

  return (
    <div className="flex flex-col gap-4">
      <NorthStarRow layer={layer} />

      <OkrSection layer={layer} />

      <RoadmapSection layer={layer} />

      {bets.length > 0 ? (
        <section className="flex flex-col gap-2">
          <SectionLabel>Bets</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {bets.map((bet) => (
              <Badge key={bet} variant="gray-subtle" size="sm">
                {bet}
              </Badge>
            ))}
          </div>
        </section>
      ) : null}

      <Separator className="bg-neutral-6" />

      <LiveRunsSection layer={layer} />
    </div>
  );
}

ControlDeck.displayName = "ControlDeck";
