/**
 * The site map of the Nebutra site — the one place sections, names and page
 * ownership are decided.
 *
 * Every naming drift so far ("Ideas" used for the essays, when Ideas is the
 * Sleptons UGC of ideas and needs; products presented as a portfolio) came
 * from these decisions living in conversation instead of in code. Navigation,
 * footer, sitemap.xml and the template's strip rules read this list; a test
 * fails when a page exists that is not listed here, or a listed live page
 * does not exist.
 *
 * Agreed with the owner 2026-09-27. Change a name or a section here, nowhere
 * else.
 *
 * Display strings (section titles, section `is` lines, page titles) live in
 * apps/landing/messages/*.json under the `siteMap` namespace, not here — this
 * file only carries the structure and the message key each entry reads.
 * `key` is the dot-path under `siteMap.pages`; a page's title is always at
 * `siteMap.pages.<key>.title` (never a bare string — a node with children,
 * e.g. "about", also carries its own `.title` alongside its children so the
 * two never collide). A section's title/description are at
 * `siteMap.sections.<id>.title` / `.is`, `id` being the key.
 */

import { SITE_ID } from "./site.config";

/** Which site a build is — see site.config.ts. */
export type SiteId = "nebutra" | "template";

export type SectionId = "home" | "journal" | "sailor" | "sleptons" | "building" | "company";

export interface Section {
  id: SectionId;
  /** Where the section's index lives. */
  path: string;
  /** Shown in the site navigation. */
  nav: boolean;
}

export const SECTIONS: readonly Section[] = [
  {
    id: "home",
    path: "/",
    nav: false,
  },
  {
    id: "journal",
    path: "/blog",
    nav: true,
  },
  {
    id: "sailor",
    path: "/sailor",
    nav: true,
  },
  // Sleptons and Building are the vision: reached from the footer's "More" and
  // the Journal, not the navigation (owner, 2026-10-10).
  {
    id: "sleptons",
    path: "/sleptons",
    nav: false,
  },
  {
    id: "building",
    path: "/building",
    nav: false,
  },
  {
    id: "company",
    path: "/about",
    nav: true,
  },
];

/**
 * The navigation, in order. Sailor and Consulting are the two businesses; the
 * Journal is the thinking; About and Investors are the company. A section
 * opens its pages beside it; a page is a plain link. Nebutra's products that
 * are not one of the businesses (KCQ, Router, Forge…) live in the footer's
 * "More" (owner, 2026-10-10: "现在只有这三样拿得出手").
 */
export type NavItem = { section: SectionId } | { page: string };

export const NAV: readonly NavItem[] = [
  { section: "sailor" },
  { page: "/consulting" },
  { section: "journal" },
  { section: "company" },
  { page: "/investors" },
];

export type PageStatus =
  | "live" //       the route exists and is served
  | "planned" //    agreed in the map, not built yet
  | "redirect"; //  kept for old links, answers with a redirect

export interface SitePage {
  /** Route under /[lang], as written in the app directory. */
  path: string;
  section: SectionId;
  /** Dot-path under `siteMap.pages` in the messages; title is at `<key>.title`. */
  key: string;
  status: PageStatus;
  redirectTo?: string;
  /**
   * Whether the page's code ships in the Sailor template (with example
   * content). false = Nebutra's own page, stripped from the template.
   */
  template: boolean;
  /**
   * How the layout frames the page. Omitted = the site navigation and footer.
   * "over-dark": the page opens on a dark hero, so the navigation starts dark.
   * "bare": the page draws its own frame (the Studio canvas frame).
   * "tool": a full-viewport tool (Sailor Studio): a compact top bar, no footer,
   * and the page fills the rest of the screen instead of scrolling it.
   */
  chrome?: "over-dark" | "bare" | "tool";
  /**
   * Listed under its section in the rail. The rail shows sections; a page
   * without this is reached from its section's own pages, the footer, or not
   * at all — which is how /features went missing when the rail replaced the
   * top navigation.
   */
  rail?: true;
}

