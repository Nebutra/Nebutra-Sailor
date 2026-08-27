import {
  type BlogLanguage,
  getBlockText,
  getTableCellBlock,
  getTableCellText,
  hasTemplatePlaceholders,
  hasVisibleText,
  normalizePortableTextBlocks,
  type PortableTextBlock,
  type PortableTextImage,
  type PortableTextSpan,
  type PortableTextTableCell,
  TEMPLATE_PLACEHOLDER_MARK,
} from "@nebutra/blog";
import { Hash } from "@nebutra/icons";
import { getImageDimensions, getImageUrl } from "@nebutra/sanity/image";
import {
  EditorialAuthorBio,
  EditorialCallout,
  EditorialChart,
  type EditorialChartPoint,
  EditorialComparisonTable,
  EditorialDataTable,
  type EditorialDataTableRow,
  EditorialDivider,
  EditorialEmbedCard,
  EditorialEntityChip,
  EditorialFaq,
  type EditorialFaqItem,
  EditorialFigure,
  EditorialFigureGroup,
  EditorialKeyTakeaways,
  EditorialMarginNote,
  EditorialPullQuote,
  EditorialSourceIndex,
  type EditorialSourceItem,
  EditorialStatGrid,
  type EditorialStatItem,
  type EditorialStep,
  EditorialStepLadder,
  EditorialTimeline,
  type EditorialTimelineItem,
  isEditorialEmbedProvider,
  isEditorialTone,
} from "@nebutra/ui/editorial";
import { PortableText, type PortableTextComponents } from "@portabletext/react";
import katex from "katex";
import Image from "next/image";
import type { ReactNode } from "react";
import { prepareBlogPortableTextBlocks } from "@/lib/blog-code-highlighting";
import { isZhUiLocale } from "@/lib/i18n/localized";
import { BlogCodeBlock } from "./blog-code-block";
import { BlogCopyButton } from "./blog-copy-button";
import { BlogCtaBlock, type BlogCtaBlockItem } from "./blog-cta-block";
import { BlogMermaidDiagram } from "./blog-mermaid-diagram";

type SourceCardGroupBlock = PortableTextBlock & {
  sources: PortableTextBlock[];
};

/**
 * Fallbacks for block eyebrows the author left blank.
 *
 * Authored labels always win — a post is one document per language, so the
 * author writes the eyebrow in the right language. These only cover the case
 * where a block carries no label at all, which is why they must not be baked
 * into `@nebutra/ui/editorial`.
 */
const UI_LABELS = {
  en: {
    authoredBy: "Written by",
    dimension: "Dimension",
    references: "Source index",
    sourceSummary: (count: number) => `${count} source${count === 1 ? "" : "s"} behind this note.`,
    takeaways: "Key takeaways",
  },
  zh: {
    authoredBy: "作者",
    dimension: "维度",
    references: "资料索引",
    sourceSummary: (count: number) => `${count} 个来源支撑这篇笔记。`,
    takeaways: "核心结论",
  },
} as const;

function labelsFor(language: BlogLanguage) {
  return isZhUiLocale(language) ? UI_LABELS.zh : UI_LABELS.en;
}

function trimmed(value: string | null | undefined): string | undefined {
  const text = value?.trim();
  return text || undefined;
}

// ─── Sanity image adapters ────────────────────────────────────────────────────
//
// `@nebutra/ui/editorial` takes rendered media as a slot, so `next/image` and
// the Sanity URL builder stay here in the app.

// Editorial figures are authored at whatever shape the diagram needs — a wide
// three-frame plate is 2:1, a portrait card is 3:4. Declaring a fixed 16:9 pair
// here made the browser adopt that ratio (the UA maps width/height onto
// `aspect-ratio`) and `object-cover` cropped the overflow off both edges.
const FALLBACK_IMAGE_RATIO = { width: 1200, height: 675 };

function sanityImageNode(image: PortableTextImage, sizes: string): ReactNode {
  const source = image as Parameters<typeof getImageUrl>[0];
  const url = getImageUrl(source, { width: 1200, format: "webp" });
  const intrinsic = getImageDimensions(source) ?? FALLBACK_IMAGE_RATIO;

  return (
    <Image
      alt={image.alt ?? ""}
      className="h-auto w-full"
      height={intrinsic.height}
      sizes={sizes}
      src={url}
      width={intrinsic.width}
    />
  );
}

function sanityAvatarNode(image: PortableTextImage, size: number): ReactNode {
  const url = getImageUrl(image as Parameters<typeof getImageUrl>[0], {
    width: size * 2,
    height: size * 2,
    format: "webp",
  });

  return (
    <Image
      alt={image.alt ?? ""}
      className="size-full object-cover"
      height={size}
      src={url}
      width={size}
    />
  );
}

