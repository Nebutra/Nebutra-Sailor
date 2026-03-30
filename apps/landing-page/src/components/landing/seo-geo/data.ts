import { BarChart3, Globe, Languages, Search, Sparkles, Zap } from "lucide-react";
import type * as React from "react";
import type { ComponentType } from "react";

export interface FeatureCardData {
  icon: ComponentType<{ className?: string; style?: React.CSSProperties }>;
  titleKey: string;
  descKey: string;
  accentColor: string;
}

export const SEO_CARDS: FeatureCardData[] = [
  {
    icon: Search,
    titleKey: "card1Title",
    descKey: "card1Desc",
    accentColor: "var(--brand-primary)",
  },
  {
    icon: Sparkles,
    titleKey: "card2Title",
    descKey: "card2Desc",
    accentColor: "var(--brand-accent)",
  },
  {
    icon: Languages,
    titleKey: "card3Title",
    descKey: "card3Desc",
    accentColor: "var(--brand-tertiary)",
  },
];

export const GEO_CARDS: FeatureCardData[] = [
  { icon: Zap, titleKey: "card4Title", descKey: "card4Desc", accentColor: "var(--status-success)" },
  {
    icon: BarChart3,
    titleKey: "card5Title",
    descKey: "card5Desc",
    accentColor: "var(--brand-primary)",
  },
  { icon: Globe, titleKey: "card6Title", descKey: "card6Desc", accentColor: "var(--brand-accent)" },
];

export interface StatItem {
  valueKey: string;
  labelKey: string;
}

export const STATS: StatItem[] = [
  { valueKey: "stat1Value", labelKey: "stat1Label" },
  { valueKey: "stat2Value", labelKey: "stat2Label" },
  { valueKey: "stat3Value", labelKey: "stat3Label" },
  { valueKey: "stat4Value", labelKey: "stat4Label" },
];
