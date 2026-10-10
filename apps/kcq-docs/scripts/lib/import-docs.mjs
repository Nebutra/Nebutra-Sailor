/**
 * Source documents imported verbatim from the pinned chart checkout. They keep their original
 * language: a page written in Chinese is published in both trees and marked as such on the English
 * side (and vice versa), never machine-translated.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import {
  detectLanguage,
  firstParagraph,
  frontmatter,
  rewriteLinks,
  takeTitle,
} from "./markdown.mjs";

const NOTES = [
  "design/state/layout-document.md",
  "design/browser-persistence-scope.md",
  "design/state/pane-manager.md",
  "design/state/view-workspaces.md",
  "design/theme/theme-presets.md",
  "design/theme/design-tokens-v2.md",
  "design/market-data-byok.md",
  "design/agent/agent-chart-context-ssot.md",
  "design/agent/agent-market-data-apis.md",
  "design/agent/managed-provider.md",
  "design/agent/agent-code-interpreter.md",
  "design/drawing/drawing-tools.md",
  "design/indicator/indicator-instance-state.md",
  "design/chart-frame-capture.md",
];

/**
 * Short navigation titles per language. The page keeps its original text; the title is what the
 * sidebar, search and the H1 show, so an English reader can find a Chinese original (and the page
 * then says it is shown in its original language). Pages not listed keep their own H1.
 */
const TITLES = {
  "architecture/system": { en: "System architecture", zh: "系统架构" },
  "architecture/rendering-pipeline": { en: "Rendering pipeline", zh: "渲染管线" },
  "architecture/adapters": { en: "Adapters", zh: "适配器架构" },
  "architecture/cross-framework": { en: "Cross-framework compatibility", zh: "跨框架兼容" },
  "architecture/package-boundaries": { en: "Package boundaries", zh: "包边界" },
  "architecture/core-exports": { en: "Core exports and source aliases", zh: "Core 导出与源码别名" },
  "market-data/provider-api": { en: "Provider API", zh: "Provider API" },
  "contributing/indicators": { en: "Adding an indicator", zh: "贡献新指标" },
  "contributing/ci-gates": { en: "CI gates", zh: "CI 门禁" },
  "contributing/releases": { en: "Releases", zh: "发版流程" },
  "architecture/notes/agent-chart-context-ssot": {
    en: "Agent chart context",
    zh: "Agent 图表上下文",
  },
  "architecture/notes/agent-code-interpreter": { en: "Code interpreter", zh: "代码解释器" },
  "architecture/notes/agent-market-data-apis": {
    en: "Agent market-data APIs",
    zh: "Agent 行情查询 API",
  },
  "architecture/notes/browser-persistence-scope": {
    en: "Browser persistence scope",
    zh: "浏览器持久化范围",
  },
  "architecture/notes/chart-frame-capture": { en: "Chart frame capture", zh: "图表截图取帧" },
  "architecture/notes/design-tokens-v2": { en: "Design tokens v2", zh: "设计 Token v2" },
  "architecture/notes/drawing-tools": { en: "Drawing tools", zh: "绘图工具" },
  "architecture/notes/indicator-instance-state": {
    en: "Indicator instance state",
    zh: "指标实例状态",
  },
  "architecture/notes/layout-document": { en: "Layout document", zh: "布局文档" },
  "architecture/notes/managed-provider": { en: "Managed provider", zh: "托管 Provider" },
  "architecture/notes/market-data-byok": {
    en: "Host-managed connections (BYOK)",
    zh: "宿主管理的行情连接",
  },
  "architecture/notes/pane-manager": { en: "PaneManager", zh: "PaneManager" },
  "architecture/notes/theme-presets": { en: "Theme presets", zh: "主题预设" },
  "architecture/notes/view-workspaces": { en: "View workspaces", zh: "视图工作区" },
  "architecture/engineering/frame-transaction-timing-effect": {
    en: "Frame transactions and effects",
    zh: "帧事务、时序与 effect",
  },
  "architecture/engineering/vite-monorepo-hmr-outside-root": {
    en: "Vite HMR outside the root",
    zh: "root 之外的 Vite HMR",
  },
  "architecture/engineering/vue-overlay-flushjobs-elimination": {
    en: "Keeping pointer work out of Vue",
    zh: "把高频交互移出 VDOM",
  },
  "architecture/engineering/webgl-mediump-scroll-precision": {
    en: "WebGL mediump precision",
    zh: "WebGL mediump 精度",
  },
  "architecture/engineering/webgl-webgpu-wide-line-join-divergence": {
    en: "Wide-line joins: WebGL vs WebGPU",
    zh: "粗线 join：WebGL 与 WebGPU",
  },
  "market-data/sources/baostock": { en: "BaoStock and TradingView", zh: "BaoStock 与 TradingView" },
  "market-data/sources/klinechartquantgo": { en: "GoTDX-Connector", zh: "GoTDX-Connector" },
  "market-data/sources/mt5": { en: "MT5", zh: "MT5" },
};

