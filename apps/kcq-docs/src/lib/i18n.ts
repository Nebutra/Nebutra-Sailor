import { defineI18n } from "fumadocs-core/i18n";

/**
 * Same locale split as the KCQ public pages (apps/kcq/src/public/routes.ts, fork ADR 0003):
 * English is the unprefixed default and `x-default`, Chinese lives under /zh.
 */
export const i18n = defineI18n({
  defaultLanguage: "en",
  languages: ["en", "zh"],
  parser: "dir",
  hideLocale: "default-locale",
});

export type Lang = (typeof i18n.languages)[number];
export const LANGS: readonly Lang[] = ["en", "zh"];

export const LOCALES = {
  en: {
    prefix: "",
    htmlLang: "en",
    hreflang: "en",
    ogLocale: "en_US",
    label: "English",
    short: "EN",
  },
  zh: {
    prefix: "zh",
    htmlLang: "zh-Hans",
    hreflang: "zh-Hans",
    ogLocale: "zh_CN",
    label: "简体中文",
    short: "中文",
  },
} as const satisfies Record<Lang, unknown>;

export function isLang(value: string | undefined): value is Lang {
  return value === "en" || value === "zh";
}

/** Docs URL for a language and slug list: /docs/x for English, /zh/docs/x for Chinese. */
export function docsPath(lang: Lang, slugs: readonly string[] = []): string {
  const base = LOCALES[lang].prefix ? `/${LOCALES[lang].prefix}/docs` : "/docs";
  return slugs.length ? `${base}/${slugs.join("/")}` : base;
}

/** The public KCQ page for a language (/home, /zh/home). */
export function publicPath(lang: Lang, page: "home" | "benchmark"): string {
  return LOCALES[lang].prefix ? `/${LOCALES[lang].prefix}/${page}` : `/${page}`;
}

/** Map a docs pathname to the same page in another language. */
export function switchLanguage(pathname: string, to: Lang): string {
  const rest = pathname.replace(/^\/zh(?=\/docs)/, "").replace(/^\/docs/, "");
  return `${docsPath(to)}${rest}`;
}

export const UI = {
  en: {
    search: "Search",
    searchPlaceholder: "Search the docs",
    searchNoResult: "No results",
    toc: "On this page",
    tocNoHeadings: "No headings",
    lastUpdate: "Last updated",
    chooseLanguage: "Language",
    nextPage: "Next",
    previousPage: "Previous",
    editOnGithub: "Edit on GitHub",
    viewSource: "View source",
    viewMarkdown: "View as Markdown",
    workstation: "Open workstation",
    docs: "Docs",
    home: "KLineChartQuant home",
    github: "GitHub",
    stars: (stars: number, date: string) => `${stars} GitHub stars as of ${date}`,
    theme: "Theme",
    themes: { system: "System", light: "Light", dark: "Dark" },
    menu: "Menu",
    skip: "Skip to content",
    onlyIn: "This page is only available in Chinese. It is shown in its original language.",
    fallback: "This page has no Chinese version yet. It is shown in English.",
    generated: "Generated from the pinned chart source",
    notFoundTitle: "Page not found",
    notFoundBody: "This docs page does not exist or has moved.",
    notFoundHome: "Go to the docs home",
  },
  zh: {
    search: "搜索",
    searchPlaceholder: "搜索文档",
    searchNoResult: "没有结果",
    toc: "本页内容",
    tocNoHeadings: "没有标题",
    lastUpdate: "最后更新",
    chooseLanguage: "语言",
    nextPage: "下一页",
    previousPage: "上一页",
    editOnGithub: "在 GitHub 上编辑",
    viewSource: "查看源文件",
    viewMarkdown: "查看 Markdown",
    workstation: "打开工作台",
    docs: "文档",
    home: "KLineChartQuant 首页",
    github: "GitHub",
    stars: (stars: number, date: string) => `截至 ${date}，GitHub ${stars} 星`,
    theme: "主题",
    themes: { system: "跟随系统", light: "浅色", dark: "深色" },
    menu: "菜单",
    skip: "跳到正文",
    onlyIn: "本页只有英文版，按原文显示。",
    fallback: "本页暂无中文版，以下为英文原文。",
    generated: "由固定提交的图表源码生成",
    notFoundTitle: "页面不存在",
    notFoundBody: "该文档页面不存在或已移动。",
    notFoundHome: "返回文档首页",
  },
} as const;
