import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { createPublicDocsUrl } from "@/lib/docs-links";
import { hereOnly, type SiteId } from "@/site-map";

export interface FooterColumn {
  titleKey: string;
  links: {
    labelKey: string;
    href: string;
    external?: boolean;
    /** An external link that belongs to one site only (see site-map `belongsHere`). */
    site?: SiteId;
  }[];
}

/**
 * Four columns, each holding one kind of thing. Social accounts are not a
 * column: the icons under the brand block already link them.
 */
export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    titleKey: "product",
    links: [
      { labelKey: "features", href: "/features" },
      { labelKey: "forge", href: getBrandOrigin("forge"), external: true, site: "nebutra" },
      { labelKey: "pricing", href: "/pricing" },
      { labelKey: "changelog", href: "/changelog" },
      { labelKey: "roadmap", href: "/roadmap" },
      { labelKey: "docs", href: createPublicDocsUrl(), external: true },
    ],
  },
  {
    titleKey: "resources",
    links: [
      { labelKey: "blog", href: "/blog" },
      { labelKey: "playbook", href: "/playbook" },
      { labelKey: "ideas", href: "/ideas" },
      { labelKey: "opc", href: "/about/products" },
    ],
  },
  {
    titleKey: "company",
    links: [
      { labelKey: "about", href: "/about" },
      { labelKey: "careers", href: "/careers" },
      { labelKey: "contact", href: "/contact" },
      { labelKey: "faq", href: "/faq" },
    ],
  },
  {
    titleKey: "legal",
    links: [
      { labelKey: "privacy", href: "/privacy" },
      { labelKey: "terms", href: "/terms" },
      { labelKey: "cookies", href: "/cookies" },
      { labelKey: "dpa", href: "/dpa" },
      { labelKey: "refund", href: "/refund" },
      { labelKey: "credits", href: "/credits" },
      { labelKey: "licensing", href: "/licensing" },
      { labelKey: "security", href: "/security" },
    ],
  },
];

/** The columns as this site shows them: links to pages it does not serve dropped, empty columns gone. */
export const FOOTER_COLUMNS_HERE: FooterColumn[] = FOOTER_COLUMNS.map((column) => ({
  ...column,
  links: hereOnly(column.links),
})).filter((column) => column.links.length > 0);
