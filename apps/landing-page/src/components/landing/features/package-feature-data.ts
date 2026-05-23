import type { ReactNode } from "react";
import { type FileNode, TREE_DATA } from "@/lib/constants/landing-data";

type FeatureKind = "capability" | "group" | "package";

export type FeatureVisualVariant =
  | "orbit"
  | "corridor"
  | "bus"
  | "stack"
  | "spectrum"
  | "ledger"
  | "gateway-corridor"
  | "tape";

export type FeatureTone = {
  /** CSS color used for accent strokes, halos, single-color highlights. */
  accent: string;
  /** Secondary accent — usually a complementary brand color. */
  secondary: string;
  /** Background radial halo color (already includes alpha). */
  halo: string;
  /** Soft chip / chip-on-dark background. */
  chip: string;
  /** Hairline border for tone-tinted surfaces. */
  hairline: string;
  /** Linear gradient string for spectrum/ledger fills. */
  gradient: string;
  /** Single label used in the eyebrow / monospace annotations. */
  label: string;
};

export type PackageFeatureEntry = {
  children: string[];
  description: string;
  group: string;
  groupLabel: string;
  icon?: ReactNode;
  kind: FeatureKind;
  label: string;
  path: string;
  slug: string;
  visualVariant: FeatureVisualVariant;
  tone: FeatureTone;
};

const GROUP_LABELS: Record<string, { en: string; zh: string }> = {
  ai: { en: "AI runtime", zh: "AI 运行时" },
  commerce: { en: "commerce", zh: "商业化" },
  design: { en: "design system", zh: "设计系统" },
  gateway: { en: "gateway", zh: "网关" },
  iam: { en: "identity and trust", zh: "身份与信任" },
  integrations: { en: "integrations", zh: "集成" },
  ops: { en: "operations", zh: "运维" },
  platform: { en: "platform", zh: "平台" },
};

const GROUP_TO_VARIANT: Record<string, FeatureVisualVariant> = {
  ai: "orbit",
  iam: "corridor",
  integrations: "bus",
  platform: "stack",
  design: "spectrum",
  commerce: "ledger",
  gateway: "gateway-corridor",
  ops: "tape",
};

