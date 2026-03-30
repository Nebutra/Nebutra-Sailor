import { Cpu, Layers, Shield } from "@nebutra/icons";
import { Zap } from "lucide-react";
import type * as React from "react";
import type { ComponentType } from "react";

export interface CapabilityData {
  icon: ComponentType<{ className?: string; style?: React.CSSProperties }>;
  titleKey: string;
  descKey: string;
  accent: string;
  statusLine: string;
}

export const CAPABILITIES: CapabilityData[] = [
  {
    icon: Shield,
    titleKey: "items.harness.title",
    descKey: "items.harness.desc",
    accent: "var(--brand-primary)",
    statusLine: "coverage: 100% | ratchet: active | drift: 0",
  },
  {
    icon: Cpu,
    titleKey: "items.agentic.title",
    descKey: "items.agentic.desc",
    accent: "var(--brand-accent)",
    statusLine: "agents: claude • cursor • codex | mode: autonomous",
  },
  {
    icon: Zap,
    titleKey: "items.vibe.title",
    descKey: "items.vibe.desc",
    accent: "var(--status-success)",
    statusLine: "providers: openai • anthropic • local | latency: <80ms",
  },
  {
    icon: Layers,
    titleKey: "items.design.title",
    descKey: "items.design.desc",
    accent: "var(--brand-tertiary)",
    statusLine: "layers: brand → tokens → theme → ui | themes: 6",
  },
];
