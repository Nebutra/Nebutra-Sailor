"use client";

import { Api, ArrowRight, Check, Lightning } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

/**
 * GatewayCoreGlyph
 *
 * Horizontal request-lifecycle pipeline for the @nebutra/gateway-core
 * sub-package. Five segments separated by ArrowRight chevrons:
 *   REQ -> tenancy -> rate-limit -> auth -> RES 200
 * A row of three mini metrics (p50 / p95 / ok-rate) sits below the
 * pipeline, with a small mono footer noting middleware count + overhead.
 */

type Stage = {
  key: string;
  label: string;
};

const STAGES: ReadonlyArray<Stage> = [
  { key: "tenancy", label: "tenancy" },
  { key: "rate-limit", label: "rate-limit" },
  { key: "auth", label: "auth" },
];

type Metric = {
  key: string;
  label: string;
  value: string;
  tone: "neutral" | "success";
};

const METRICS: ReadonlyArray<Metric> = [
  { key: "p50", label: "p50", value: "22ms", tone: "neutral" },
  { key: "p95", label: "p95", value: "48ms", tone: "neutral" },
  { key: "ok", label: "ok", value: "99.4%", tone: "success" },
];

const FOOTER = "5 middleware · 5ms overhead";

export function GatewayCoreGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      aria-hidden
      className="flex w-full flex-col justify-between gap-2 rounded-[var(--radius-lg)] bg-[var(--neutral-2)] px-3 py-3"
      style={{ height: 160 }}
    >
      {/* Pipeline row */}
      <div className="flex items-center gap-1.5">
        <Badge variant="gray-subtle" size="sm" icon={<Api />}>
          REQ
        </Badge>

        {STAGES.map((stage) => (
          <div key={stage.key} className="flex items-center gap-1.5">
            <ArrowRight className="h-3 w-3 shrink-0 text-[var(--neutral-10)]" />
            <div className="flex items-center gap-1 rounded-[var(--radius-md)] bg-[var(--neutral-1)] px-1.5 py-1 ring-1 ring-[var(--neutral-6)]">
              <Check className="h-3 w-3 text-[color:var(--status-success)]" />
              <span className="font-mono text-[10px] text-[var(--neutral-12)]">{stage.label}</span>
            </div>
          </div>
        ))}

        <ArrowRight className="h-3 w-3 shrink-0 text-[var(--neutral-10)]" />
        <Badge variant="green-subtle" size="sm" icon={<Lightning />}>
          RES 200
        </Badge>
      </div>

      {/* Metrics row */}
      <div className="flex items-center gap-2">
        {METRICS.map((metric) => (
          <div
            key={metric.key}
            className="flex flex-1 flex-col gap-0.5 rounded-[var(--radius-md)] bg-[var(--neutral-1)] px-2 py-1.5 ring-1 ring-[var(--neutral-5)]"
          >
            <span className="font-mono text-[9px] uppercase tracking-wide text-[var(--neutral-10)]">
              {metric.label}
            </span>
            <span
              className={`font-mono text-[12px] tabular-nums ${
                metric.tone === "success"
                  ? "text-[color:var(--status-success)]"
                  : "text-[var(--neutral-12)]"
              }`}
            >
              {metric.value}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <p className="text-center font-mono text-[10px] text-[var(--neutral-10)]">{FOOTER}</p>
    </div>
  );
}