const GROUP_TONES: Record<string, FeatureTone> = {
  ai: {
    accent: "var(--brand-accent)",
    secondary: "var(--brand-primary)",
    halo: "color-mix(in oklch, var(--brand-accent) 32%, transparent)",
    chip: "color-mix(in oklch, var(--brand-accent) 12%, transparent)",
    hairline: "color-mix(in oklch, var(--brand-accent) 28%, transparent)",
    gradient: "linear-gradient(135deg, var(--brand-primary), var(--brand-accent))",
    label: "AI runtime",
  },
  iam: {
    accent: "var(--brand-primary)",
    secondary: "color-mix(in oklch, var(--brand-primary), var(--brand-accent) 30%)",
    halo: "color-mix(in oklch, var(--brand-primary) 32%, transparent)",
    chip: "color-mix(in oklch, var(--brand-primary) 14%, transparent)",
    hairline: "color-mix(in oklch, var(--brand-primary) 30%, transparent)",
    gradient:
      "linear-gradient(135deg, var(--brand-primary), color-mix(in oklch, var(--brand-primary), white 35%))",
    label: "Identity & Trust",
  },
  integrations: {
    accent: "color-mix(in oklch, var(--brand-accent), var(--brand-primary) 30%)",
    secondary: "var(--brand-primary)",
    halo: "color-mix(in oklch, var(--brand-accent) 25%, transparent)",
    chip: "color-mix(in oklch, var(--brand-accent) 10%, transparent)",
    hairline: "color-mix(in oklch, var(--brand-accent) 28%, transparent)",
    gradient: "linear-gradient(90deg, var(--brand-primary), var(--brand-accent))",
    label: "Integrations",
  },
  platform: {
    accent: "color-mix(in oklch, var(--brand-primary), white 18%)",
    secondary: "var(--brand-accent)",
    halo: "color-mix(in oklch, var(--brand-primary) 32%, transparent)",
    chip: "color-mix(in oklch, var(--brand-primary) 14%, transparent)",
    hairline: "color-mix(in oklch, var(--brand-primary) 28%, transparent)",
    gradient:
      "linear-gradient(180deg, color-mix(in oklch, var(--brand-primary), white 18%), color-mix(in oklch, var(--brand-primary), black 20%))",
    label: "Platform",
  },
  design: {
    accent: "color-mix(in oklch, var(--brand-accent), var(--brand-primary) 50%)",
    secondary: "var(--brand-accent)",
    halo: "color-mix(in oklch, var(--brand-accent) 30%, transparent)",
    chip: "color-mix(in oklch, var(--brand-accent) 12%, transparent)",
    hairline: "color-mix(in oklch, var(--brand-accent) 28%, transparent)",
    gradient:
      "linear-gradient(90deg, var(--brand-primary) 0%, color-mix(in oklch, var(--brand-primary), var(--brand-accent) 50%) 50%, var(--brand-accent) 100%)",
    label: "Design System",
  },
  commerce: {
    accent: "color-mix(in oklch, var(--brand-accent), white 8%)",
    secondary: "var(--brand-primary)",
    halo: "color-mix(in oklch, var(--brand-accent) 28%, transparent)",
    chip: "color-mix(in oklch, var(--brand-accent) 10%, transparent)",
    hairline: "color-mix(in oklch, var(--brand-accent) 26%, transparent)",
    gradient:
      "linear-gradient(90deg, color-mix(in oklch, var(--brand-accent), var(--brand-primary) 20%), var(--brand-accent))",
    label: "Commerce",
  },
  gateway: {
    accent: "var(--brand-primary)",
    secondary: "var(--brand-accent)",
    halo: "color-mix(in oklch, var(--brand-primary) 28%, transparent)",
    chip: "color-mix(in oklch, var(--brand-primary) 12%, transparent)",
    hairline: "color-mix(in oklch, var(--brand-primary) 28%, transparent)",
    gradient: "linear-gradient(90deg, var(--brand-primary), var(--brand-accent))",
    label: "Gateway",
  },
  ops: {
    accent: "color-mix(in oklch, var(--neutral-12), var(--brand-accent) 40%)",
    secondary: "var(--brand-primary)",
    halo: "color-mix(in oklch, var(--brand-primary) 20%, transparent)",
    chip: "color-mix(in oklch, var(--neutral-12) 10%, transparent)",
    hairline: "color-mix(in oklch, var(--neutral-12) 26%, transparent)",
    gradient:
      "linear-gradient(135deg, color-mix(in oklch, var(--neutral-12), white 22%), color-mix(in oklch, var(--neutral-12), var(--brand-accent) 35%))",
    label: "Operations",
  },
};

const DEFAULT_TONE: FeatureTone = GROUP_TONES.platform;

function toneForGroup(group: string): FeatureTone {
  return GROUP_TONES[group] ?? DEFAULT_TONE;
}

function variantForGroup(group: string): FeatureVisualVariant {
  return GROUP_TO_VARIANT[group] ?? "stack";
}

const ZH_GROUP_SUMMARIES: Record<string, string> = {
  ai: "把智能体循环、RAG、工具协议、沙箱执行和多模态流水线收束到应用外部。",
  commerce: "把访问、计费、合同、license、营销和用量计量放在同一商业边界内。",
  design: "把品牌、tokens、icons、theme、UI primitive 和设计同步组织成一条供应链。",
  gateway: "把 BFF、鉴权、租户、限流、OpenAPI 和路由契约放在请求入口处。",
  iam: "把认证、身份、权限、租户、审计和密钥行为收束到同一个信任边界。",
  integrations: "把缓存、队列、搜索、消息、存储、上传和 webhook 作为可替换连接层。",
  ops: "把 CLI、预设、CMS、Supabase 和合规支持放在发布与运维边界。",
  platform: "把数据库、配置、健康检查、仓储、trace、限流和租户锁放在最低共享层。",
};

