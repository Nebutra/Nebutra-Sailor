/**
 * Solutions taxonomy — the single source of truth for the Solutions mega-menu
 * and the `/solutions/[slug]` routes.
 *
 * Structure only: ids, slugs, icons, aurora seed colors, capability anchors.
 * All copy (labels, taglines, hero, use cases, FAQ) lives in
 * `apps/landing/messages/*.json` under the `solutionsCatalog` namespace
 * (server-rendered detail pages) and a small `solutionsNav` namespace (the
 * client-only mega-menu / mobile drawer, so those don't ship the whole
 * catalog to the browser). Look copy up by `slug` / `groupId`.
 *
 * Two node types share one page template:
 *   - "content"  — methodology / best-practice pillar (top-of-funnel, dual CTA)
 *   - "offering" — a real service line like managed AI data ops (strong single CTA)
 *
 * The best-practice article strip is sourced through `SolutionContentSource`
 * (see `@/lib/solutions/content-source`), so wiring Sanity in later needs no
 * change here.
 */

import {
  Analytics,
  Brain,
  Compass,
  CreditCard,
  Database,
  Eye,
  Globe,
  Layers,
  Lightning,
  Sparkles,
  TerminalWindow,
} from "@nebutra/icons";
import type { ComponentType } from "react";

export type SolutionType = "content" | "offering";
export type NebutraIcon = ComponentType<{ className?: string }>;

export interface Solution {
  slug: string;
  type: SolutionType;
  groupId: string;
  icon: NebutraIcon;
  /** Anchors into the existing capability map (e.g. "capability-ai"). */
  capabilityAnchors?: string[];
  /** Maps to a Sanity blog category. Nullable until content exists. */
  contentCategory?: string;
}

export interface SolutionGroup {
  id: string;
  /** Seed colors for the group's AuroraText / hero. */
  auroraColors: [string, string, string, string];
  solutionSlugs: string[];
}

export const SOLUTION_GROUPS: SolutionGroup[] = [
  {
    id: "go-to-market",
    auroraColors: ["hsl(var(--primary))", "var(--brand-accent)", "#06b6d4", "#38bdf8"],
    solutionSlugs: ["go-global", "growth"],
  },
  {
    id: "build-govern",
    auroraColors: ["#6366f1", "var(--brand-tertiary)", "#3b82f6", "#a855f7"],
    solutionSlugs: ["architecture", "tech-stack", "dx"],
  },
  {
    id: "ai-data",
    auroraColors: ["#9333ea", "#3b82f6", "#22d3ee", "#a855f7"],
    solutionSlugs: ["ai", "ai-data-ops", "frontier"],
  },
  {
    id: "founder",
    auroraColors: ["var(--status-success)", "var(--status-warning)", "#34d399", "#fbbf24"],
    solutionSlugs: ["china-vc", "global-vc", "fundraising", "product-insights"],
  },
];

export const SOLUTIONS: Solution[] = [
  {
    slug: "go-global",
    type: "content",
    groupId: "go-to-market",
    icon: Globe,
    capabilityAnchors: ["capability-platform", "capability-commerce"],
    contentCategory: "go-global",
  },
  {
    slug: "growth",
    type: "content",
    groupId: "go-to-market",
    icon: Lightning,
    capabilityAnchors: ["capability-integrations"],
    contentCategory: "growth",
  },
  {
    slug: "architecture",
    type: "content",
    groupId: "build-govern",
    icon: Layers,
    capabilityAnchors: ["capability-platform"],
    contentCategory: "architecture",
  },
  {
    slug: "tech-stack",
    type: "content",
    groupId: "build-govern",
    icon: Compass,
    capabilityAnchors: ["capability-integrations", "capability-iam"],
    contentCategory: "tech-stack",
  },
  {
    slug: "dx",
    type: "content",
    groupId: "build-govern",
    icon: TerminalWindow,
    capabilityAnchors: ["capability-platform"],
    contentCategory: "dx",
  },
  {
    slug: "ai",
    type: "content",
    groupId: "ai-data",
    icon: Brain,
    capabilityAnchors: ["capability-ai"],
    contentCategory: "ai",
  },
  {
    slug: "ai-data-ops",
    type: "offering",
    groupId: "ai-data",
    icon: Database,
    contentCategory: "ai-data-ops",
  },
  {
    slug: "frontier",
    type: "content",
    groupId: "ai-data",
    icon: Sparkles,
    contentCategory: "frontier",
  },
  {
    slug: "china-vc",
    type: "content",
    groupId: "founder",
    icon: Analytics,
    contentCategory: "china-vc",
  },
  {
    slug: "global-vc",
    type: "content",
    groupId: "founder",
    icon: Globe,
    contentCategory: "global-vc",
  },
  {
    slug: "fundraising",
    type: "content",
    groupId: "founder",
    icon: CreditCard,
    contentCategory: "fundraising",
  },
  {
    slug: "product-insights",
    type: "content",
    groupId: "founder",
    icon: Eye,
    contentCategory: "product-insights",
  },
];

const SOLUTION_BY_SLUG = new Map(SOLUTIONS.map((s) => [s.slug, s]));
const GROUP_BY_ID = new Map(SOLUTION_GROUPS.map((g) => [g.id, g]));

export function getSolution(slug: string): Solution | undefined {
  return SOLUTION_BY_SLUG.get(slug);
}

export function getSolutionGroup(id: string): SolutionGroup | undefined {
  return GROUP_BY_ID.get(id);
}

export function getAllSolutionSlugs(): string[] {
  return SOLUTIONS.map((s) => s.slug);
}

/** Solutions belonging to a group, in declared order. */
export function getGroupSolutions(group: SolutionGroup): Solution[] {
  return group.solutionSlugs
    .map((slug) => SOLUTION_BY_SLUG.get(slug))
    .filter((s): s is Solution => Boolean(s));
}
