import { docsPath, LANGS, type Lang, UI } from "./i18n";
import { FACTS, KCQ_ORIGIN, LINKS } from "./site";
import { contentLanguage, type DocsPage, source } from "./source";

/** Markdown of one page as agents read it at <page>.md: title, URL, then the processed body. */
export async function pageMarkdown(page: DocsPage, lang: Lang): Promise<string> {
  const body = await page.data.getText("processed");
  const header = [
    `# ${page.data.title}`,
    "",
    page.data.description ? `> ${page.data.description}` : "",
    "",
    `Source: ${KCQ_ORIGIN}${docsPath(lang, page.slugs)}`,
    contentLanguage(page) !== lang ? `Language: ${contentLanguage(page)} (original)` : "",
  ]
    .filter((line, i, all) => line !== "" || all[i - 1] !== "")
    .join("\n");
  return `${header}\n\n${body.trim()}\n`;
}

function sections(lang: Lang) {
  const tree = source.getPageTree(lang);
  const out: { title: string; pages: DocsPage[] }[] = [];
  let current = { title: lang === "en" ? "Get started" : "开始使用", pages: [] as DocsPage[] };
  const byUrl = new Map(source.getPages(lang).map((p) => [p.url, p]));
  const walk = (nodes: typeof tree.children) => {
    for (const node of nodes) {
      if (node.type === "separator") {
        if (current.pages.length) out.push(current);
        current = { title: String(node.name ?? ""), pages: [] };
      } else if (node.type === "page") {
        const page = byUrl.get(node.url);
        if (page) current.pages.push(page);
      } else if (node.type === "folder") {
        if (node.index) {
          const page = byUrl.get(node.index.url);
          if (page) current.pages.push(page);
        }
        walk(node.children);
      }
    }
  };
  walk(tree.children);
  if (current.pages.length) out.push(current);
  return out;
}

/** llms.txt (llmstxt.org): what KCQ is, then every page in both languages with its .md URL. */
export function llmsIndex(): string {
  const lines = [
    "# KLineChartQuant",
    "",
    `> An agent-native K-line (candlestick) chart library: WebGPU/WebGL/Canvas2D rendering, Vue, React and Web Component bindings, and ${FACTS.tools.count} agent tools that operate the chart through the same methods as its interface. Apache-2.0. Version ${FACTS.version}.`,
    "",
    `Every page is also available as Markdown: append \`.md\` to its URL. Full text: ${KCQ_ORIGIN}/docs/llms-full.txt (English), ${KCQ_ORIGIN}/zh/docs/llms-full.txt (Chinese). Source: ${LINKS.fork} at ${FACTS.commit}.`,
    "",
  ];
  for (const lang of LANGS) {
    if (lang !== "en") lines.push(`# ${lang === "zh" ? "中文文档" : lang}`, "");
    for (const section of sections(lang)) {
      lines.push(`## ${section.title}`, "");
      for (const page of section.pages) {
        const description = page.data.description ? `: ${page.data.description}` : "";
        lines.push(
          `- [${page.data.title}](${KCQ_ORIGIN}${docsPath(lang, page.slugs)}.md)${description}`,
        );
      }
      lines.push("");
    }
  }
  return `${lines.join("\n").trim()}\n`;
}

export async function llmsFull(lang: Lang): Promise<string> {
  const pages = sections(lang).flatMap((s) => s.pages);
  const parts = await Promise.all(pages.map((page) => pageMarkdown(page, lang)));
  return `# KLineChartQuant ${UI[lang].docs}\n\n${parts.join("\n---\n\n")}`;
}