export const SITE_MAP: readonly SitePage[] = [
  // Home — the template's is a starter site for the customer's own product (src/content/site.ts);
  // the Nebutra site leads with the Journal. The template serves: home, pricing, FAQ, contact,
  // the blog and the legal pages — Sailor's own pages (packages, changelog, roadmap…) stay here.
  { path: "/", section: "home", key: "home", status: "live", template: true },

  // Journal
  {
    path: "/blog",
    section: "journal",
    key: "blog",
    status: "live",
    template: true,
  },
  {
    path: "/blog/[slug]",
    section: "journal",
    key: "blog.slug",
    status: "live",
    template: true,
  },
  {
    path: "/blog/author/[author]",
    section: "journal",
    key: "blog.author.author",
    status: "live",
    template: true,
  },
  {
    path: "/blog/tag/[tag]",
    section: "journal",
    key: "blog.tag.tag",
    status: "live",
    template: true,
  },
  {
    path: "/news",
    rail: true,
    section: "journal",
    key: "news",
    status: "live",
    template: false,
  },
  {
    path: "/about/whitepaper",
    section: "journal",
    key: "about.whitepaper",
    status: "live",
    template: false,
  },

  // Sailor — the old landing's home becomes /sailor; its sections come with it.
  {
    path: "/sailor",
    section: "sailor",
    key: "sailor",
    status: "live",
    template: false,
  },
  {
    path: "/sailor/studio",
    rail: true,
    section: "sailor",
    key: "sailor.studio",
    status: "live",
    template: false,
    chrome: "tool",
  },
  {
    // The document Studio's Components view renders in; part of the Studio page.
    path: "/sailor/studio/frame",
    section: "sailor",
    key: "sailor.studio.frame",
    status: "live",
    template: false,
    chrome: "bare",
  },
  {
    path: "/features",
    rail: true,
    section: "sailor",
    key: "features",
    status: "live",
    template: false,
  },
  {
    path: "/features/[name]",
    section: "sailor",
    key: "features.name",
    status: "live",
    template: false,
  },
  {
    // Not in the rail or the top bar (owner, 2026-10-09): Pricing is reached from the footer
    // and from product calls to action. Creem's review only asks that it be easy to find.
    path: "/pricing",
    section: "sailor",
    key: "pricing",
    status: "live",
    template: true,
  },
  {
    path: "/licensing",
    rail: true,
    section: "sailor",
    key: "licensing",
    status: "live",
    template: false,
  },
  {
    path: "/get-license",
    section: "sailor",
    key: "getLicense",
    status: "live",
    template: false,
  },
  {
    path: "/ai/models",
    section: "sailor",
    key: "ai.models",
    status: "live",
    template: false,
  },
  {
    path: "/open",
    section: "sailor",
    key: "open",
    status: "live",
    template: false,
  },
  {
    path: "/changelog",
    rail: true,
    section: "sailor",
    key: "changelog",
    status: "live",
    template: false,
    chrome: "over-dark",
  },
  {
    path: "/changelog/[version]",
    section: "sailor",
    key: "changelog.version",
    status: "live",
    template: false,
  },
  {
    path: "/showcase",
    rail: true,
    section: "sailor",
    key: "showcase",
    status: "live",
    template: false,
  },
  {
    path: "/status",
    section: "sailor",
    key: "status",
    status: "live",
    template: true,
  },
  {
    path: "/status/history",
    section: "sailor",
    key: "status.history",
    status: "live",
    template: true,
  },
  {
    path: "/status/subscription",
    section: "sailor",
    key: "status.subscription",
    status: "live",
    template: true,
  },
  {
    path: "/status/incidents/[id]",
    section: "sailor",
    key: "status.incidents.id",
    status: "live",
    template: true,
  },
  {
    path: "/security",
    section: "sailor",
    key: "security",
    status: "live",
    template: false,
  },
  {
    path: "/refer",
    section: "sailor",
    key: "refer",
    status: "live",
    template: false,
  },

  // Sleptons — the ecosystem. Ideas is its UGC of ideas and needs (today a feedback board).
  {
    path: "/sleptons",
    section: "sleptons",
    key: "sleptons",
    status: "live",
    template: false,
  },
  {
    path: "/ideas",
    rail: true,
    section: "sleptons",
    key: "ideas",
    status: "live",
    template: false,
  },
  {
    path: "/solutions",
    rail: true,
    section: "sleptons",
    key: "solutions",
    status: "live",
    template: false,
  },
  {
    path: "/solutions/[slug]",
    section: "sleptons",
    key: "solutions.slug",
    status: "live",
    template: false,
  },
  {
    path: "/solutions/china-vc/[id]",
    section: "sleptons",
    key: "solutions.chinaVc.id",
    status: "live",
    template: false,
  },
  {
    path: "/solutions/global-vc/[id]",
    section: "sleptons",
    key: "solutions.globalVc.id",
    status: "live",
    template: false,
  },

  // Building
  {
    path: "/building",
    section: "building",
    key: "building",
    status: "live",
    template: false,
  },
  {
    path: "/about/products",
    rail: true,
    section: "building",
    key: "about.products",
    status: "live",
    template: false,
  },
  {
    path: "/roadmap",
    rail: true,
    section: "building",
    key: "roadmap",
    status: "live",
    template: false,
  },
  {
    path: "/playbook",
    rail: true,
    section: "building",
    key: "playbook",
    status: "live",
    template: false,
  },
  {
    path: "/opc",
    section: "building",
    key: "opc",
    status: "redirect",
    redirectTo: "/building",
    template: false,
  },

  // Company
  {
    path: "/about",
    section: "company",
    key: "about",
    status: "live",
    template: false,
  },
  {
    path: "/about/business-portfolio",
    section: "company",
    key: "about.businessPortfolio",
    status: "live",
    template: false,
  },
  {
    path: "/about/global",
    section: "company",
    key: "about.global",
    status: "live",
    template: false,
  },
  {
    path: "/about/innovation",
    section: "company",
    key: "about.innovation",
    status: "live",
    template: false,
  },
  {
    // Enterprise AI product delivery and going global: the second business.
    // In the navigation itself (NAV), so not in the company rail.
    path: "/consulting",
    section: "company",
    key: "consulting",
    status: "live",
    template: false,
  },
  {
    // For investors and strategic partners: the story, what is live, and a way
    // to ask for the deck. The deck itself is never on the page. In the
    // navigation itself (NAV), so not in the company rail.
    path: "/investors",
    section: "company",
    key: "investors",
    status: "live",
    template: false,
  },
  {
    path: "/careers",
    rail: true,
    section: "company",
    key: "careers",
    status: "live",
    template: false,
  },
  {
    path: "/contact",
    rail: true,
    section: "company",
    key: "contact",
    status: "live",
    template: true,
  },
  {
    path: "/faq",
    rail: true,
    section: "company",
    key: "faq",
    status: "live",
    template: true,
  },
  {
    path: "/privacy",
    section: "company",
    key: "privacy",
    status: "live",
    template: true,
  },
  {
    path: "/terms",
    section: "company",
    key: "terms",
    status: "live",
    template: true,
  },
  {
    path: "/cookies",
    section: "company",
    key: "cookies",
    status: "live",
    template: true,
  },
  {
    // The typeface credits. MiSans's licence asks the product to state it uses MiSans.
    path: "/credits",
    section: "company",
    key: "credits",
    status: "live",
    template: true,
  },
  {
    path: "/dpa",
    section: "company",
    key: "dpa",
    status: "live",
    template: true,
  },
  {
    path: "/refund",
    section: "company",
    key: "refund",
    status: "live",
    template: true,
  },
  {
    path: "/legal/[slug]",
    section: "company",
    key: "legal.slug",
    status: "live",
    template: true,
  },
];

