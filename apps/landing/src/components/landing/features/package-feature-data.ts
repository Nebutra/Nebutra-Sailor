import type { ReactNode } from "react";
import { type FileNode, TREE_DATA } from "@/lib/constants/landing-data";

/**
 * `packageCatalog.descriptions.<slug>` / `.groups.<id>.*` / `.folders.<id>.*`
 * keys are built at runtime from slugs and folder ids — src/types/next-intl.d.ts
 * gives every `useTranslations`/`getTranslations` call a per-literal key
 * union, which a computed dotted path can never satisfy (same shape as
 * `SiteMapTranslator` in @/nebutra/i18n). Callers that read the
 * `packageCatalog` namespace with a dynamic key narrow their translator to
 * this shape once, at the call site: `t as unknown as PackageCatalogTranslator`.
 */
export type PackageCatalogTranslator = ((
  key: string,
  values?: Record<string, string | number>,
) => string) & {
  raw: (key: string) => unknown;
  rich: (key: string, values?: Record<string, (chunks: ReactNode) => ReactNode>) => ReactNode;
};

type FeatureKind = "capability" | "group" | "package";

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
};

export type SerializablePackageFeatureEntry = Omit<PackageFeatureEntry, "icon">;

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
        groupLabel: group,
        icon: node.icon,
        kind: featureKindForNode(node),
        label: node.label,
        path: node.path,
        slug,
      });
    }

    if (node.children?.length) {
      flattenFeatureNodes(node.children, entries);
    }
  }

  return entries;
}

export const PACKAGE_FEATURE_ENTRIES = flattenFeatureNodes(TREE_DATA);

export function toSerializablePackageFeatureEntry(
  entry: PackageFeatureEntry,
): SerializablePackageFeatureEntry {
  const { icon: _icon, ...serializableEntry } = entry;
  return serializableEntry;
}

export function getPackageFeatureEntry(slug: string) {
  return PACKAGE_FEATURE_ENTRIES.find((entry) => entry.slug === slug);
}

export function getPackageFeatureHref(locale: string, node: FileNode) {
  const slug = featureSlugForNode(node);
  return slug ? `/${locale}/features/${slug}` : null;
}

/**
 * A domain's name where no capability folder gives it a title:
 * `packageCatalog.groups.<group>.label` in apps/landing/messages/*.json
 * ("Operations", "运维").
 */
export function getGroupLabel(group: string, t: PackageCatalogTranslator): string {
  return t(`groups.${group}.label`);
}

/**
 * Per-package / per-group summary, looked up from the `packageCatalog`
 * i18n namespace instead of an inline bilingual map. Every package slug has
 * a `packageCatalog.descriptions.<slug>` key (package-feature-data.test.ts
 * holds that), so there is no boilerplate sentence to fall back to.
 */
export function getFeatureSummary(entry: PackageFeatureEntry, t: PackageCatalogTranslator): string {
  if (entry.kind === "package") {
    return t(`descriptions.${entry.slug}`);
  }

  return t(`groups.${entry.group}.summary`);
}