// ─── Table cells ──────────────────────────────────────────────────────────────

function getTableCellMarkDef(
  block: PortableTextBlock,
  mark: string,
): Record<string, unknown> | null {
  return block.markDefs?.find((markDef) => markDef._key === mark) ?? null;
}

function renderTableCellMark(
  mark: string,
  children: ReactNode,
  block: PortableTextBlock,
  key: string,
): ReactNode {
  const markDef = getTableCellMarkDef(block, mark);

  if (markDef?._type === "link") {
    const href = typeof markDef.href === "string" ? markDef.href : "#";
    const isExternal = /^https?:\/\//.test(href);
    return (
      <a
        key={key}
        href={href}
        className="font-medium text-foreground underline decoration-[hsl(var(--border))] underline-offset-4 transition-colors hover:decoration-[hsl(var(--primary))]"
        rel={isExternal ? "noopener noreferrer" : undefined}
        target={isExternal ? "_blank" : undefined}
      >
        {children}
      </a>
    );
  }

  if (markDef?._type === "citation") {
    const href = typeof markDef.href === "string" ? markDef.href : "#";
    return (
      <sup key={key} className="mx-0.5 font-mono font-semibold text-[0.68em] leading-none">
        [
        <a
          href={href}
          className="text-primary no-underline decoration-[var(--blue-7)] decoration-dotted hover:underline"
        >
          {children}
        </a>
        ]
      </sup>
    );
  }

  if (mark === "strong") {
    return (
      <strong key={key} className="font-semibold text-foreground">
        {children}
      </strong>
    );
  }

  if (mark === "em") {
    return (
      <em key={key} className="italic text-foreground">
        {children}
      </em>
    );
  }

  if (mark === "code") {
    return (
      <code
        key={key}
        className="rounded-[var(--radius-sm)] border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground"
      >
        {children}
      </code>
    );
  }

  if (mark === "mathInline") {
    return <BlogInlineMath key={key}>{children}</BlogInlineMath>;
  }

  if (mark === "highlight") {
    return (
      <mark key={key} className={cnHighlight}>
        {children}
      </mark>
    );
  }

  if (mark === "kbd") {
    return (
      <kbd
        key={key}
        className="rounded-[var(--radius-sm)] border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.82em] text-foreground"
      >
        {children}
      </kbd>
    );
  }

  if (mark === "sup") {
    return (
      <sup key={key} className="text-[0.72em] leading-none">
        {children}
      </sup>
    );
  }

  if (mark === "sub") {
    return (
      <sub key={key} className="text-[0.72em] leading-none">
        {children}
      </sub>
    );
  }

  if (mark === TEMPLATE_PLACEHOLDER_MARK) {
    return (
      <span
        key={key}
        className="mx-0.5 inline-flex rounded-[var(--radius-sm)] border border-dashed border-border bg-muted px-1.5 py-0.5 font-mono text-[0.88em] font-medium text-foreground"
      >
        {children}
      </span>
    );
  }

  return <span key={key}>{children}</span>;
}

/**
 * Highlight wash.
 *
 * Built from the warning status token rather than `bg-amber-200`: the raw
 * palette class has no dark-mode value, so a highlighted phrase used to sit as
 * a near-white block in dark mode.
 */
const cnHighlight =
  "rounded-[var(--radius-sm)] bg-[color-mix(in_srgb,var(--status-warning)_28%,transparent)] px-1 text-foreground";

function BlogTableCellSpan({
  block,
  index,
  span,
}: {
  block: PortableTextBlock;
  index: number;
  span: PortableTextSpan;
}) {
  if (span._type === "entityChip") {
    return (
      <EditorialEntityChip
        key={span._key ?? index}
        href={span.href ?? null}
        name={span.name ?? ""}
      />
    );
  }

  const marks = span.marks ?? [];
  let node: ReactNode = span.text ?? "";

  for (let markIndex = marks.length - 1; markIndex >= 0; markIndex -= 1) {
    const mark = marks[markIndex];
    if (!mark) continue;
    node = renderTableCellMark(mark, node, block, `${span._key ?? index}-${mark}-${markIndex}`);
  }

  return <span key={span._key ?? index}>{node}</span>;
}

function BlogTableCellContent({ cell }: { cell: PortableTextTableCell }) {
  const block = getTableCellBlock(cell);

  return (
    <>
      {block.children?.map((span, index) => (
        <BlogTableCellSpan
          key={span._key ?? `${block._key ?? "cell"}-${index}`}
          block={block}
          index={index}
          span={span}
        />
      ))}
    </>
  );
}

// ─── Localization of authored prose ───────────────────────────────────────────

function localizeTldrLabel(text: string, language: BlogLanguage): string {
  if (language !== "zh") return text;

  return text.replace(
    /^(\s*)TL\s*;?\s*DR(?:(:|：))?/i,
    (_match, leading: string, colon?: string) => `${leading}太长不看${colon ? "：" : ""}`,
  );
}

