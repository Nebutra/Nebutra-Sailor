/**
 * Resources taxonomy — single source of truth for the two-column Resources
 * mega-menu (DEVELOPERS / COMPANY), mirroring the `solutions-data` pattern.
 *
 * Structure only: ids, groups, icons, hrefs. Copy (group + item label/tagline)
 * lives in `apps/landing/messages/*.json` under the `resourcesCatalog`
 * namespace — this menu is client-only, and the namespace is small enough to
 * ship to the browser directly (see layout.tsx CLIENT_NAMESPACES).
 */

import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import {
  BlendMode,
  BookOpen,
  Briefcase,
  Eye,
  FileText,
  GitPullRequest,
  Globe,
  Lightning,
  Notification,
  Pencil,
  Route,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "@nebutra/icons";
import type { ComponentType } from "react";
import { createPublicDocsUrl } from "@/lib/docs-links";
import { hereOnly, type SiteId } from "@/site-map";

export type ResourceIcon = ComponentType<{ className?: string }>;
export type ResourceGroupId = "developers" | "company";

export interface ResourceGroup {
  id: ResourceGroupId;
}

export interface ResourceLink {
  /** Translation key into `resourcesCatalog.items.<id>`. */
  id: string;
  groupId: ResourceGroupId;
  icon: ResourceIcon;
  href: string;
  /** Opens in a new tab and shows an outbound arrow. */
  external?: boolean;
  /** An external link that belongs to one site only (see site-map `belongsHere`). */
  site?: SiteId;
}

export const RESOURCE_GROUPS: ResourceGroup[] = [{ id: "developers" }, { id: "company" }];

export const RESOURCES: ResourceLink[] = [
  // ── Developers ────────────────────────────────────────────────────────────
  {
    id: "open-platform",
    groupId: "developers",
    icon: Globe,
    href: "/open",
  },
  {
    id: "docs",
    groupId: "developers",
    icon: FileText,
    href: createPublicDocsUrl(),
    external: true,
  },
  {
    id: "forge",
    groupId: "developers",
    icon: Wrench,
    href: getBrandOrigin("forge"),
    external: true,
    site: "nebutra",
  },
  {
    id: "blog",
    groupId: "developers",
    icon: Pencil,
    href: "/blog",
  },
  {
    id: "changelog",
    groupId: "developers",
    icon: GitPullRequest,
    href: "/changelog",
  },
  {
    id: "roadmap",
    groupId: "developers",
    icon: Route,
    href: "/roadmap",
  },
  {
    id: "design-system",
    groupId: "developers",
    icon: BlendMode,
    href: "https://design.nebutra.com",
    external: true,
    site: "nebutra",
  },
  {
    id: "status",
    groupId: "developers",
    icon: Lightning,
    href: "/status",
  },
  // ── Company ────────────────────────────────────────────────────────────────
  {
    id: "about",
    groupId: "company",
    icon: Sparkles,
    href: "/about",
  },
  {
    id: "careers",
    groupId: "company",
    icon: Briefcase,
    href: "/careers",
  },
  {
    id: "newsroom",
    groupId: "company",
    icon: Notification,
    href: "/news",
  },
  {
    id: "playbook",
    groupId: "company",
    icon: BookOpen,
    href: "/playbook",
  },
  {
    id: "showcase",
    groupId: "company",
    icon: Eye,
    href: "/showcase",
  },
  {
    id: "security",
    groupId: "company",
    icon: ShieldCheck,
    href: "/security",
  },
];

/** A group's links that belong on this site (the template drops Nebutra's own). */
export function getGroupResources(group: ResourceGroup): ResourceLink[] {
  return hereOnly(RESOURCES).filter((resource) => resource.groupId === group.id);
}

/** The groups with at least one link on this site. */
export const RESOURCE_GROUPS_HERE: ResourceGroup[] = RESOURCE_GROUPS.filter(
  (group) => getGroupResources(group).length > 0,
);