export const sectionOf = (id: SectionId): Section => {
  const s = SECTIONS.find((x) => x.id === id);
  if (!s) throw new Error(`unknown section ${id}`);
  return s;
};

export const pagesIn = (id: SectionId): SitePage[] => SITE_MAP.filter((p) => p.section === id);

const pattern = (path: string) => new RegExp(`^${path.replace(/\[[^\]]+\]/g, "[^/]+")}/?$`);
const MATCHERS = SITE_MAP.map((page) => ({ page, re: pattern(page.path) }));

/** The entry serving a locale-free pathname, e.g. "/blog/some-essay". */
export const pageAt = (pathname: string): SitePage | undefined =>
  MATCHERS.find(({ re }) => re.test(pathname))?.page;

/** The pages this build serves: all of them on the Nebutra site, the template's own in the template. */
export const SERVED_PAGES: readonly SitePage[] = SITE_MAP.filter(
  (page) => page.status !== "planned" && (SITE_ID === "nebutra" || page.template),
);

/**
 * Whether a link belongs on this site. An internal href must resolve to a
 * served page; an external one may be marked `site` to appear on one site
 * only (the Sailor npm package, say, is Nebutra's own link).
 */
export function belongsHere(link: object): boolean {
  const { href, site } = link as { href?: unknown; site?: unknown };
  if (site !== undefined && site !== SITE_ID) return false;
  if (typeof href !== "string" || !href.startsWith("/")) return true;
  const path = href.split(/[?#]/)[0] || "/";
  return SERVED_PAGES.some((page) => pattern(page.path).test(path));
}

/** The links in a list that belong on this site, in order. */
export const hereOnly = <T extends object>(links: readonly T[]): T[] => links.filter(belongsHere);