function localizeBlockquoteLabel(
  block: PortableTextBlock,
  language: BlogLanguage,
): PortableTextBlock {
  if (language !== "zh" || block._type !== "block" || block.style !== "blockquote") {
    return block;
  }

  let replaced = false;
  const children = block.children?.map((child) => {
    if (replaced || child._type !== "span" || !child.text) return child;
    const localizedText = localizeTldrLabel(child.text, language);
    if (localizedText === child.text) return child;
    replaced = true;
    return { ...child, text: localizedText };
  });

  return replaced ? { ...block, children } : block;
}

// ─── Block adapters ───────────────────────────────────────────────────────────

function BlogTable({ value }: { value: PortableTextBlock }) {
  const rows =
    value.rows
      ?.map((row, rowIndex) => ({
        key: row._key ?? `${value._key ?? "table"}-row-${rowIndex}`,
        cells:
          row.richCells && row.richCells.length > 0
            ? row.richCells
            : (row.cells ?? []).map((cell, cellIndex) => ({
                _key: `${row._key ?? rowIndex}-cell-${cellIndex}`,
                text: cell,
              })),
      }))
      .filter((row) => row.cells.some((cell) => getTableCellText(cell).trim())) ?? [];
  const [header, ...bodyRows] = rows;
  if (!header?.cells.length) return null;

  const head: ReactNode[] = header.cells.map((cell, index) => (
    <BlogTableCellContent key={`${header.key}-head-${index}`} cell={cell} />
  ));
  const dataRows: EditorialDataTableRow[] = bodyRows.map((row) => ({
    key: row.key,
    cells: row.cells.map((cell, cellIndex) => (
      <BlogTableCellContent key={`${row.key}-cell-${cellIndex}`} cell={cell} />
    )),
  }));

  return <EditorialDataTable head={head} rows={dataRows} />;
}

function getHeadingId(
  value: unknown,
  headingIds: Record<string, string> | undefined,
): string | undefined {
  const key = (value as PortableTextBlock | undefined)?._key;
  return key ? headingIds?.[key] : undefined;
}

function HeadingAnchor({ id }: { id: string | undefined }) {
  if (!id) return null;

  return (
    <a
      href={`#${id}`}
      aria-label="Link to section"
      className="ml-2 inline-flex translate-y-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
    >
      <Hash className="size-[0.8em]" aria-hidden />
    </a>
  );
}

function reactNodeToText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(reactNodeToText).join("");
  return "";
}

function renderMath(math: string, displayMode: boolean): string {
  return katex.renderToString(math, {
    displayMode,
    output: "htmlAndMathml",
    strict: false,
    throwOnError: false,
  });
}

function BlogInlineMath({ children }: { children: ReactNode }) {
  const math = reactNodeToText(children).trim();
  if (!math) return null;

  return (
    <span
      className="blog-math-inline"
      dangerouslySetInnerHTML={{ __html: renderMath(math, false) }}
    />
  );
}

function BlogMathBlock({ value }: { value: PortableTextBlock }) {
  const math = value.math?.trim();
  if (!math) return null;

  return (
    <figure className="blog-math-block my-8 overflow-x-auto rounded-[var(--radius-xl)] border border-border bg-background px-4 py-5 shadow-ambient-sm">
      <div dangerouslySetInnerHTML={{ __html: renderMath(math, true) }} />
    </figure>
  );
}

function BlogCalloutBlock({ value }: { value: PortableTextBlock }) {
  return (
    <EditorialCallout
      label={trimmed(value.label)}
      title={trimmed(value.title)}
      tone={isEditorialTone(value.tone) ? value.tone : "note"}
    >
      {trimmed(value.body)}
    </EditorialCallout>
  );
}

function BlogQuoteBlock({ value }: { value: PortableTextBlock }) {
  const quote = value.quote?.trim();
  if (!quote) return null;

  return (
    <EditorialPullQuote
      attribution={trimmed(value.attribution) ?? null}
      portrait={value.portrait?.asset?._ref ? sanityAvatarNode(value.portrait, 36) : undefined}
      quote={quote}
      role={trimmed(value.role) ?? null}
      sourceHref={trimmed(value.sourceHref) ?? null}
    />
  );
}

function BlogStatGrid({ value }: { value: PortableTextBlock }) {
  const items: EditorialStatItem[] =
    value.items
      ?.filter((item) => item.value && item.label)
      .map((item, index) => ({
        caption: trimmed(item.caption) ?? null,
        key: item._key ?? `${value._key ?? "stat"}-${index}`,
        label: item.label ?? "",
        value: item.value ?? "",
      })) ?? [];

  return (
    <EditorialStatGrid
      items={items}
      label={trimmed(value.label)}
      title={trimmed(value.title) ?? null}
    />
  );
}

