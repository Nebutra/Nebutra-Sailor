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
 */

import { SITE_ID } from "./site.config";

/** Which site a build is — see site.config.ts. */
export type SiteId = "nebutra" | "template";

export type SectionId = "home" | "journal" | "sailor" | "sleptons" | "building" | "company";

export interface Section {
  id: SectionId;
  title: { en: string; zh: string };
  /** One line: what this section is, in the owner's terms. */
  is: string;
  /** Where the section's index lives. */
  path: string;
  /** Shown in the site navigation. */
  nav: boolean;
}

export const SECTIONS: readonly Section[] = [
  {
    id: "home",
    title: { en: "Home", zh: "首页" },
    is: "The manifesto, led by the Journal.",
    path: "/",
    nav: false,
  },
  {
    id: "journal",
    title: { en: "Journal", zh: "日志" },
    is: "The founder's essays: what we believe about building now.",
    path: "/blog",
    nav: true,
  },
  {
    id: "sailor",
    title: { en: "Sailor", zh: "开源平台" },
    is: "The open-source platform everything is built on, usable today.",
    path: "/sailor",
    nav: true,
  },
  {
    id: "sleptons",
    title: { en: "Sleptons", zh: "生态" },
    is: "Where people, ideas, needs and capital find each other — including Ideas, the UGC of ideas and needs.",
    path: "/sleptons",
    nav: true,
  },
  {
    id: "building",
    title: { en: "Building", zh: "正在造的" },
    is: "The founder OS, and the products grown on the platform along the way.",
    path: "/building",
    nav: true,
  },
  {
    id: "company",
    title: { en: "Company", zh: "公司" },
    is: "Who we are, how we work, how to reach us, and the legal pages.",
    path: "/about",
    nav: true,
  },
];

export type PageStatus =
  | "live" //       the route exists and is served
  | "planned" //    agreed in the map, not built yet
  | "redirect"; //  kept for old links, answers with a redirect

export interface SitePage {
  /** Route under /[lang], as written in the app directory. */
  path: string;
  section: SectionId;
  title: { en: string; zh: string };
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
   * "bare": the page draws its own frame (the status page).
   */
  chrome?: "over-dark" | "bare";
  /**
   * Listed under its section in the rail. The rail shows sections; a page
   * without this is reached from its section's own pages, the footer, or not
   * at all — which is how /features went missing when the rail replaced the
   * top navigation.
   */
  rail?: true;
}