/** [source path, docs slug] for every imported document. */
export function importList(source) {
  const list = [
    ["docs/architecture/architecture.md", "architecture/system"],
    ["docs/rendering/rendering-pipeline.md", "architecture/rendering-pipeline"],
    ["docs/architecture/adapter-architecture.md", "architecture/adapters"],
    ["docs/architecture/cross-framework-compatibility.md", "architecture/cross-framework"],
    ["docs/architecture/package-boundary-separation.md", "architecture/package-boundaries"],
    ["docs/architecture/core-exports-source-aliases.md", "architecture/core-exports"],
    ["docs/market-data/market-data-provider.md", "market-data/provider-api"],
    ["docs/contributing/CONTRIBUTING_INDICATOR.md", "contributing/indicators"],
    ["docs/contributing/CI_GATES.md", "contributing/ci-gates"],
    ["docs/actions/release-guide.md", "contributing/releases"],
  ];
  for (const file of readdirSync(resolve(source, "docs/adr")).sort()) {
    if (/^\d{4}-.+\.md$/.test(file))
      list.push([`docs/adr/${file}`, `architecture/adr/${slug(file)}`]);
  }
  for (const file of NOTES) {
    if (existsSync(resolve(source, "docs", file)))
      list.push([`docs/${file}`, `architecture/notes/${slug(basename(file))}`]);
  }
  for (const file of readdirSync(resolve(source, "docs/blog")).sort()) {
    if (file.endsWith(".md"))
      list.push([`docs/blog/${file}`, `architecture/engineering/${slug(file)}`]);
  }
  for (const file of readdirSync(resolve(source, "docs/data-sources")).sort()) {
    if (file.endsWith(".md"))
      list.push([
        `docs/data-sources/${file}`,
        `market-data/sources/${slug(file.replace(/\.zh-CN/, ""))}`,
      ]);
  }
  return list.filter(([from]) => existsSync(resolve(source, from)));
}

export const slug = (file) =>
  file
    .replace(/\.md$/, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

export function docsUrl(lang, slugPath) {
  const base = lang === "en" ? "/docs" : `/${lang}/docs`;
  return slugPath ? `${base}/${slugPath}` : base;
}

/** Imported pages as { slug, file, data } per language. */
export function importDocs(source, links, pin) {
  const list = importList(source);
  const routes = new Map(list);
  const rawBase = `${links.repository.replace("https://github.com/", "https://raw.githubusercontent.com/")}/${pin.commit}`;
  const pages = [];
  for (const [from, to] of list) {
    const raw = readFileSync(resolve(source, from), "utf8").replace(/\r\n/g, "\n");
    const { title, body } = takeTitle(raw, basename(from, ".md"));
    const sourceLang = detectLanguage(body);
    for (const lang of ["en", "zh"]) {
      const content = rewriteLinks(body, {
        from,
        source,
        links,
        rawBase,
        routeFor: (target) => (routes.has(target) ? docsUrl(lang, routes.get(target)) : null),
      });
      pages.push({
        lang,
        slug: to,
        format: "md",
        content:
          frontmatter({
            title: TITLES[to]?.[lang] ?? title,
            originalTitle: TITLES[to] && TITLES[to][lang] !== title ? title : undefined,
            description: firstParagraph(body) || undefined,
            descriptionInBody: true,
            sourceLang,
            sourcePath: from,
            generated: true,
          }) + sanitize(content),
      });
    }
  }
  return pages;
}

/** Imported Markdown is compiled as plain Markdown; drop raw HTML blocks it cannot render. */
function sanitize(markdown) {
  return markdown.replace(/^<\/?(div|p|img|br|details|summary)[^>]*>\s*$/gim, "");
}