function BlogComparisonTable({
  language,
  value,
}: {
  language: BlogLanguage;
  value: PortableTextBlock;
}) {
  const columns = value.columns?.filter(Boolean) ?? [];
  const rows =
    value.rows
      ?.filter((row) => row.label || row.cells?.some(Boolean))
      .map((row, index) => ({
        cells: row.cells ?? [],
        key: row._key ?? `${value._key ?? "comparison"}-${index}`,
        label: row.label ?? "",
      })) ?? [];

  return (
    <EditorialComparisonTable
      columns={columns}
      dimensionLabel={trimmed(value.dimensionLabel) ?? labelsFor(language).dimension}
      label={trimmed(value.label)}
      rows={rows}
      title={trimmed(value.title) ?? null}
    />
  );
}

function toSourceItem(block: PortableTextBlock, index: number): EditorialSourceItem | null {
  if (!block.title || !block.url) return null;
  return {
    accessedAt: trimmed(block.accessedAt) ?? null,
    author: trimmed(block.author) ?? null,
    key: block._key ?? `source-${index}`,
    publisher: trimmed(block.publisher) ?? null,
    summary: trimmed(block.summary) ?? null,
    title: block.title,
    url: block.url,
  };
}

function BlogSourceIndex({
  blocks,
  language,
}: {
  blocks: PortableTextBlock[];
  language: BlogLanguage;
}) {
  const sources = blocks
    .map(toSourceItem)
    .filter((source): source is EditorialSourceItem => source !== null);
  if (!sources.length) return null;

  const labels = labelsFor(language);

  return (
    <EditorialSourceIndex
      label={labels.references}
      sources={sources}
      summary={labels.sourceSummary(sources.length)}
    />
  );
}

function BlogImageSet({ value }: { value: PortableTextBlock }) {
  const images = value.images?.filter((image) => image.asset?._ref) ?? [];
  if (!images.length) return null;

  const variant =
    value.variant === "comparison" || value.variant === "sequence" ? value.variant : "grid";

  return (
    <EditorialFigureGroup
      label={trimmed(value.label)}
      title={trimmed(value.title) ?? null}
      variant={variant}
    >
      {images.map((image, index) => (
        <EditorialFigure
          key={image._key ?? `${value._key ?? "image-set"}-${index}`}
          caption={image.caption}
          media={sanityImageNode(image, "(max-width: 640px) 100vw, 480px")}
        />
      ))}
    </EditorialFigureGroup>
  );
}

function BlogEmbedBlock({ value }: { value: PortableTextBlock }) {
  if (!value.url || !value.title) return null;

  return (
    <EditorialEmbedCard
      caption={trimmed(value.caption) ?? null}
      provider={isEditorialEmbedProvider(value.provider) ? value.provider : "website"}
      title={value.title}
      url={value.url}
    />
  );
}

/**
 * Diagram block.
 *
 * The `concept` variant has no renderer, and previously fell through to a
 * dashed box reading "needs a supported renderer" — an engineering note shipped
 * to readers. It now degrades to the authored title and caption, which is the
 * part a reader can actually use.
 */
function BlogDiagramBlock({ value }: { value: PortableTextBlock }) {
  const title = trimmed(value.title);
  const caption = trimmed(value.caption);

  if (value.diagramType === "mermaid" && value.mermaidCode) {
    return (
      <figure className="my-10">
        {title && (
          <figcaption className="mb-3 text-sm font-semibold text-foreground">{title}</figcaption>
        )}
        <BlogMermaidDiagram chart={value.mermaidCode} />
        {caption && <p className="mt-2 text-center text-sm text-muted-foreground">{caption}</p>}
      </figure>
    );
  }

  const image = value.images?.[0] ?? (value as { image?: PortableTextImage }).image;
  if (value.diagramType === "image" && image?.asset?._ref) {
    return (
      <EditorialFigure
        caption={caption ?? image.caption}
        media={sanityImageNode(image, "(max-width: 768px) 100vw, 860px")}
        width="breakout"
      />
    );
  }

  if (!title && !caption) return null;

  return (
    <figure className="my-8">
      {title && <p className="text-sm font-semibold text-foreground">{title}</p>}
      {caption && (
        <figcaption className="mt-1 text-sm leading-6 text-muted-foreground">{caption}</figcaption>
      )}
    </figure>
  );
}

/**
 * Whitelisted component block.
 *
 * An unrecognized `componentKey` renders nothing. The previous fallback printed
 * the key and every prop as a definition list, which is a debugging view: an
 * author typo became a panel of `componentKey / props` jargon in a published
 * article.
 */
