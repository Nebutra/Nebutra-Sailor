import type {
  BlogLanguage,
  BlogPostWithSource,
  BlogTableOfContents,
  BlogTocItem,
  PortableTextBlock,
  PortableTextSpan,
} from "./types";

export const TEMPLATE_PLACEHOLDER_MARK = "templatePlaceholder";
export const TEMPLATE_PLACEHOLDER_PATTERN = /\[[^[\]\n]{1,120}\]/g;

export function toBlogLanguage(locale: string): BlogLanguage {
  return locale.toLowerCase().startsWith("zh") ? "zh" : "en";
}

export function oppositeBlogLanguage(language: BlogLanguage): BlogLanguage {
  return language === "zh" ? "en" : "zh";
}

export function hasTemplatePlaceholders(text: string): boolean {
  TEMPLATE_PLACEHOLDER_PATTERN.lastIndex = 0;
  return TEMPLATE_PLACEHOLDER_PATTERN.test(text);
}

export function getBlockText(block: PortableTextBlock | undefined): string {
  return block?.children?.map((child) => child.text ?? "").join("") ?? "";
}

export function hasVisibleText(block: PortableTextBlock): boolean {
  if (block._type !== "block") return true;
  return Boolean(block.children?.some((child) => child.text?.trim()));
}

export function splitSpanTemplatePlaceholders(span: PortableTextSpan): PortableTextSpan[] {
  const text = span.text ?? "";
  if (!hasTemplatePlaceholders(text)) return [span];

  const parts: PortableTextSpan[] = [];
  const baseMarks = span.marks ?? [];
  let lastIndex = 0;
  let partIndex = 0;

  for (const match of text.matchAll(TEMPLATE_PLACEHOLDER_PATTERN)) {
    const start = match.index ?? 0;
    const token = match[0];
    if (start > lastIndex) {
      parts.push({
        ...span,
        _key: `${span._key ?? "span"}-${partIndex++}`,
        text: text.slice(lastIndex, start),
        marks: baseMarks,
      });
    }

    parts.push({
      ...span,
      _key: `${span._key ?? "span"}-${partIndex++}`,
      text: token,
      marks: [...baseMarks, TEMPLATE_PLACEHOLDER_MARK],
    });
    lastIndex = start + token.length;
  }

  if (lastIndex < text.length) {
    parts.push({
      ...span,
      _key: `${span._key ?? "span"}-${partIndex++}`,
      text: text.slice(lastIndex),
      marks: baseMarks,
    });
  }

  return parts;
}

export function decorateTemplatePlaceholders(block: PortableTextBlock): PortableTextBlock {
  if (block._type !== "block" || block.style !== "blockquote" || !block.children?.length) {
    return block;
  }
  return { ...block, children: block.children.flatMap(splitSpanTemplatePlaceholders) };
}

export function parseMarkdownTableText(text: string): PortableTextBlock["rows"] | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("|") || !trimmed.includes("---")) return null;

  const rowText = trimmed.includes("\n") ? trimmed : trimmed.replace(/\|\s*\|/g, "|\n|");
  const lines = rowText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 3) return null;

  const cellsByRow = lines.map((line) =>
    line
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim()),
  );
  const separatorIndex = cellsByRow.findIndex(
    (cells) => cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell)),
  );

  const header = cellsByRow[0];
  if (separatorIndex !== 1 || !header?.length) return null;

  const rows = cellsByRow
    .slice(2)
    .filter((cells) => cells.some(Boolean))
    .map((cells, index) => ({
      _key: `markdown-row-${index}`,
      cells: header.map((_, cellIndex) => cells[cellIndex] ?? ""),
    }));

  if (!rows.length) return null;
  return [{ _key: "markdown-head", cells: header }, ...rows];
}

export function normalizePortableTextBlock(block: PortableTextBlock): PortableTextBlock {
  if (block._type === "block" && block.style === "normal") {
    const rows = parseMarkdownTableText(getBlockText(block));
    if (rows) {
      return {
        _key: `${block._key ?? "markdown"}-table`,
        _type: "table",
        rows,
      };
    }
  }

  return decorateTemplatePlaceholders(block);
}

export function normalizePortableTextBlocks(blocks: PortableTextBlock[]): PortableTextBlock[] {
  return blocks.map(normalizePortableTextBlock);
}

export function getHeadingDepth(style: string | undefined): BlogTocItem["depth"] | null {
  if (style === "h2") return 2;
  if (style === "h3") return 3;
  if (style === "h4") return 4;
  return null;
}

