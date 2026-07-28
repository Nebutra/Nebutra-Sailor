import {
  Api,
  Connection,
  Cpu,
  CreditCard,
  Database,
  Droplet,
  Layers,
  Shield,
  TerminalWindow as TerminalSquare,
} from "@nebutra/icons";
import type { ComponentType } from "react";

export type FeatureGroupTokens = {
  /** 4-stop hex array for AuroraText / AuroraBackground gradient seed. */
  auroraColors: string[];
  /** Background ambient variant when used with AuroraBackground primitive. */
  ambient: "subtle" | "vivid" | "monochrome";
  /** Iconic Geist icon for the group. */
  icon: ComponentType<{ className?: string }>;
  /** Docs path appended to createPublicDocsUrl(). */
  docsPath: string;
};

export const FEATURE_GROUP_TOKENS: Record<string, FeatureGroupTokens> = {
  ai: {
    auroraColors: ["#9333ea", "#3b82f6", "#22d3ee", "#a855f7"],
    ambient: "subtle",
    icon: Cpu,
    docsPath: "ai/overview",
  },
  iam: {
    auroraColors: ["var(--status-danger)", "#f97316", "#fb7185", "#dc2626"],
    ambient: "subtle",
    icon: Shield,
    docsPath: "concepts/permissions",
  },
  integrations: {
    auroraColors: ["#06b6d4", "#3b82f6", "#22d3ee", "#0ea5e9"],
    ambient: "subtle",
    icon: Connection,
    docsPath: "integrations/overview",
  },
  platform: {
    auroraColors: ["#3b82f6", "#6366f1", "var(--brand-tertiary)", "#0ea5e9"],
    ambient: "subtle",
    icon: Database,
    docsPath: "database/overview",
  },
  design: {
    auroraColors: ["var(--brand-accent)", "hsl(var(--primary))", "#06b6d4", "#38bdf8"],
    ambient: "subtle",
    icon: Droplet,
    docsPath: "design/tokens",
  },
  commerce: {
    auroraColors: ["var(--status-success)", "#06b6d4", "#34d399", "#0ea5e9"],
    ambient: "subtle",
    icon: CreditCard,
    docsPath: "payments/overview",
  },
  gateway: {
    auroraColors: ["var(--status-success)", "#3b82f6", "#22d3ee", "#34d399"],
    ambient: "subtle",
    icon: Api,
    docsPath: "development/api-gateway",
  },
  ops: {
    auroraColors: ["var(--status-warning)", "var(--status-success)", "#fbbf24", "#84cc16"],
    ambient: "monochrome",
    icon: TerminalSquare,
    docsPath: "development/project-structure",
  },
};

export const DEFAULT_GROUP_TOKENS: FeatureGroupTokens = {
  auroraColors: ["#3b82f6", "#06b6d4", "#0ea5e9", "#38bdf8"],
  ambient: "subtle",
  icon: Layers,
  docsPath: "development/project-structure",
};

export function getGroupTokens(group: string): FeatureGroupTokens {
  return FEATURE_GROUP_TOKENS[group] ?? DEFAULT_GROUP_TOKENS;
}
