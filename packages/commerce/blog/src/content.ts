import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type {
  BlogLanguage,
  BlogPostWithSource,
  BlogTableOfContents,
  BlogTocItem,
  PortableTextBlock,
  PortableTextSpan,
  PortableTextTableCell,
  PortableTextTableRow,
} from "./types";

export const TEMPLATE_PLACEHOLDER_MARK = "templatePlaceholder";
export const TEMPLATE_PLACEHOLDER_PATTERN = /\[[^[\]\n]{1,120}\]/g;
const markdownInlineProcessor = remark().use(remarkGfm).use(remarkMath);

type MarkdownNode = {
  children?: MarkdownNode[];
  identifier?: string;
  type?: string;
  url?: string;
  value?: string;
};

type InlineParseState = {
  markDefIndex: number;
  markDefs: Array<Record<string, unknown>>;
  spanIndex: number;
  spans: PortableTextSpan[];
  prefix: string;
};

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

/**
 * Plain text of a block's children.
 *
 * Inline objects have no `text`, so an `entityChip` contributes its name.
 * Without that, a sentence built around a chip loses the company it is about —
 * in the table of contents, in the copy-to-clipboard payload, and in the
 * reading-time estimate.
 */
export function getBlockText(block: PortableTextBlock | undefined): string {
  return block?.children?.map(getChildText).join("") ?? "";
}

function getChildText(child: PortableTextSpan): string {
  if (child._type === "entityChip") return child.name ?? "";
  return child.text ?? "";
}

export function getTableCellBlock(cell: PortableTextTableCell | undefined): PortableTextBlock {
  const contentBlock = cell?.content?.find((block) => block._type === "block");
  if (contentBlock) return contentBlock;

  return {
    _type: "block",
    style: "normal",
    children: cell?.children ?? [
      {
        _key: `${cell?._key ?? "cell"}-text`,
        _type: "span",
        text: cell?.text ?? "",
        marks: [],
      },
    ],
    markDefs: cell?.markDefs ?? [],
    ...(cell?._key ? { _key: cell._key } : {}),
  };
}

export function getTableCellText(cell: PortableTextTableCell | undefined): string {
  return getBlockText(getTableCellBlock(cell));
}

export function hasVisibleText(block: PortableTextBlock): boolean {
  if (block._type !== "block") return true;
  return Boolean(block.children?.some((child) => getChildText(child).trim()));
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

function makeInlineSpan(state: InlineParseState, text: string, marks: string[] = []): void {
  if (!text) return;
  state.spans.push({
    _key: `${state.prefix}-span-${state.spanIndex++}`,
    _type: "span",
    text,
    marks,
  });
}

function pushTextWithCitationMarks(state: InlineParseState, text: string, marks: string[]): void {
  const citationPattern = /\[(\d{1,2})\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = citationPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      makeInlineSpan(state, text.slice(lastIndex, match.index), marks);
    }

    const markKey = `${state.prefix}-citation-${state.markDefIndex++}`;
    const refNumber = Number.parseInt(match[1] ?? "", 10);
    state.markDefs.push({
      _type: "citation",
      _key: markKey,
      refNumber,
      href: `#ref${refNumber}`,
    });
    makeInlineSpan(state, String(refNumber), [...marks, markKey]);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    makeInlineSpan(state, text.slice(lastIndex), marks);
  }
}

function appendMarkdownInlineNode(
  state: InlineParseState,
  node: MarkdownNode,
  marks: string[] = [],
): void {
  switch (node.type) {
    case "root":
    case "paragraph":
    case "delete":
      for (const child of node.children ?? []) {
        appendMarkdownInlineNode(state, child, marks);
      }
      return;
    case "strong":
      for (const child of node.children ?? []) {
        appendMarkdownInlineNode(state, child, [...marks, "strong"]);
      }
      return;
    case "emphasis":
      for (const child of node.children ?? []) {
        appendMarkdownInlineNode(state, child, [...marks, "em"]);
      }
      return;
    case "inlineCode":
      makeInlineSpan(state, node.value ?? "", [...marks, "code"]);
      return;
    case "inlineMath":
      makeInlineSpan(state, node.value ?? "", [...marks, "mathInline"]);
      return;
    case "link": {
      const markKey = `${state.prefix}-link-${state.markDefIndex++}`;
      state.markDefs.push({
        _type: "link",
        _key: markKey,
        href: node.url ?? "#",
      });
      for (const child of node.children ?? []) {
        appendMarkdownInlineNode(state, child, [...marks, markKey]);
      }
      return;
    }
    case "text":
      pushTextWithCitationMarks(state, node.value ?? "", marks);
      return;
    case "break":
      makeInlineSpan(state, "\n", marks);
      return;
    case "footnoteReference":
      makeInlineSpan(state, `[^${node.identifier ?? ""}]`, marks);
      return;
    default:
      if (node.children?.length) {
        for (const child of node.children) {
          appendMarkdownInlineNode(state, child, marks);
        }
        return;
      }
      makeInlineSpan(state, node.value ?? "", marks);
  }
}

