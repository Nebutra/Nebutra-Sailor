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
import { ArrowUpRight, Hash, InformationFillSmall, Sparkles } from "@nebutra/icons";
import { getImageUrl } from "@nebutra/sanity/image";
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
      <mark
        key={key}
        className="rounded-[var(--radius-sm)] bg-[var(--amber-3)] px-1 text-foreground"
      >
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

  return children;
}

function BlogTableCellSpan({
  block,
  index,
  span,
}: {
  block: PortableTextBlock;
  index: number;
  span: PortableTextSpan;
}) {
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

  return (
    <div className="my-8 overflow-x-auto rounded-[var(--radius-lg)] border border-border bg-background shadow-sm">
      <table className="w-full min-w-[680px] border-collapse text-left text-sm text-muted-foreground">
        <thead className="bg-muted text-foreground">
          <tr>
            {header.cells.map((cell, index) => (
              <th
                key={`${value._key ?? "table"}-head-${index}`}
                className="border-b border-border px-4 py-3 font-semibold"
                scope="col"
              >
                <BlogTableCellContent cell={cell} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((row) => (
            <tr key={row.key} className="border-b border-border last:border-b-0">
              {row.cells.map((cell, cellIndex) => (
                <td key={`${row.key}-cell-${cellIndex}`} className="px-4 py-3 align-top leading-6">
                  <BlogTableCellContent cell={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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
    <figure className="blog-math-block my-8 overflow-x-auto rounded-[var(--radius-lg)] border border-border bg-background px-4 py-5 shadow-sm">
      <div dangerouslySetInnerHTML={{ __html: renderMath(math, true) }} />
    </figure>
  );
}

function BlogCalloutBlock({ value }: { value: PortableTextBlock }) {
  const tone =
    value.tone === "warning" || value.tone === "success" || value.tone === "insight"
      ? value.tone
      : "note";
  const toneClass = {
    insight: "border-[var(--blue-7)] bg-[var(--blue-2)] text-[var(--blue-12)]",
    note: "border-border bg-muted text-foreground",
    success: "border-[var(--green-7)] bg-[var(--green-2)] text-[var(--green-12)]",
    warning: "border-[var(--amber-7)] bg-[var(--amber-2)] text-[var(--amber-12)]",
  }[tone];
  const label = value.title ?? (tone === "insight" ? "Field note" : tone);

  return (
    <aside
      className={`lg:-mx-8 my-10 overflow-hidden rounded-[var(--radius-lg)] border shadow-sm ${toneClass}`}
    >
      <div className="flex gap-4 px-5 py-5 sm:px-6">
        <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full border border-current/20 bg-white/60 dark:bg-black/20">
          {tone === "insight" ? (
            <Sparkles className="size-4" aria-hidden />
          ) : (
            <InformationFillSmall className="size-4" aria-hidden />
          )}
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-current/70">
            {label}
          </div>
          {value.body && (
            <p className="mt-2 text-lg font-medium leading-8 text-foreground">{value.body}</p>
          )}
        </div>
      </div>
    </aside>
  );
}

function BlogQuoteBlock({ value }: { value: PortableTextBlock }) {
  if (!value.quote?.trim()) return null;
  const attribution = value.sourceHref ? (
    <a
      href={value.sourceHref}
      className="underline decoration-[hsl(var(--border))] underline-offset-4"
      rel="noopener noreferrer"
      target="_blank"
    >
      {value.attribution}
    </a>
  ) : (
    value.attribution
  );

  return (
    <figure className="lg:-mx-10 my-10 rounded-[var(--radius-lg)] border border-border bg-background px-6 py-6 shadow-sm">
      <div className="flex gap-4">
        <div
          className="mt-1 font-serif text-5xl leading-none text-[var(--blue-8)]"
          aria-hidden="true"
        >
          "
        </div>
        <div>
          <blockquote className="text-xl font-semibold leading-10 text-foreground">
            {value.quote}
          </blockquote>
          {value.attribution && (
            <figcaption className="mt-4 text-sm font-medium text-muted-foreground">
              {attribution}
            </figcaption>
          )}
        </div>
      </div>
    </figure>
  );
}

function BlogStatGrid({ value }: { value: PortableTextBlock }) {
  const items = Array.isArray(value.items) ? value.items : [];
  if (!items.length) return null;

  return (
    <section className="my-9 rounded-[var(--radius-lg)] border border-border bg-background p-5">
      {value.title && (
        <h3 className="mb-4 text-base font-semibold text-foreground">{value.title}</h3>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item, index) => (
          <div
            key={item._key ?? `${value._key ?? "stat"}-${index}`}
            className="rounded-[var(--radius-md)] border border-border bg-muted p-4"
          >
            <div className="font-mono text-2xl font-semibold text-foreground">{item.value}</div>
            <div className="mt-2 text-sm font-medium text-foreground">{item.label}</div>
            {item.caption && (
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.caption}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function BlogComparisonTable({ value }: { value: PortableTextBlock }) {
  const columns = value.columns?.filter(Boolean) ?? [];
  const rows = value.rows?.filter((row) => row.label || row.cells?.some(Boolean)) ?? [];
  if (columns.length < 2 || !rows.length) return null;

  return (
    <section className="my-9">
      {value.title && (
        <h3 className="mb-4 text-base font-semibold text-foreground">{value.title}</h3>
      )}
      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-border bg-background">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="bg-muted text-foreground">
            <tr>
              <th className="border-b border-border px-4 py-3">Dimension</th>
              {columns.map((column) => (
                <th key={column} className="border-b border-border px-4 py-3">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={row._key ?? `${value._key ?? "comparison"}-${rowIndex}`}
                className="border-b border-border last:border-b-0"
              >
                <th className="px-4 py-3 align-top font-semibold text-foreground" scope="row">
                  {row.label}
                </th>
                {columns.map((column, cellIndex) => (
                  <td key={`${column}-${cellIndex}`} className="px-4 py-3 align-top leading-6">
                    {row.cells?.[cellIndex]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BlogSourceCard({ value }: { value: PortableTextBlock }) {
  if (!value.title || !value.url) return null;

  return (
    <aside className="my-7 rounded-[var(--radius-md)] border border-border bg-background p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Source
      </div>
      <a
        href={value.url}
        className="mt-2 block text-base font-semibold text-foreground underline decoration-[hsl(var(--border))] underline-offset-4"
        rel="noopener noreferrer"
        target="_blank"
      >
        {value.title}
      </a>
      {(value.publisher || value.author || value.accessedAt) && (
        <div className="mt-2 text-sm text-muted-foreground">
          {[value.publisher, value.author, value.accessedAt].filter(Boolean).join(" · ")}
        </div>
      )}
      {value.summary && (
        <p className="mt-3 text-sm leading-7 text-muted-foreground">{value.summary}</p>
      )}
    </aside>
  );
}

function BlogSourceCardGroup({
  language,
  value,
}: {
  language: BlogLanguage;
  value: SourceCardGroupBlock;
}) {
  const sources = value.sources.filter((source) => source.title && source.url);
  if (!sources.length) return null;

  return (
    <section className="lg:-mx-16 my-9" data-blog-source-grid>
      <div className="mb-4 flex items-end justify-between gap-4 border-b border-border pb-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {isZhUiLocale(language) ? "资料索引" : "Source index"}
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {isZhUiLocale(language)
              ? `${sources.length} 个来源支撑这篇 Frontier 笔记。`
              : `${sources.length} sources behind this Frontier note.`}
          </p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {sources.map((source, index) => (
          <a
            key={source._key ?? `${value._key ?? "source-group"}-${index}`}
            href={source.url ?? "#"}
            className="group flex min-h-32 flex-col rounded-[var(--radius-md)] border border-border bg-background p-4 transition-colors hover:border-[var(--blue-7)] hover:bg-muted"
            rel="noopener noreferrer"
            target="_blank"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {source.publisher ?? (isZhUiLocale(language) ? "来源" : "Source")}
              </div>
              <ArrowUpRight
                className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-[hsl(var(--primary))]"
                aria-hidden
              />
            </div>
            <h3 className="mt-3 text-base font-semibold leading-6 text-foreground">
              {source.title}
            </h3>
            {source.summary && (
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                {source.summary}
              </p>
            )}
          </a>
        ))}
      </div>
    </section>
  );
}

function BlogImageFigure({ image }: { image: PortableTextImage }) {
  const imageUrl = getImageUrl(image as Parameters<typeof getImageUrl>[0], {
    width: 1200,
    format: "webp",
  });
  const alt = image.alt ?? "";

  return (
    <figure>
      <div className="relative aspect-[16/9] overflow-hidden rounded-[var(--radius-lg)] bg-muted">
        <Image src={imageUrl} alt={alt} fill className="object-cover" sizes="720px" />
      </div>
      {image.caption && (
        <figcaption className="mt-2 text-center text-sm text-muted-foreground">
          {image.caption}
        </figcaption>
      )}
    </figure>
  );
}

function BlogImageSet({ value }: { value: PortableTextBlock }) {
  const images = value.images?.filter((image) => image.asset?._ref) ?? [];
  if (!images.length) return null;

  return (
    <section className="my-9">
      {value.title && (
        <h3 className="mb-4 text-base font-semibold text-foreground">{value.title}</h3>
      )}
      <div className={images.length === 1 ? "" : "grid gap-4 md:grid-cols-2"}>
        {images.map((image, index) => (
          <BlogImageFigure
            key={image._key ?? `${value._key ?? "image-set"}-${index}`}
            image={image}
          />
        ))}
      </div>
    </section>
  );
}

function BlogEmbedBlock({ value }: { value: PortableTextBlock }) {
  if (!value.url || !value.title) return null;

  return (
    <aside className="my-8 rounded-[var(--radius-lg)] border border-border bg-background p-5">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {value.provider ?? "Embed"}
      </div>
      <a
        href={value.url}
        className="mt-2 block text-lg font-semibold text-foreground underline decoration-[hsl(var(--border))] underline-offset-4"
        rel="noopener noreferrer"
        target="_blank"
      >
        {value.title}
      </a>
      {value.caption && (
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{value.caption}</p>
      )}
    </aside>
  );
}

function BlogDiagramBlock({ value }: { value: PortableTextBlock }) {
  if (value.diagramType === "mermaid" && value.mermaidCode) {
    return (
      <figure className="my-9">
        {value.title && (
          <figcaption className="mb-3 text-sm font-semibold text-foreground">
            {value.title}
          </figcaption>
        )}
        <BlogMermaidDiagram chart={value.mermaidCode} />
        {value.caption && (
          <p className="mt-2 text-center text-sm text-muted-foreground">{value.caption}</p>
        )}
      </figure>
    );
  }

  const image = (value as PortableTextBlock & { image?: PortableTextImage }).image;
  if (value.diagramType === "image" && image?.asset?._ref) {
    return (
      <section className="my-9">
        {value.title && (
          <h3 className="mb-4 text-base font-semibold text-foreground">{value.title}</h3>
        )}
        <BlogImageFigure image={{ ...image, caption: image.caption ?? value.caption }} />
      </section>
    );
  }

  return (
    <aside className="my-8 rounded-[var(--radius-lg)] border border-dashed border-border bg-background p-5 text-sm text-muted-foreground">
      {value.title || "Diagram"} is recorded as a structured diagram block and needs a supported
      renderer.
    </aside>
  );
}

function BlogComponentBlock({ value }: { value: PortableTextBlock }) {
  if (value.componentKey === "articleDivider") {
    return (
      <div className="my-14 flex items-center gap-4" aria-hidden>
        <div className="h-px flex-1 bg-[hsl(var(--border))]" />
        <div className="size-2 rounded-full bg-[var(--blue-8)]" />
        <div className="h-px flex-1 bg-[hsl(var(--border))]" />
      </div>
    );
  }

  const props = value.props?.filter((prop) => prop.name && prop.value) ?? [];

  return (
    <aside className="my-8 rounded-[var(--radius-lg)] border border-border bg-background p-5">
      <div className="text-sm font-semibold text-foreground">
        {value.componentKey ?? "Component"}
      </div>
      {props.length > 0 && (
        <dl className="mt-3 space-y-2 text-sm text-muted-foreground">
          {props.map((prop, index) => (
            <div key={prop._key ?? `${value._key ?? "component"}-${index}`}>
              <dt className="font-mono text-xs uppercase tracking-[0.12em]">{prop.name}</dt>
              <dd className="mt-1 text-muted-foreground">{prop.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </aside>
  );
}

function groupAdjacentSourceCards(blocks: PortableTextBlock[]): PortableTextBlock[] {
  const grouped: PortableTextBlock[] = [];
  let pendingSources: PortableTextBlock[] = [];

  const flushSources = () => {
    if (pendingSources.length === 0) return;
    if (pendingSources.length === 1) {
      grouped.push(pendingSources[0] as PortableTextBlock);
    } else {
      grouped.push({
        _key: `${pendingSources[0]?._key ?? "source"}-group`,
        _type: "sourceCardGroup",
        sources: pendingSources,
      } as SourceCardGroupBlock);
    }
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
  if (!Array.isArray(value.items)) return [];

  return value.items.map((item, index) => {
    const itemRecord = item as Record<string, unknown>;
    return {
      body: typeof itemRecord.body === "string" ? itemRecord.body : undefined,
      key:
        typeof itemRecord._key === "string" ? itemRecord._key : `${value._key ?? "cta"}-${index}`,
      title: typeof itemRecord.title === "string" ? itemRecord.title : undefined,
    };
  });
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
            <blockquote className="my-8 border-l border-border pl-5 text-lg font-semibold leading-9 text-foreground">
              {children}
            </blockquote>
          );
        }

        return (
          <blockquote className="group relative my-7 rounded-[var(--radius-lg)] border border-border bg-background px-5 py-4 text-base font-medium leading-8 text-foreground">
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
      highlight: ({ children }) => (
        <mark className="rounded-[var(--radius-sm)] bg-[var(--amber-3)] px-1 text-foreground">
          {children}
        </mark>
      ),
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
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-64 -translate-x-1/2 rounded-[var(--radius-md)] border border-border bg-background p-3 text-xs leading-5 text-muted-foreground shadow-lg group-hover/footnote:block">
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
      calloutBlock: ({ value }) => <BlogCalloutBlock value={value as PortableTextBlock} />,
      comparisonTable: ({ value }) => <BlogComparisonTable value={value as PortableTextBlock} />,
      componentBlock: ({ value }) => <BlogComponentBlock value={value as PortableTextBlock} />,
      diagramBlock: ({ value }) => <BlogDiagramBlock value={value as PortableTextBlock} />,
      embedBlock: ({ value }) => <BlogEmbedBlock value={value as PortableTextBlock} />,
      imageSet: ({ value }) => <BlogImageSet value={value as PortableTextBlock} />,
      mathBlock: ({ value }) => <BlogMathBlock value={value as PortableTextBlock} />,
      mermaid: ({ value }) => (
        <BlogMermaidDiagram chart={typeof value?.code === "string" ? value.code : ""} />
      ),
      quoteBlock: ({ value }) => <BlogQuoteBlock value={value as PortableTextBlock} />,
      sourceCard: ({ value }) => <BlogSourceCard value={value as PortableTextBlock} />,
      sourceCardGroup: ({ value }) => (
        <BlogSourceCardGroup language={language} value={value as SourceCardGroupBlock} />
      ),
      statGrid: ({ value }) => <BlogStatGrid value={value as PortableTextBlock} />,
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
        const imageUrl = getImageUrl(value as Parameters<typeof getImageUrl>[0], {
          width: 1200,
          format: "webp",
        });
        const alt = typeof value?.alt === "string" ? value.alt : "";
        const caption = typeof value?.caption === "string" ? value.caption : null;

        return (
          <figure className="mt-8">
            <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-muted">
              <Image src={imageUrl} alt={alt} fill className="object-cover" sizes="720px" />
            </div>
            {caption && (
              <figcaption className="mt-2 text-center text-sm text-muted-foreground">
                {caption}
              </figcaption>
            )}
          </figure>
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
    <div className="max-w-none text-muted-foreground">
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
          background: color-mix(in oklch, var(--green-3) 74%, transparent);
        }
        .blog-code-html .line[data-diff="remove"] {
          background: color-mix(in oklch, var(--red-3) 74%, transparent);
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