export const SITE_MAP: readonly SitePage[] = [
  // Home — the template keeps its own home (the Sailor story); the Nebutra site leads with the Journal.
  { path: "/", section: "home", title: { en: "Home", zh: "首页" }, status: "live", template: true },

  // Journal
  {
    path: "/blog",
    section: "journal",
    title: { en: "Journal", zh: "日志" },
    status: "live",
    template: true,
  },
  {
    path: "/blog/[slug]",
    section: "journal",
    title: { en: "Essay", zh: "文章" },
    status: "live",
    template: true,
  },
  {
    path: "/blog/author/[author]",
    section: "journal",
    title: { en: "Author", zh: "作者" },
    status: "live",
    template: true,
  },
  {
    path: "/blog/tag/[tag]",
    section: "journal",
    title: { en: "Topic", zh: "主题" },
    status: "live",
    template: true,
  },
  {
    path: "/news",
    rail: true,
    section: "journal",
    title: { en: "News", zh: "新闻" },
    status: "live",
    template: true,
  },
  {
    path: "/about/whitepaper",
    section: "journal",
    title: { en: "Whitepaper", zh: "白皮书" },
    status: "live",
    template: false,
  },

  // Sailor — the old landing's home becomes /sailor; its sections come with it.
  {
    path: "/sailor",
    section: "sailor",
    title: { en: "Sailor", zh: "开源平台" },
    status: "live",
    template: false,
  },
  {
    path: "/sailor/studio",
    rail: true,
    section: "sailor",
    title: { en: "Sailor Studio", zh: "Sailor Studio" },
    status: "live",
    template: false,
  },
  {
    // The document Studio's Components view renders in; part of the Studio page.
    path: "/sailor/studio/frame",
    section: "sailor",
    title: { en: "Sailor Studio frame", zh: "Sailor Studio 画框" },
    status: "live",
    template: false,
    chrome: "bare",
  },
  {
    path: "/features",
    rail: true,
    section: "sailor",
    title: { en: "Packages", zh: "功能包" },
    status: "live",
    template: true,
  },
  {
    path: "/features/[name]",
    section: "sailor",
    title: { en: "Package", zh: "功能包" },
    status: "live",
    template: true,
  },
  {
    path: "/pricing",
    rail: true,
    section: "sailor",
    title: { en: "Pricing", zh: "定价" },
    status: "live",
    template: true,
  },
  {
    path: "/licensing",
    rail: true,
    section: "sailor",
    title: { en: "Licensing", zh: "授权" },
    status: "live",
    template: false,
  },
  {
    path: "/get-license",
    section: "sailor",
    title: { en: "Get a license", zh: "获取授权" },
    status: "live",
    template: false,
  },
  {
    path: "/ai/models",
    section: "sailor",
    title: { en: "AI models", zh: "AI 模型" },
    status: "live",
    template: false,
  },
  {
    path: "/open",
    section: "sailor",
    title: { en: "Open platform", zh: "开放平台" },
    status: "live",
    template: false,
  },
  {
    path: "/changelog",
    rail: true,
    section: "sailor",
    title: { en: "Changelog", zh: "更新日志" },
    status: "live",
    template: true,
    chrome: "over-dark",
  },
  {
    path: "/changelog/[version]",
    section: "sailor",
    title: { en: "Release", zh: "版本" },
    status: "live",
    template: true,
  },
  {
    path: "/showcase",
    rail: true,
    section: "sailor",
    title: { en: "Built with Sailor", zh: "作品展示" },
    status: "live",
    template: true,
  },
  {
    path: "/status",
    section: "sailor",
    title: { en: "Status", zh: "服务状态" },
    status: "live",
    template: true,
    chrome: "bare",
  },
  {
    path: "/status/history",
    section: "sailor",
    title: { en: "Incident history", zh: "事件历史" },
    status: "live",
    template: true,
    chrome: "bare",
  },
  {
    path: "/status/incidents/[id]",
    section: "sailor",
    title: { en: "Incident", zh: "事件" },
    status: "live",
    template: true,
    chrome: "bare",
  },
  {
    path: "/security",
    section: "sailor",
    title: { en: "Security", zh: "安全" },
    status: "live",
    template: true,
  },
  {
    path: "/refer",
    section: "sailor",
    title: { en: "Refer", zh: "推荐" },
    status: "live",
    template: true,
  },

  // Sleptons — the ecosystem. Ideas is its UGC of ideas and needs (today a feedback board).
  {
    path: "/sleptons",
    section: "sleptons",
    title: { en: "Sleptons", zh: "生态" },
    status: "live",
    template: false,
  },
  {
    path: "/ideas",
    rail: true,
    section: "sleptons",
    title: { en: "Ideas", zh: "创意与需求" },
    status: "live",
    template: false,
  },
  {
    path: "/solutions",
    rail: true,
    section: "sleptons",
    title: { en: "Capital", zh: "资本" },
    status: "live",
    template: false,
  },
  {
    path: "/solutions/[slug]",
    section: "sleptons",
    title: { en: "Solution", zh: "方案" },
    status: "live",
    template: false,
  },
  {
    path: "/solutions/china-vc/[id]",
    section: "sleptons",
    title: { en: "Investor", zh: "投资机构" },
    status: "live",
    template: false,
  },
  {
    path: "/solutions/global-vc/[id]",
    section: "sleptons",
    title: { en: "Investor", zh: "投资机构" },
    status: "live",
    template: false,
  },

  // Building
  {
    path: "/building",
    section: "building",
    title: { en: "Building", zh: "正在造的" },
    status: "live",
    template: false,
  },
  {
    path: "/about/products",
    rail: true,
    section: "building",
    title: { en: "Founder OS", zh: "创始人操作系统" },
    status: "live",
    template: false,
  },
  {
    path: "/roadmap",
    rail: true,
    section: "building",
    title: { en: "Roadmap", zh: "路线图" },
    status: "live",
    template: true,
  },
  {
    path: "/playbook",
    rail: true,
    section: "building",
    title: { en: "Playbook", zh: "演示合集" },
    status: "live",
    template: false,
  },
  {
    path: "/opc",
    section: "building",
    title: { en: "OPC", zh: "OPC" },
    status: "redirect",
    redirectTo: "/building",
    template: false,
  },

  // Company
  {
    path: "/about",
    section: "company",
    title: { en: "About", zh: "关于" },
    status: "live",
    template: false,
  },
  {
    path: "/about/business-portfolio",
    section: "company",
    title: { en: "Business", zh: "业务版图" },
    status: "live",
    template: false,
  },
  {
    path: "/about/global",
    section: "company",
    title: { en: "Global", zh: "全球" },
    status: "live",
    template: false,
  },
  {
    path: "/about/innovation",
    section: "company",
    title: { en: "Innovation", zh: "创新" },
    status: "live",
    template: false,
  },
  {
    path: "/careers",
    rail: true,
    section: "company",
    title: { en: "Careers", zh: "加入我们" },
    status: "live",
    template: false,
  },
  {
    path: "/contact",
    rail: true,
    section: "company",
    title: { en: "Contact", zh: "联系" },
    status: "live",
    template: true,
  },
  {
    path: "/faq",
    rail: true,
    section: "company",
    title: { en: "FAQ", zh: "常见问题" },
    status: "live",
    template: true,
  },
  {
    path: "/privacy",
    section: "company",
    title: { en: "Privacy", zh: "隐私政策" },
    status: "live",
    template: true,
  },
  {
    path: "/terms",
    section: "company",
    title: { en: "Terms", zh: "服务条款" },
    status: "live",
    template: true,
  },
  {
    path: "/cookies",
    section: "company",
    title: { en: "Cookies", zh: "Cookie 政策" },
    status: "live",
    template: true,
  },
  {
    // The typeface credits. MiSans's licence asks the product to state it uses MiSans.
    path: "/credits",
    section: "company",
    title: { en: "Credits", zh: "致谢" },
    status: "live",
    template: true,
  },
  {
    path: "/dpa",
    section: "company",
    title: { en: "DPA", zh: "数据处理协议" },
    status: "live",
    template: true,
  },
  {
    path: "/refund",
    section: "company",
    title: { en: "Refunds", zh: "退款政策" },
    status: "live",
    template: true,
  },
  {
    path: "/legal/[slug]",
    section: "company",
    title: { en: "Legal", zh: "法律文件" },
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