function BlogComponentBlock({ value }: { value: PortableTextBlock }) {
  const props = value.props?.filter((prop) => prop.name) ?? [];
  const byName = new Map(props.map((prop) => [prop.name ?? "", prop.value ?? ""]));

  if (value.componentKey === "articleDivider") {
    return <EditorialDivider />;
  }

  if (value.componentKey === "frontierNote") {
    const body = trimmed(byName.get("body"));
    if (!body) return null;
    return (
      <EditorialCallout
        label={trimmed(byName.get("label"))}
        title={trimmed(byName.get("title"))}
        tone="insight"
      >
        {body}
      </EditorialCallout>
    );
  }

  if (value.componentKey === "outcomeLadder") {
    // Each prop is one rung: the prop name is the outcome, its value the detail.
    const steps: EditorialStep[] = props
      .filter((prop) => prop.name)
      .map((prop, index) => ({
        body: trimmed(prop.value) ?? null,
        key: prop._key ?? `${value._key ?? "ladder"}-${index}`,
        title: prop.name ?? "",
      }));
    if (steps.length < 2) return null;
    return <EditorialStepLadder label={trimmed(value.label)} steps={steps} />;
  }

  return null;
}

function BlogKeyTakeaways({
  language,
  value,
}: {
  language: BlogLanguage;
  value: PortableTextBlock;
}) {
  const items =
    value.items
      ?.filter((item) => item.text?.trim())
      .map((item, index) => ({
        key: item._key ?? `${value._key ?? "takeaway"}-${index}`,
        text: item.text ?? "",
      })) ?? [];
  if (!items.length) return null;

  return (
    <EditorialKeyTakeaways
      items={items}
      label={trimmed(value.label) ?? labelsFor(language).takeaways}
      title={trimmed(value.title) ?? null}
    />
  );
}

function BlogTimelineBlock({ value }: { value: PortableTextBlock }) {
  const items: EditorialTimelineItem[] =
    value.items
      ?.filter((item) => item.marker?.trim() && item.title?.trim())
      .map((item, index) => ({
        body: trimmed(item.body) ?? null,
        key: item._key ?? `${value._key ?? "timeline"}-${index}`,
        marker: item.marker ?? "",
        title: item.title ?? "",
      })) ?? [];
  if (!items.length) return null;

  return (
    <EditorialTimeline
      items={items}
      label={trimmed(value.label)}
      title={trimmed(value.title) ?? null}
    />
  );
}

function BlogChartBlock({ value }: { value: PortableTextBlock }) {
  const points: EditorialChartPoint[] =
    value.points
      ?.filter((point) => point.label?.trim() && typeof point.value === "number")
      .map((point, index) => ({
        display: trimmed(point.display) ?? null,
        key: point._key ?? `${value._key ?? "point"}-${index}`,
        label: point.label ?? "",
        value: point.value ?? 0,
      })) ?? [];
  if (!points.length) return null;

  return (
    <EditorialChart
      caption={trimmed(value.caption) ?? null}
      label={trimmed(value.label)}
      points={points}
      title={trimmed(value.title) ?? null}
      variant={value.variant === "line" ? "line" : "bar"}
    />
  );
}

function BlogStepLadder({ value }: { value: PortableTextBlock }) {
  const steps: EditorialStep[] =
    value.steps
      ?.filter((step) => step.title?.trim())
      .map((step, index) => ({
        body: trimmed(step.body) ?? null,
        key: step._key ?? `${value._key ?? "step"}-${index}`,
        title: step.title ?? "",
      })) ?? [];
  if (!steps.length) return null;

  return (
    <EditorialStepLadder
      label={trimmed(value.label)}
      steps={steps}
      title={trimmed(value.title) ?? null}
    />
  );
}

function BlogFaqBlock({ value }: { value: PortableTextBlock }) {
  const items: EditorialFaqItem[] =
    value.items
      ?.filter((item) => item.question?.trim() && item.answer?.trim())
      .map((item, index) => ({
        answer: item.answer ?? "",
        key: item._key ?? `${value._key ?? "faq"}-${index}`,
        question: item.question ?? "",
      })) ?? [];
  if (!items.length) return null;

  return (
    <EditorialFaq
      defaultOpenFirst={value.defaultOpenFirst === true}
      items={items}
      label={trimmed(value.label)}
      title={trimmed(value.title) ?? null}
    />
  );
}

function BlogAuthorBio({ language, value }: { language: BlogLanguage; value: PortableTextBlock }) {
  if (!value.name?.trim()) return null;

  const links =
    value.links
      ?.filter((link) => link.label && link.href)
      .map((link, index) => ({
        href: link.href ?? "",
        key: link._key ?? `${value._key ?? "link"}-${index}`,
        label: link.label ?? "",
      })) ?? [];

  return (
    <EditorialAuthorBio
      avatar={value.avatar?.asset?._ref ? sanityAvatarNode(value.avatar, 48) : undefined}
      bio={trimmed(value.bio) ?? null}
      label={trimmed(value.label) ?? labelsFor(language).authoredBy}
      links={links}
      name={value.name}
      role={trimmed(value.role) ?? null}
    />
  );
}

