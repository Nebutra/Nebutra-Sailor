import { brand } from "@nebutra/brand/metadata";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { createPublicDocsUrl } from "@/lib/docs-links";

export interface FooterColumn {
  titleKey: string;
  links: {
    labelKey: string;
    href: string;
    external?: boolean;
  }[];
}

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    titleKey: "product",
    links: [
      { labelKey: "features", href: "/features" },
      { labelKey: "forge", href: getBrandOrigin("forge"), external: true },
      { labelKey: "pricing", href: "/pricing" },
      { labelKey: "about", href: "/about" },
      { labelKey: "careers", href: "/careers" },
    ],
  },
  {
    titleKey: "resources",
    links: [
      { labelKey: "blog", href: "/blog" },
      { labelKey: "playbook", href: "/playbook" },
      { labelKey: "changelog", href: "/changelog" },
      { labelKey: "roadmap", href: "/roadmap" },
      { labelKey: "docs", href: createPublicDocsUrl(), external: true },
      { labelKey: "ideas", href: "/ideas" },
      { labelKey: "opc", href: "/about/products" },
    ],
  },
  {
    titleKey: "legal",
    links: [
      { labelKey: "security", href: "/security" },
      { labelKey: "privacy", href: "/privacy" },
      { labelKey: "terms", href: "/terms" },
      { labelKey: "cookies", href: "/cookies" },
      { labelKey: "dpa", href: "/dpa" },
      { labelKey: "refund", href: "/refund" },
      { labelKey: "licensing", href: "/licensing" },
      { labelKey: "contact", href: "/contact" },
      { labelKey: "faq", href: "/faq" },
    ],
  },
  {
    titleKey: "community",
    links: [
      {
        labelKey: "github",
        href: `${brand.social.github}/${brand.name}-Sailor`,
        external: true,
      },
      { labelKey: "discord", href: brand.social.discord, external: true },
      {
        labelKey: "twitter",
        href: brand.social.twitter.replace("https://twitter.com/", "https://x.com/"),
        external: true,
      },
    ],
  },
];