export function markdownInlineToTableCell(
  text: string,
  prefix = "markdown-cell",
): PortableTextTableCell {
  const state: InlineParseState = {
    markDefIndex: 0,
    markDefs: [],
    spanIndex: 0,
    spans: [],
    prefix,
  };

  try {
    const tree = markdownInlineProcessor.parse(text) as MarkdownNode;
    for (const child of tree.children ?? []) {
      appendMarkdownInlineNode(state, child);
    }
  } catch {
    makeInlineSpan(state, text, []);
  }

  const children = state.spans.length
    ? state.spans
    : [
        {
          _key: `${prefix}-span-0`,
          _type: "span" as const,
          text: "",
          marks: [],
        },
      ];
  const block: PortableTextBlock = {
    _key: `${prefix}-block`,
    _type: "block",
    style: "normal",
    children,
    markDefs: state.markDefs,
  };

  return {
    _key: prefix,
    content: [block],
  };
}

function normalizeTableRow(row: PortableTextTableRow, rowIndex: number): PortableTextTableRow {
  const cells = row.cells ?? row.richCells?.map((cell) => getTableCellText(cell)) ?? [];
  const richCells =
    row.richCells && row.richCells.length > 0
      ? row.richCells
      : cells.map((cell, cellIndex) =>
          markdownInlineToTableCell(cell, `${row._key ?? `row-${rowIndex}`}-cell-${cellIndex}`),
        );

  return {
    ...row,
    cells,
    richCells,
  };
}

function normalizeTableBlock(block: PortableTextBlock): PortableTextBlock {
  return {
    ...block,
    rows: block.rows?.map(normalizeTableRow) ?? [],
  };
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
      return normalizeTableBlock({
        _key: `${block._key ?? "markdown"}-table`,
        _type: "table",
        rows,
      });
    }
  }

  if (block._type === "table") {
    return normalizeTableBlock(block);
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
  if (span._type === "entityChip") {
    const name = span.name?.trim();
    if (!name) return "";
    return span.href ? `[${name}](${span.href})` : name;
  }

  const marks = span.marks ?? [];
  let text = span.text ?? "";

  if (marks.includes("mathInline")) text = `$${text}$`;
  if (marks.includes("code")) text = `\`${text}\``;
  if (marks.includes("strong")) text = `**${text}**`;
  if (marks.includes("em")) text = `*${text}*`;

  const href = marks.map((mark) => getMarkHref(block, mark)).find(Boolean);
  return href ? `[${text}](${href})` : text;
}

export function getTableCellCopyText(cell: PortableTextTableCell): string {
  const block = getTableCellBlock(cell);
  return block.children?.map((child) => getSpanCopyText(child, block)).join("") ?? "";
}

