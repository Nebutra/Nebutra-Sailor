export const i18n = {
  defaultLanguage: "en",
  languages: ["en", "zh"],
  parser: "dir" as const,
  /**
   * Keep the default language out of the URL: `<base>/getting-started/...` for
   * English, `<base>/zh/getting-started/...` for Chinese.
   *
   * This bundle is a Next.js zone mounted at `/docs` on the site that owns it,
   * so its own URLs are the public ones. `/docs/en/<slug>` would put a segment
   * in every canonical docs URL that carries no information for the 90% case —
   * the shape vercel.com/docs, supabase.com/docs and clerk.com/docs all avoid.
   *
   * Implemented by `createI18nMiddleware` (src/middleware.ts) as a rewrite, so
   * the locale-less URL is the address AND the served route.
   */
  hideLocale: "default-locale" as const,
  translations: {
    en: {
      search: "Search",
      searchNoResult: "No results found",
      toc: "On this page",
      tocNoHeadings: "No headings on this page",
      lastUpdate: "Last updated on",
      chooseLanguage: "Choose language",
      nextPage: "Next",
      previousPage: "Previous",
      editOnGithub: "Edit on GitHub",
    },
    zh: {
      search: "搜索",
      searchNoResult: "没有找到结果",
      toc: "目录",
      tocNoHeadings: "当前页面没有标题",
      lastUpdate: "最后更新于",
      chooseLanguage: "选择语言",
      nextPage: "下一页",
      previousPage: "上一页",
      editOnGithub: "在 GitHub 上编辑此页面",
    },
  },
};

export function htmlLangForLanguage(language: string): string {
  if (language === "zh") return "zh-Hans-CN";
  if (language === "en") return "en-US";
  return language;
}
