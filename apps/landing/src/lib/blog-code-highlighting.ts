import type { PortableTextBlock } from "@nebutra/blog";
import { codeToHtml } from "shiki";

const SHIKI_THEMES = {
  dark: "github-dark",
  light: "github-light",
} as const;

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

  const highlighterOptions = {
    lang: language,
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
  } satisfies Parameters<typeof codeToHtml>[1];

  let html: string;
  try {
    html = await codeToHtml(code, highlighterOptions);
  } catch {
    html = await codeToHtml(code, { ...highlighterOptions, lang: "text" });
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