export function getPortableBlockCopyText(block: PortableTextBlock): string | null {
  if (block._type === "mathBlock") {
    const math = block.math?.trim();
    return math ? `$$\n${math}\n$$` : null;
  }

  if (block._type === "mermaid") {
    const code = block.code?.trimEnd();
    return code ? `\`\`\`mermaid\n${code}\n\`\`\`` : null;
  }

  if (block._type === "diagramBlock") {
    if (block.diagramType === "mermaid" && block.mermaidCode?.trim()) {
      return `\`\`\`mermaid\n${block.mermaidCode.trimEnd()}\n\`\`\``;
    }
    return [block.title, block.caption].filter(Boolean).join("\n\n") || null;
  }

  if (block._type === "code" || block._type === "codeHtml") {
    const code = block.code?.trimEnd();
    if (!code) return null;
    const language = block.language?.trim() ?? "";
    const filename = block.filename?.trim();
    const title = filename ? ` title="${filename.replaceAll('"', '\\"')}"` : "";
    return `\`\`\`${language}${title}\n${code}\n\`\`\``;
  }

  if (block._type === "table") {
    const rows =
      normalizeTableBlock(block).rows?.filter((row) =>
        row.richCells?.some((cell) => getTableCellText(cell).trim()),
      ) ?? [];
    if (!rows.length) return null;

    const tableRows = rows.map(
      (row) => `| ${(row.richCells ?? []).map(getTableCellCopyText).join(" | ")} |`,
    );
    const separator = `| ${(rows[0]?.richCells ?? []).map(() => "---").join(" | ")} |`;
    return [tableRows[0], separator, ...tableRows.slice(1)].join("\n");
  }

  if (block._type === "ctaBlock") {
    const title = block.title?.trim();
    const body = block.body?.trim();
    const items =
      block.items
        ?.map((item) => {
          const itemTitle = item.title?.trim();
          const itemBody = item.body?.trim();
          if (!itemTitle && !itemBody) return null;
          return `- ${[itemTitle, itemBody].filter(Boolean).join(": ")}`;
        })
        .filter((item): item is string => Boolean(item)) ?? [];
    const cta = block.ctaLabel && block.ctaHref ? `[${block.ctaLabel}](${block.ctaHref})` : null;

    return [title ? `## ${title}` : null, body, ...items, cta].filter(Boolean).join("\n\n");
  }

  if (block._type === "calloutBlock") {
    return [block.title ? `> **${block.title}**` : ">", block.body ? `> ${block.body}` : null]
      .filter(Boolean)
      .join("\n");
  }

  if (block._type === "quoteBlock") {
    const quote = block.quote?.trim();
    if (!quote) return null;
    return [`> ${quote}`, block.attribution ? `> — ${block.attribution}` : null]
      .filter(Boolean)
      .join("\n");
  }

  if (block._type === "statGrid") {
    const title = block.title ? `## ${block.title}` : null;
    const stats =
      block.items
        ?.map((item) => [item.value, item.label, item.caption].filter(Boolean).join(" — "))
        .filter(Boolean) ?? [];
    return [title, ...stats.map((item) => `- ${item}`)].filter(Boolean).join("\n\n") || null;
  }

  if (block._type === "comparisonTable") {
    const columns = block.columns?.filter(Boolean) ?? [];
    const rows = block.rows?.filter((row) => row.label || row.cells?.some(Boolean)) ?? [];
    if (columns.length < 2 || !rows.length) return null;
    const header = [block.dimensionLabel?.trim() || "Dimension", ...columns];
    const tableRows = [
      `| ${header.join(" | ")} |`,
      `| ${header.map(() => "---").join(" | ")} |`,
      ...rows.map((row) => `| ${[row.label ?? "", ...(row.cells ?? [])].join(" | ")} |`),
    ];
    return [block.title ? `## ${block.title}` : null, tableRows.join("\n")]
      .filter(Boolean)
      .join("\n\n");
  }

  if (block._type === "sourceCard") {
    const title = block.url && block.title ? `[${block.title}](${block.url})` : block.title;
    return [title, block.publisher, block.author, block.summary].filter(Boolean).join("\n");
  }

  if (block._type === "imageSet") {
    const captions =
      block.images
        ?.map((image) => [image.alt, image.caption].filter(Boolean).join(" — "))
        .filter(Boolean) ?? [];
    return [block.title, ...captions].filter(Boolean).join("\n\n") || null;
  }

  if (block._type === "embedBlock") {
    const title = block.url && block.title ? `[${block.title}](${block.url})` : block.title;
    return [title, block.caption].filter(Boolean).join("\n\n") || null;
  }

  if (block._type === "componentBlock") {
    return [block.componentKey, ...(block.props?.map((prop) => prop.value).filter(Boolean) ?? [])]
      .filter(Boolean)
      .join("\n");
  }

  if (block._type === "keyTakeaways") {
    const lines =
      block.items
        ?.map((item) => item.text?.trim())
        .filter((text): text is string => Boolean(text))
        .map((text, index) => `${index + 1}. ${text}`) ?? [];
    if (!lines.length) return null;
    return [block.title ? `## ${block.title}` : null, ...lines].filter(Boolean).join("\n");
  }

  if (block._type === "timelineBlock") {
    const lines =
      block.items
        ?.map((item) => {
          const marker = item.marker?.trim();
          const itemTitle = item.title?.trim();
          if (!marker && !itemTitle) return null;
          return `- **${[marker, itemTitle].filter(Boolean).join(" — ")}**${
            item.body?.trim() ? `: ${item.body.trim()}` : ""
          }`;
        })
        .filter((line): line is string => Boolean(line)) ?? [];
    if (!lines.length) return null;
    return [block.title ? `## ${block.title}` : null, ...lines].filter(Boolean).join("\n");
  }

  if (block._type === "chartBlock") {
    const points =
      block.points?.filter((point) => point.label?.trim() && point.value != null) ?? [];
    if (!points.length) return null;
    // A chart copies as a table: the numbers are the content, the geometry is
    // presentation, and a reader pasting this into notes wants the former.
    const rows = [
      "| Label | Value |",
      "| --- | --- |",
      ...points.map((point) => `| ${point.label} | ${point.display ?? point.value} |`),
    ];
    return [block.title ? `## ${block.title}` : null, rows.join("\n"), block.caption]
      .filter(Boolean)
      .join("\n\n");
  }

  if (block._type === "stepLadder") {
    const lines =
      block.steps
        ?.map((step) => {
          const stepTitle = step.title?.trim();
          if (!stepTitle) return null;
          return `- **${stepTitle}**${step.body?.trim() ? `: ${step.body.trim()}` : ""}`;
        })
        .filter((line): line is string => Boolean(line)) ?? [];
    if (!lines.length) return null;
    return [block.title ? `## ${block.title}` : null, ...lines].filter(Boolean).join("\n");
  }

  if (block._type === "faqBlock") {
    const entries =
      block.items
        ?.map((item) => {
          const question = item.question?.trim();
          const answer = item.answer?.trim();
          if (!question || !answer) return null;
          return `**${question}**\n\n${answer}`;
        })
        .filter((entry): entry is string => Boolean(entry)) ?? [];
    if (!entries.length) return null;
    return [block.title ? `## ${block.title}` : null, ...entries].filter(Boolean).join("\n\n");
  }

  if (block._type === "marginNote") {
    return (
      [block.title ? `> **${block.title}**` : null, block.body ? `> ${block.body}` : null]
        .filter(Boolean)
        .join("\n") || null
    );
  }

  if (block._type === "authorBio") {
    const links =
      block.links
        ?.filter((link) => link.label && link.href)
        .map((link) => `[${link.label}](${link.href})`) ?? [];
    return (
      [block.name, block.role, block.bio, links.join(" · ") || null].filter(Boolean).join("\n") ||
      null
    );
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
          return (
            normalizeTableBlock(block).rows?.flatMap(
              (row) => row.richCells?.map((cell) => getTableCellText(cell)) ?? [],
            ) ?? []
          );
        }
        if (block._type === "mathBlock") {
          return block.math ? [block.math] : [];
        }
        if (block._type === "mermaid") {
          return block.code ? [block.code] : [];
        }
        if (block._type === "diagramBlock") {
          return [block.title, block.mermaidCode, block.caption].filter((item): item is string =>
            Boolean(item),
          );
        }
        if (
          block._type === "calloutBlock" ||
          block._type === "quoteBlock" ||
          block._type === "sourceCard" ||
          block._type === "embedBlock"
        ) {
          return [
            block.title,
            block.body,
            block.quote,
            block.attribution,
            block.publisher,
            block.author,
            block.summary,
            block.caption,
          ].filter((item): item is string => Boolean(item));
        }
        if (block._type === "statGrid") {
          return [
            block.title,
            ...(block.items?.flatMap((item) => [item.value, item.label, item.caption]) ?? []),
          ].filter((item): item is string => Boolean(item));
        }
        if (block._type === "comparisonTable") {
          return [
            block.title,
            ...(block.columns ?? []),
            ...(block.rows?.flatMap((row) => [row.label, ...(row.cells ?? [])]) ?? []),
          ].filter((item): item is string => Boolean(item));
        }
        if (block._type === "imageSet") {
          return [
            block.title,
            ...(block.images?.flatMap((image) => [image.alt, image.caption]) ?? []),
          ].filter((item): item is string => Boolean(item));
        }
        if (
          block._type === "keyTakeaways" ||
          block._type === "timelineBlock" ||
          block._type === "faqBlock"
        ) {
          return [
            block.title,
            ...(block.items?.flatMap((item) => [
              item.text,
              item.marker,
              item.title,
              item.body,
              item.question,
              item.answer,
            ]) ?? []),
          ].filter((item): item is string => Boolean(item));
        }
        if (block._type === "stepLadder") {
          return [
            block.title,
            ...(block.steps?.flatMap((step) => [step.title, step.body]) ?? []),
          ].filter((item): item is string => Boolean(item));
        }
        if (block._type === "chartBlock") {
          return [
            block.title,
            block.caption,
            ...(block.points?.flatMap((point) => [point.label, point.display]) ?? []),
          ].filter((item): item is string => Boolean(item));
        }
        if (block._type === "marginNote" || block._type === "authorBio") {
          return [block.title, block.body, block.name, block.role, block.bio].filter(
            (item): item is string => Boolean(item),
          );
        }
        return block.children?.map(getChildText) ?? [];
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
