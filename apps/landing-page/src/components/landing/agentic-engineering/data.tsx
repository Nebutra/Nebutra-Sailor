import { FileText, ShieldCheck, Sparkles } from "@nebutra/icons";
import type * as React from "react";
import type { ComponentType } from "react";

export interface AgentCardData {
  icon: ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  titleKey: "card1Title" | "card2Title" | "card3Title";
  descKey: "card1Desc" | "card2Desc" | "card3Desc";
  accent: string;
  codeSnippet: React.ReactNode;
}

const Arrow = () => <span className="text-white/40 mx-1.5 font-black">{"->"}</span>;

export const AGENT_CARDS: AgentCardData[] = [
  {
    icon: FileText,
    titleKey: "card1Title",
    descKey: "card1Desc",
    accent: "var(--status-warning)",
    codeSnippet: (
      <>
        <span className="text-[var(--status-warning)]">CLAUDE.md</span>
        <Arrow />
        <span className="text-white/80">Component rules, token governance, import boundaries</span>
      </>
    ),
  },
  {
    icon: ShieldCheck,
    titleKey: "card2Title",
    descKey: "card2Desc",
    accent: "var(--brand-tertiary)",
    codeSnippet: (
      <>
        <span className="text-[var(--brand-tertiary)] font-semibold">7 architecture tests</span>
        <Arrow />
        <span className="text-white/80">dependency flow, token usage, contrast ratio</span>
      </>
    ),
  },
  {
    icon: Sparkles,
    titleKey: "card3Title",
    descKey: "card3Desc",
    accent: "var(--brand-primary)",
    codeSnippet: (
      <>
        <span className="text-[var(--status-success)]">Agent reads context</span>
        <Arrow />
        <span className="text-white/80">writes code</span>
        <Arrow />
        <span className="text-white/80">tests pass</span>
        <Arrow />
        <span className="text-[var(--brand-primary)] animate-pulse shadow-[0_0_10px_var(--brand-primary)]">
          ship
        </span>
      </>
    ),
  },
];
