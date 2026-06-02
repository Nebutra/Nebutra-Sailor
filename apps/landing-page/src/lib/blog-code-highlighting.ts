import type { PortableTextBlock } from "@nebutra/blog";
import goLang from "@shikijs/langs/go";
import rustLang from "@shikijs/langs/rust";
import { type BundledLanguage, createHighlighter, type Highlighter } from "shiki/bundle/web";

const SHIKI_THEMES = {
  dark: "github-dark",
  light: "github-light",
} as const;

// Bundle hygiene (#141): import from `shiki/bundle/web` (78 curated languages)
// instead of the full `shiki` entry (332 languages). The full bundle's dynamic
// `lang` made Next.js trace every `@shikijs/langs` grammar (~9.9 MB / 254 files)
// into the standalone ECS artifact. The web bundle covers every realistic blog
// language; `go`/`rust` are the only common dev languages it omits, so we
// register their grammars explicitly to avoid degrading those posts to plain
// text. Any language outside this set still renders (unhighlighted) via the
// `text` fallback below.
const PRELOADED_LANGUAGES = ["javascript", "typescript", "tsx", "jsx", "bash", "json"] as const;

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  highlighterPromise ??= createHighlighter({
    themes: [SHIKI_THEMES.dark, SHIKI_THEMES.light],
    langs: [...PRELOADED_LANGUAGES, goLang, rustLang],
  });
  return highlighterPromise;
}

function normalizeLanguage(language: string | null | undefined): string {
  const value = language?.trim().toLowerCase();
  if (!value) return "text";
  if (value === "js") return "javascript";
  if (value === "ts") return "typescript";
  if (value === "tsx") return "tsx";
  if (value === "jsx") return "jsx";
  if (value === "sh" || value === "zsh" || value === "bash") return "bash";
  return value;
}

function lineDiffMap(code: string): Map<number, "add" | "remove"> {
  const diff = new Map<number, "add" | "remove">();
  code.split("\n").forEach((line, index) => {
    if (line.startsWith("+") && !line.startsWith("+++")) diff.set(index + 1, "add");
    if (line.startsWith("-") && !line.startsWith("---")) diff.set(index + 1, "remove");
  });
  return diff;
}

async function highlightCodeBlock(block: PortableTextBlock): Promise<PortableTextBlock> {
  const code = block.code?.trimEnd();
  if (!code) return block;

  const highlightedLines = new Set(block.highlightedLines ?? []);
  const diffLines = lineDiffMap(code);
  const language = normalizeLanguage(block.language);
  if (language === "mermaid") {
    return {
      ...block,
      _type: "mermaid",
      code,
      language,
    };
  }

  const highlighter = await getHighlighter();

  // Lazy-load any web-bundle language not preloaded; fall back to plain `text`
  // for anything the curated bundle does not ship.
  let lang = language;
  if (!highlighter.getLoadedLanguages().includes(lang)) {
    try {
      await highlighter.loadLanguage(lang as BundledLanguage);
    } catch {
      lang = "text";
    }
  }

  const highlighterOptions = {
    lang,
    themes: SHIKI_THEMES,
    transformers: [
      {
        name: "nebutra-blog-code-line-meta",
        line(node, lineNumber) {
          node.properties ||= {};
          node.properties["data-line"] = String(lineNumber);
          if (highlightedLines.has(lineNumber)) node.properties["data-highlighted"] = "true";
          const diff = diffLines.get(lineNumber);
          if (diff) node.properties["data-diff"] = diff;
        },
      },
    ],
  } satisfies Parameters<Highlighter["codeToHtml"]>[1];

  let html: string;
  try {
    html = highlighter.codeToHtml(code, highlighterOptions);
  } catch {
    html = highlighter.codeToHtml(code, { ...highlighterOptions, lang: "text" });
  }

  return {
    ...block,
    _type: "codeHtml",
    code,
    html,
    language,
  };
}

export async function prepareBlogPortableTextBlocks(
  blocks: PortableTextBlock[],
): Promise<PortableTextBlock[]> {
  return Promise.all(
    blocks.map((block) => {
      if (block._type !== "code") return block;
      return highlightCodeBlock(block);
    }),
  );
}