/**
 * Adjacent source cards become one numbered index.
 *
 * Authors write references as a run of `sourceCard` blocks; readers want a
 * single ordered list they can scan and cite against.
 */
function groupAdjacentSourceCards(blocks: PortableTextBlock[]): PortableTextBlock[] {
  const grouped: PortableTextBlock[] = [];
  let pendingSources: PortableTextBlock[] = [];

  const flushSources = () => {
    if (pendingSources.length === 0) return;
    grouped.push({
      _key: `${pendingSources[0]?._key ?? "source"}-group`,
      _type: "sourceCardGroup",
      sources: pendingSources,
    } as SourceCardGroupBlock);
    pendingSources = [];
  };

  for (const block of blocks) {
    if (block._type === "sourceCard") {
      pendingSources.push(block);
      continue;
    }
    flushSources();
    grouped.push(block);
  }

  flushSources();
  return grouped;
}

function getCtaItems(value: PortableTextBlock): BlogCtaBlockItem[] {
  return (
    value.items?.map((item, index) => ({
      body: item.body ?? undefined,
      key: item._key ?? `${value._key ?? "cta"}-${index}`,
      title: item.title ?? undefined,
    })) ?? []
  );
}

function createPortableTextComponents(
  copyLabel: string,
  copiedLabel: string,
  language: BlogLanguage,
  headingIds?: Record<string, string>,
  resolveCtaHref: (href: string) => string = (href) => href,
): PortableTextComponents {
  return {
    block: {
      normal: ({ children }) => {
        return (
          <p className="mt-5 text-[1.03rem] leading-[1.95] text-muted-foreground">{children}</p>
        );
      },
      h2: ({ children, value }) => {
        const id = getHeadingId(value, headingIds);
        return (
          <h2 id={id} className="group mt-16 scroll-mt-28 text-2xl font-semibold text-foreground">
            {children}
            <HeadingAnchor id={id} />
          </h2>
        );
      },
      h3: ({ children, value }) => {
        const id = getHeadingId(value, headingIds);
        return (
          <h3 id={id} className="group mt-11 scroll-mt-28 text-xl font-semibold text-foreground">
            {children}
            <HeadingAnchor id={id} />
          </h3>
        );
      },
      h4: ({ children, value }) => {
        const id = getHeadingId(value, headingIds);
        return (
          <h4 id={id} className="group mt-8 scroll-mt-28 text-base font-semibold text-foreground">
            {children}
            <HeadingAnchor id={id} />
          </h4>
        );
      },
      blockquote: ({ children, value }) => {
        const text = getBlockText(value as PortableTextBlock);
        const isTemplate = hasTemplatePlaceholders(text);

        if (!isTemplate) {
          return (
            <blockquote className="my-8 border-l-2 border-border pl-5 text-lg font-medium leading-9 text-foreground">
              {children}
            </blockquote>
          );
        }

        return (
          <blockquote className="group relative my-7 rounded-[var(--radius-xl)] border border-border bg-background px-5 py-4 text-base font-medium leading-8 text-foreground shadow-ambient-sm">
            <div className="pr-10">{children}</div>
            <div className="absolute right-3 top-3">
              <BlogCopyButton
                value={text}
                label={copyLabel}
                copiedLabel={copiedLabel}
                variant="icon"
              />
            </div>
          </blockquote>
        );
      },
    },
    list: {
      bullet: ({ children }) => (
        <ul className="mt-5 list-disc space-y-2.5 pl-6 text-muted-foreground marker:text-muted-foreground">
          {children}
        </ul>
      ),
      number: ({ children }) => (
        <ol className="mt-5 list-decimal space-y-2.5 pl-6 text-muted-foreground marker:text-muted-foreground">
          {children}
        </ol>
      ),
    },
    listItem: {
      bullet: ({ children }) => <li className="leading-8">{children}</li>,
      number: ({ children, value }) => {
        const referenceNumber =
          typeof (value as PortableTextBlock | undefined)?.referenceNumber === "number"
            ? (value as PortableTextBlock).referenceNumber
            : null;

        return (
          <li
            id={referenceNumber ? `ref${referenceNumber}` : undefined}
            className="scroll-mt-28 leading-8 target:rounded-[var(--radius-sm)] target:bg-[var(--blue-2)] target:px-2 target:py-1"
          >
            {children}
          </li>
        );
      },
    },
    marks: {
      link: ({ children, value }) => {
        const href = typeof value?.href === "string" ? value.href : "#";
        const isExternal = /^https?:\/\//.test(href);
        const openInNewTab = value?.openInNewTab === true || isExternal;

        return (
          <a
            href={href}
            aria-label={typeof value?.label === "string" ? value.label : undefined}
            className="font-medium text-foreground underline decoration-[hsl(var(--border))] underline-offset-4 transition-colors hover:decoration-[hsl(var(--primary))]"
            rel={openInNewTab ? "noopener noreferrer" : undefined}
            target={openInNewTab ? "_blank" : undefined}
          >
            {children}
          </a>
        );
      },
      code: ({ children }) => (
        <code className="rounded-[var(--radius-sm)] border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground">
          {children}
        </code>
      ),
      mathInline: ({ children }) => <BlogInlineMath>{children}</BlogInlineMath>,
      citation: ({ children, value }) => {
        const href = typeof value?.href === "string" ? value.href : "#";

        return (
          <sup className="mx-0.5 font-mono font-semibold text-[0.68em] leading-none">
            [
            <a
              href={href}
              className="text-primary no-underline decoration-[var(--blue-7)] decoration-dotted hover:underline"
            >
              {children}
            </a>
            ]
          </sup>
        );
      },
      strong: ({ children }) => (
        <strong className="font-semibold text-foreground">{children}</strong>
      ),
      em: ({ children }) => <em className="italic text-foreground">{children}</em>,
      highlight: ({ children }) => <mark className={cnHighlight}>{children}</mark>,
      kbd: ({ children }) => (
        <kbd className="rounded-[var(--radius-sm)] border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.82em] text-foreground">
          {children}
        </kbd>
      ),
      sup: ({ children }) => <sup className="text-[0.72em] leading-none">{children}</sup>,
      sub: ({ children }) => <sub className="text-[0.72em] leading-none">{children}</sub>,
      footnote: ({ children, value }) => {
        const note = typeof value?.note === "string" ? value.note : "";
        return (
          <span className="group/footnote relative inline-flex">
            <span className="underline decoration-dotted underline-offset-4">{children}</span>
            {note && (
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-64 -translate-x-1/2 rounded-[var(--radius-lg)] border border-border bg-background p-3 text-xs leading-5 text-muted-foreground shadow-ambient-md group-hover/footnote:block">
                {note}
              </span>
            )}
          </span>
        );
      },
      anchor: ({ children, value }) => {
        const id = typeof value?.id === "string" ? value.id : undefined;
        return id ? <span id={id}>{children}</span> : children;
      },
      [TEMPLATE_PLACEHOLDER_MARK]: ({ children }) => (
        <span className="mx-0.5 inline-flex rounded-[var(--radius-sm)] border border-dashed border-border bg-muted px-1.5 py-0.5 font-mono text-[0.88em] font-medium text-foreground">
          {children}
        </span>
      ),
    },
    types: {
      authorBio: ({ value }) => (
        <BlogAuthorBio language={language} value={value as PortableTextBlock} />
      ),
      calloutBlock: ({ value }) => <BlogCalloutBlock value={value as PortableTextBlock} />,
      chartBlock: ({ value }) => <BlogChartBlock value={value as PortableTextBlock} />,
      comparisonTable: ({ value }) => (
        <BlogComparisonTable language={language} value={value as PortableTextBlock} />
      ),
      componentBlock: ({ value }) => <BlogComponentBlock value={value as PortableTextBlock} />,
      ctaBlock: ({ value }) => {
        const block = value as PortableTextBlock;
        return (
          <BlogCtaBlock
            body={typeof block.body === "string" ? block.body : undefined}
            ctaHref={typeof block.ctaHref === "string" ? resolveCtaHref(block.ctaHref) : undefined}
            ctaLabel={typeof block.ctaLabel === "string" ? block.ctaLabel : undefined}
            items={getCtaItems(block)}
            title={typeof block.title === "string" ? block.title : undefined}
          />
        );
      },
      diagramBlock: ({ value }) => <BlogDiagramBlock value={value as PortableTextBlock} />,
      embedBlock: ({ value }) => <BlogEmbedBlock value={value as PortableTextBlock} />,
      faqBlock: ({ value }) => <BlogFaqBlock value={value as PortableTextBlock} />,
      imageSet: ({ value }) => <BlogImageSet value={value as PortableTextBlock} />,
      keyTakeaways: ({ value }) => (
        <BlogKeyTakeaways language={language} value={value as PortableTextBlock} />
      ),
      marginNote: ({ value }) => {
        const block = value as PortableTextBlock;
        return (
          <EditorialMarginNote label={trimmed(block.label)} title={trimmed(block.title) ?? null}>
            {trimmed(block.body) ?? null}
          </EditorialMarginNote>
        );
      },
      mathBlock: ({ value }) => <BlogMathBlock value={value as PortableTextBlock} />,
      mermaid: ({ value }) => (
        <BlogMermaidDiagram chart={typeof value?.code === "string" ? value.code : ""} />
      ),
      quoteBlock: ({ value }) => <BlogQuoteBlock value={value as PortableTextBlock} />,
      sourceCard: ({ value }) => (
        <BlogSourceIndex blocks={[value as PortableTextBlock]} language={language} />
      ),
      sourceCardGroup: ({ value }) => (
        <BlogSourceIndex blocks={(value as SourceCardGroupBlock).sources} language={language} />
      ),
      statGrid: ({ value }) => <BlogStatGrid value={value as PortableTextBlock} />,
      stepLadder: ({ value }) => <BlogStepLadder value={value as PortableTextBlock} />,
      timelineBlock: ({ value }) => <BlogTimelineBlock value={value as PortableTextBlock} />,
      codeHtml: ({ value }) => (
        <BlogCodeBlock
          code={typeof value?.code === "string" ? value.code : ""}
          copiedLabel={copiedLabel}
          copyLabel={copyLabel}
          filename={typeof value?.filename === "string" ? value.filename : null}
          html={typeof value?.html === "string" ? value.html : ""}
          language={typeof value?.language === "string" ? value.language : null}
        />
      ),
      entityChip: ({ value }) => {
        const block = value as PortableTextBlock;
        if (!block.name) return null;
        return (
          <EditorialEntityChip
            href={block.href ?? null}
            logo={block.logo?.asset?._ref ? sanityAvatarNode(block.logo, 20) : undefined}
            name={block.name}
          />
        );
      },
      inlineBadge: ({ value }) => {
        const label = typeof value?.label === "string" ? value.label : null;
        if (!label) return null;

        return (
          <span className="mx-1 inline-flex rounded-full border border-border bg-muted px-2 py-0.5 align-middle text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {label}
          </span>
        );
      },
      table: ({ value }) => <BlogTable value={value as PortableTextBlock} />,
      image: ({ value }) => {
        const image = value as PortableTextImage;
        if (!image.asset?._ref) return null;

        return (
          <EditorialFigure
            caption={image.caption}
            media={sanityImageNode(image, "(max-width: 768px) 100vw, 860px")}
            width="breakout"
          />
        );
      },
    },
  };
}