function trimDescription(description?: string) {
  return (description ?? "").replace(/^-\s*/, "").trim();
}

function featureSlugForNode(node: FileNode): string | null {
  if (node.path?.startsWith("packages/")) {
    const [, group, name] = node.path.split("/");
    return name ?? group ?? null;
  }

  if (node.featureAnchor) {
    return node.featureAnchor.replace(/^capability-/, "");
  }

  return null;
}

function featureKindForNode(node: FileNode): FeatureKind {
  if (node.path?.startsWith("packages/")) {
    return node.path.split("/").length === 2 ? "group" : "package";
  }

  return "capability";
}

function featureGroupForNode(node: FileNode, slug: string): string {
  if (node.path?.startsWith("packages/")) {
    return node.path.split("/")[1] ?? slug;
  }

  return slug;
}

function flattenFeatureNodes(nodes: FileNode[], entries: PackageFeatureEntry[] = []) {
  for (const node of nodes) {
    const slug = featureSlugForNode(node);
    if (slug && node.path) {
      const group = featureGroupForNode(node, slug);
      entries.push({
        children: node.children?.map((child) => child.label) ?? [],
        description: trimDescription(node.description),
        group,
        groupLabel: GROUP_LABELS[group]?.en ?? group,
        icon: node.icon,
        kind: featureKindForNode(node),
        label: node.label,
        path: node.path,
        slug,
        visualVariant: variantForGroup(group),
        tone: toneForGroup(group),
      });
    }

    if (node.children?.length) {
      flattenFeatureNodes(node.children, entries);
    }
  }

  return entries;
}

export const PACKAGE_FEATURE_ENTRIES = flattenFeatureNodes(TREE_DATA);

export function getPackageFeatureEntry(slug: string) {
  return PACKAGE_FEATURE_ENTRIES.find((entry) => entry.slug === slug);
}

export function getRelatedEntries(entry: PackageFeatureEntry, limit = 4): PackageFeatureEntry[] {
  const candidates = PACKAGE_FEATURE_ENTRIES.filter(
    (candidate) =>
      candidate.group === entry.group &&
      candidate.kind === "package" &&
      candidate.slug !== entry.slug,
  );

  if (candidates.length <= limit) return candidates;

  // Stable selection: pick the first N in the natural source order.
  return candidates.slice(0, limit);
}

export function getGroupLabel(group: string, locale: "en" | "zh"): string {
  return GROUP_LABELS[group]?.[locale] ?? group;
}

export function getPackageFeatureHref(locale: string, node: FileNode) {
  const slug = featureSlugForNode(node);
  return slug ? `/${locale}/features/${slug}` : null;
}

export function getFeatureSummary(entry: PackageFeatureEntry, locale: "en" | "zh") {
  if (locale === "zh") {
    if (entry.kind === "group" || entry.kind === "capability") {
      return ZH_GROUP_SUMMARIES[entry.group] ?? entry.description;
    }

    const groupLabel = GROUP_LABELS[entry.group]?.zh ?? entry.group;
    return `${entry.label} 是 ${groupLabel} 能力域中的独立 package，边界保持在 ${entry.path}，用于承载一个清晰职责并向上层暴露稳定接口。`;
  }

  if (entry.kind === "group" || entry.kind === "capability") {
    return entry.description || `${entry.label} capability surface inside Nebutra Sailor.`;
  }

  const groupLabel = GROUP_LABELS[entry.group]?.en ?? entry.group;
  return `${entry.label} is a focused package inside the ${groupLabel} capability domain. Its boundary stays at ${entry.path}, giving applications one stable surface to compose.`;
}

export function getFeatureTitle(entry: PackageFeatureEntry, locale: "en" | "zh") {
  if (locale === "zh") {
    if (entry.kind === "package") return `${entry.label} 能力包`;
    return `${GROUP_LABELS[entry.group]?.zh ?? entry.label}能力面`;
  }

  if (entry.kind === "package") return `${entry.label} package`;
  return `${GROUP_LABELS[entry.group]?.en ?? entry.label} capability`;
}
