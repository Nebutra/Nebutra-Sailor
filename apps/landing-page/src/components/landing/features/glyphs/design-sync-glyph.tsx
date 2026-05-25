import { ArrowRight, BlendMode, GitBranch, RefreshClockwise as Refresh } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";

import type { SubpackageGlyphProps } from "./types";

type NodeTone = "purple" | "gray" | "primary";

const NODE_TONE_STYLES: Record<
  NodeTone,
  { bg: string; border: string; text: string; iconColor: string }
> = {
  purple: {
    bg: "color-mix(in oklab, #8b5cf6 12%, transparent)",
    border: "color-mix(in oklab, #8b5cf6 35%, transparent)",
    text: "var(--neutral-12)",
    iconColor: "#8b5cf6",
  },
  gray: {
    bg: "var(--neutral-3)",
    border: "var(--neutral-7)",
    text: "var(--neutral-12)",
    iconColor: "var(--neutral-11)",
  },
  primary: {
    bg: "color-mix(in oklab, var(--brand-primary) 14%, transparent)",
    border: "color-mix(in oklab, var(--brand-primary) 38%, transparent)",
    text: "var(--neutral-12)",
    iconColor: "var(--brand-primary)",
  },
};

function FlowNode({ label, tone }: { label: string; tone: NodeTone }) {
  const styles = NODE_TONE_STYLES[tone];
  return (
    <div
      className="flex items-center gap-1.5 rounded-md px-2 py-1"
      style={{
        background: styles.bg,
        border: `1px solid ${styles.border}`,
        color: styles.text,
      }}
    >
      <BlendMode size={12} style={{ color: styles.iconColor }} />
      <span className="font-mono text-[11px] leading-none" style={{ color: styles.text }}>
        {label}
      </span>
    </div>
  );
}

function LogRow({ verb, meta, time }: { verb: string; meta: string; time: string }) {
  return (
    <div className="flex items-center justify-between gap-2 font-mono text-[10.5px] leading-none">
      <div className="flex min-w-0 items-center gap-1.5">
        <Badge
          variant="outline"
          className="h-[18px] rounded-[4px] px-1.5 font-mono text-[10px] leading-none"
        >
          {verb}
        </Badge>
        <span className="truncate" style={{ color: "var(--neutral-11)" }}>
          {meta}
        </span>
      </div>
      <span style={{ color: "var(--neutral-10)" }}>{time}</span>
    </div>
  );
}

export function DesignSyncGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="flex w-full flex-col justify-between gap-2 rounded-md p-3"
      style={{
        height: 160,
        background: "var(--neutral-2)",
      }}
    >
      <div className="flex items-center justify-between gap-1.5">
        <FlowNode label="Figma" tone="purple" />
        <ArrowRight size={12} style={{ color: "var(--neutral-9)" }} />
        <FlowNode label="git" tone="gray" />
        <ArrowRight size={12} style={{ color: "var(--neutral-9)" }} />
        <FlowNode label="@nebutra/tokens" tone="primary" />
      </div>

      <div
        className="flex flex-col gap-1.5 rounded-[6px] px-2 py-2"
        style={{
          background: "var(--neutral-1)",
          border: "1px solid var(--neutral-6)",
        }}
      >
        <LogRow verb="pull" meta="1.2s · 47 tokens updated" time="12m ago" />
        <LogRow verb="push" meta="dry-run · 3 token diffs" time="1h ago" />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Refresh size={11} style={{ color: "var(--neutral-10)" }} />
          <span
            className="font-mono text-[10px] leading-none"
            style={{ color: "var(--neutral-10)" }}
          >
            provider-agnostic · CI workflow
          </span>
        </div>
        <GitBranch size={11} style={{ color: "var(--neutral-9)" }} />
      </div>
    </div>
  );
}