export async function BlogPortableText({
  body,
  copyLabel = "Copy original",
  copiedLabel = "Copied",
  headingIds,
  language = "en",
  resolveCtaHref,
}: {
  body: PortableTextBlock[] | null | undefined;
  copyLabel?: string;
  copiedLabel?: string;
  headingIds?: Record<string, string>;
  language?: BlogLanguage;
  resolveCtaHref?: (href: string) => string;
}) {
  if (!body?.length) return null;
  const visibleBody = await prepareBlogPortableTextBlocks(
    groupAdjacentSourceCards(
      normalizePortableTextBlocks(body)
        .map((block) => localizeBlockquoteLabel(block, language))
        .filter(hasVisibleText),
    ),
  );
  if (!visibleBody.length) return null;

  return (
    <div
      className={`max-w-none text-muted-foreground ${isZhUiLocale(language) ? "cjk-prose" : ""}`}
    >
      <style>{`
        .blog-code-html .shiki {
          margin: 0;
          background: transparent !important;
          padding: 1rem 0;
          font-family: var(--font-mono);
          font-size: 0.875rem;
          line-height: 1.75;
        }
        .blog-code-html .shiki code {
          font-family: inherit;
        }
        .blog-code-html .line {
          display: block;
          min-height: 1.55rem;
          padding: 0 1rem;
        }
        .blog-code-html .line[data-line]::before {
          content: attr(data-line);
          display: inline-block;
          width: 2.25rem;
          margin-right: 1rem;
          color: hsl(var(--muted-foreground));
          text-align: right;
          user-select: none;
        }
        .blog-code-html .line[data-highlighted="true"] {
          background: color-mix(in oklch, var(--blue-3) 74%, transparent);
        }
        .blog-code-html .line[data-diff="add"] {
          background: color-mix(in srgb, var(--status-success) 18%, transparent);
        }
        .blog-code-html .line[data-diff="remove"] {
          background: color-mix(in srgb, var(--status-danger) 18%, transparent);
        }
        :is(.dark .blog-code-html) .shiki,
        :is(.dark .blog-code-html) .shiki span {
          color: var(--shiki-dark) !important;
        }
        .blog-math-inline .katex {
          font-size: 1.02em;
        }
        .blog-math-block .katex-display {
          margin: 0;
        }
      `}</style>
      <PortableText
        value={visibleBody}
        components={createPortableTextComponents(
          copyLabel,
          copiedLabel,
          language,
          headingIds,
          resolveCtaHref,
        )}
      />
    </div>
  );
}
