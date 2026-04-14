export const i18n = {
  defaultLanguage: "en",
  languages: ["en", "zh"],
  parser: "dir" as const,
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