export function hashHeadingId(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function getHeadingText(block: PortableTextBlock): string {
  return (
    block.children
      ?.map((child) => child.text ?? "")
      .join("")
      .replace(/\s+/g, " ")
      .trim() ?? ""
  );
}

export function getBlogTableOfContents(
  body: PortableTextBlock[] | null | undefined,
): BlogTableOfContents {
  const headingIds: Record<string, string> = {};
  const seen = new Map<string, number>();
  const items =
    body?.flatMap((block, index) => {
      if (block._type !== "block") return [];
      const depth = getHeadingDepth(block.style);
      if (!depth || !block._key) return [];

      const title = getHeadingText(block);
      if (!title) return [];

      const baseId = `section-${index + 1}-${hashHeadingId(`${block._key}:${title}`)}`;
      const count = seen.get(baseId) ?? 0;
      seen.set(baseId, count + 1);
      const id = count > 0 ? `${baseId}-${count + 1}` : baseId;
      headingIds[block._key] = id;

      return [{ id, title, depth }];
    }) ?? [];

  return { items, headingIds };
}

function getMarkHref(block: PortableTextBlock, mark: string): string | null {
  const markDef = block.markDefs?.find((def) => def._key === mark);
  return typeof markDef?.href === "string" ? markDef.href : null;
}

export function getSpanCopyText(span: PortableTextSpan, block: PortableTextBlock): string {
  const marks = span.marks ?? [];
  let text = span.text ?? "";

  if (marks.includes("code")) text = `\`${text}\``;
  if (marks.includes("strong")) text = `**${text}**`;
  if (marks.includes("em")) text = `*${text}*`;

  const href = marks.map((mark) => getMarkHref(block, mark)).find(Boolean);
  return href ? `[${text}](${href})` : text;
}

export function getPortableBlockCopyText(block: PortableTextBlock): string | null {
  if (block._type === "code" || block._type === "codeHtml") {
    const code = block.code?.trimEnd();
    if (!code) return null;
    const language = block.language?.trim() ?? "";
    const filename = block.filename?.trim();
    const title = filename ? ` title="${filename.replaceAll('"', '\\"')}"` : "";
    return `\`\`\`${language}${title}\n${code}\n\`\`\``;
  }

  if (block._type === "table") {
    const rows = block.rows?.filter((row) => row.cells?.some((cell) => cell.trim())) ?? [];
    if (!rows.length) return null;

    const tableRows = rows.map((row) => `| ${(row.cells ?? []).join(" | ")} |`);
    const separator = `| ${(rows[0]?.cells ?? []).map(() => "---").join(" | ")} |`;
    return [tableRows[0], separator, ...tableRows.slice(1)].join("\n");
  }

  if (block._type !== "block") return null;

  const text =
    block.children
      ?.map((child) => getSpanCopyText(child, block))
      .join("")
      .trim() ?? "";
  if (!text) return null;

  if (block.listItem) {
    const indent = "  ".repeat(Math.max((block.level ?? 1) - 1, 0));
    return block.listItem === "number" ? `${indent}1. ${text}` : `${indent}- ${text}`;
  }

  if (block.style === "h2") return `## ${text}`;
  if (block.style === "h3") return `### ${text}`;
  if (block.style === "h4") return `#### ${text}`;
  if (block.style === "blockquote") return `> ${text}`;

  return text;
}

export function getPostCopyText(post: BlogPostWithSource): string {
  const parts = [`# ${post.title}`];
  if (post.excerpt) parts.push(post.excerpt);

  const body =
    post.body?.map(getPortableBlockCopyText).filter((part): part is string => Boolean(part)) ?? [];
  parts.push(...body);

  return parts.join("\n\n").trim();
}

export function extractBodyText(post: BlogPostWithSource): string {
  const bodyText =
    post.body
      ?.flatMap((block) => {
        if (block._type === "table") {
          return block.rows?.flatMap((row) => row.cells ?? []) ?? [];
        }
        return block.children?.map((child) => child.text ?? "") ?? [];
      })
      .join(" ") ?? "";
  return `${post.title} ${post.excerpt} ${bodyText}`.trim();
}

export function estimateReadTime(post: BlogPostWithSource, isZh: boolean): string {
  const text = extractBodyText(post);
  const units = isZh ? text.replace(/\s/g, "").length / 420 : text.split(/\s+/).length / 220;
  const minutes = Math.max(2, Math.ceil(units));
  return isZh ? `${minutes} 分钟阅读` : `${minutes} min read`;
}

function dateValue(post: Pick<BlogPostWithSource, "date">): number {
  const value = Date.parse(post.date);
  return Number.isFinite(value) ? value : 0;
}

function tagOverlapScore(current: BlogPostWithSource, candidate: BlogPostWithSource): number {
  const currentTags = new Set(current.tags.map((tag) => tag.toLowerCase()));
  return candidate.tags.reduce(
    (score, tag) => score + (currentTags.has(tag.toLowerCase()) ? 1 : 0),
    0,
  );
}

export function getBlogRelatedPosts(
  posts: BlogPostWithSource[],
  current: BlogPostWithSource,
  limit = 3,
): BlogPostWithSource[] {
  return posts
    .filter((post) => post.slug !== current.slug && post.language === current.language)
    .map((post) => ({ post, score: tagOverlapScore(current, post) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || dateValue(b.post) - dateValue(a.post))
    .slice(0, limit)
    .map(({ post }) => post);
}

export function getBlogUrlSegment(value: string): string {
  const hasNonAscii = (part: string) => [...part].some((char) => char.charCodeAt(0) > 127);
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[\s/_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .split("-")
    .map((part) => (hasNonAscii(part) ? encodeURIComponent(part) : part))
    .join("-");
}

export function getBlogViewTransitionName(value: string): string {
  const segment = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `blog-${segment || "post"}`;
}
