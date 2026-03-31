import { FileText, ShieldCheck, Sparkles } from "@nebutra/icons";
import type * as React from "react";
import type { ComponentType } from "react";

export interface TerminalToken {
  text: string;
  color?: string; // CSS compatible color strings
  glowColor?: string;
}

export interface AgentCardData {
  icon: ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  titleKey: "card1Title" | "card2Title" | "card3Title";
  descKey: "card1Desc" | "card2Desc" | "card3Desc";
  accent: string;
  tokens: TerminalToken[];
}

export const AGENT_CARDS: AgentCardData[] = [
  {
    icon: FileText,
    titleKey: "card1Title",
    descKey: "card1Desc",
    accent: "var(--status-warning)",
    tokens: [
      { text: "CLAUDE.md", color: "var(--status-warning)" },
      { text: " -> ", color: "rgba(128,128,128,0.5)" }, // Arrow color
      { text: "Component rules, token governance, import boundaries", color: "gray" },
    ],
  },
  {
    icon: ShieldCheck,
    titleKey: "card2Title",
    descKey: "card2Desc",
    accent: "var(--brand-tertiary)",
    tokens: [
      { text: "7 architecture tests", color: "var(--brand-tertiary)" },
      { text: " -> ", color: "rgba(128,128,128,0.5)" },
      { text: "dependency flow, token usage, contrast ratio", color: "gray" },
    ],
  },
  {
    icon: Sparkles,
    titleKey: "card3Title",
    descKey: "card3Desc",
    accent: "var(--brand-primary)",
    tokens: [
      { text: "Agent reads context", color: "var(--status-success)" },
      { text: " -> ", color: "rgba(128,128,128,0.5)" },
      { text: "writes code", color: "gray" },
      { text: " -> ", color: "rgba(128,128,128,0.5)" },
      { text: "tests pass", color: "gray" },
      { text: " -> ", color: "rgba(128,128,128,0.5)" },
      { text: "ship", color: "var(--brand-primary)", glowColor: "var(--brand-primary)" },
    ],
  },
];
