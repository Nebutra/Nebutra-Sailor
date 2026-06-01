import {
  getBlockText,
  hasTemplatePlaceholders,
  hasVisibleText,
  normalizePortableTextBlocks,
  type PortableTextBlock,
  TEMPLATE_PLACEHOLDER_MARK,
} from "@nebutra/blog";
import { Hash } from "@nebutra/icons";
import { getImageUrl } from "@nebutra/sanity/image";
import { PortableText, type PortableTextComponents } from "@portabletext/react";
import katex from "katex";
import Image from "next/image";
import type { ReactNode } from "react";
import { prepareBlogPortableTextBlocks } from "@/lib/blog-code-highlighting";
import { BlogCodeBlock } from "./blog-code-block";
import { BlogCopyButton } from "./blog-copy-button";
import { BlogCtaBlock, type BlogCtaBlockItem } from "./blog-cta-block";
import { BlogMermaidDiagram } from "./blog-mermaid-diagram";

function BlogTable({ value }: { value: PortableTextBlock }) {
  const rows = value.rows?.filter((row) => row.cells?.some((cell) => cell.trim())) ?? [];
  const [header, ...bodyRows] = rows;
  if (!header?.cells?.length) return null;

  return (
    <div className="my-8 overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--neutral-6)] bg-[var(--neutral-1)] shadow-sm">
      <table className="w-full min-w-[680px] border-collapse text-left text-sm text-[var(--neutral-11)]">
        <thead className="bg-[var(--neutral-2)] text-[var(--neutral-12)]">
          <tr>
            {header.cells.map((cell, index) => (
              <th
                key={`${value._key ?? "table"}-head-${index}`}
                className="border-b border-[var(--neutral-6)] px-4 py-3 font-semibold"
                scope="col"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((row, rowIndex) => (
            <tr
              key={row._key ?? `${value._key ?? "table"}-row-${rowIndex}`}
              className="border-b border-[var(--neutral-5)] last:border-b-0"
            >
              {(row.cells ?? []).map((cell, cellIndex) => (
                <td
                  key={`${row._key ?? rowIndex}-cell-${cellIndex}`}
                  className="px-4 py-3 align-top leading-6"
                >
                  {cell}
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
      className="ml-2 inline-flex translate-y-0.5 text-[var(--neutral-8)] opacity-0 transition-opacity hover:text-[var(--neutral-12)] group-hover:opacity-100 focus-visible:opacity-100"
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
    <figure className="blog-math-block my-8 overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--neutral-6)] bg-[var(--neutral-1)] px-4 py-5 shadow-sm">
      <div dangerouslySetInnerHTML={{ __html: renderMath(math, true) }} />
    </figure>
  );
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
  headingIds?: Record<string, string>,
): PortableTextComponents {
  return {
    block: {
      normal: ({ children }) => {
        return (
          <p className="mt-5 text-[1.03rem] leading-[1.95] text-[var(--neutral-11)]">{children}</p>
        );
      },
      h2: ({ children, value }) => {
        const id = getHeadingId(value, headingIds);
        return (
          <h2
            id={id}
            className="group mt-16 scroll-mt-28 text-2xl font-semibold text-[var(--neutral-12)]"
          >
            {children}
            <HeadingAnchor id={id} />
          </h2>
        );
      },
      h3: ({ children, value }) => {
        const id = getHeadingId(value, headingIds);
        return (
          <h3
            id={id}
            className="group mt-11 scroll-mt-28 text-xl font-semibold text-[var(--neutral-12)]"
          >
            {children}
            <HeadingAnchor id={id} />
          </h3>
        );
      },
      h4: ({ children, value }) => {
        const id = getHeadingId(value, headingIds);
        return (
          <h4
            id={id}
            className="group mt-8 scroll-mt-28 text-base font-semibold text-[var(--neutral-12)]"
          >
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
            <blockquote className="my-8 border-l border-[var(--neutral-7)] pl-5 text-lg font-semibold leading-9 text-[var(--neutral-12)]">
              {children}
            </blockquote>
          );
        }

        return (
          <blockquote className="group relative my-7 rounded-[var(--radius-lg)] border border-[var(--neutral-6)] bg-[var(--neutral-1)] px-5 py-4 text-base font-medium leading-8 text-[var(--neutral-12)]">
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
        <ul className="mt-5 list-disc space-y-2.5 pl-6 text-[var(--neutral-11)] marker:text-[var(--neutral-8)]">
          {children}
        </ul>
      ),
      number: ({ children }) => (
        <ol className="mt-5 list-decimal space-y-2.5 pl-6 text-[var(--neutral-11)] marker:text-[var(--neutral-9)]">
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

        return (
          <a
            href={href}
            className="font-medium text-[var(--neutral-12)] underline decoration-[var(--neutral-7)] underline-offset-4 transition-colors hover:decoration-[var(--blue-9)]"
            rel={isExternal ? "noopener noreferrer" : undefined}
            target={isExternal ? "_blank" : undefined}
          >
            {children}
          </a>
        );
      },
      code: ({ children }) => (
        <code className="rounded-[var(--radius-sm)] border border-[var(--neutral-7)] bg-[var(--neutral-2)] px-1.5 py-0.5 font-mono text-[0.9em] text-[var(--neutral-12)]">
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
              className="text-[var(--blue-11)] no-underline decoration-[var(--blue-7)] decoration-dotted hover:underline"
            >
              {children}
            </a>
            ]
          </sup>
        );
      },
      strong: ({ children }) => (
        <strong className="font-semibold text-[var(--neutral-12)]">{children}</strong>
      ),
      em: ({ children }) => <em className="italic text-[var(--neutral-12)]">{children}</em>,
      [TEMPLATE_PLACEHOLDER_MARK]: ({ children }) => (
        <span className="mx-0.5 inline-flex rounded-[var(--radius-sm)] border border-dashed border-[var(--neutral-7)] bg-[var(--neutral-2)] px-1.5 py-0.5 font-mono text-[0.88em] font-medium text-[var(--neutral-12)]">
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
            ctaHref={typeof block.ctaHref === "string" ? block.ctaHref : undefined}
            ctaLabel={typeof block.ctaLabel === "string" ? block.ctaLabel : undefined}
            items={getCtaItems(block)}
            title={typeof block.title === "string" ? block.title : undefined}
          />
        );
      },
      mathBlock: ({ value }) => <BlogMathBlock value={value as PortableTextBlock} />,
      mermaid: ({ value }) => (
        <BlogMermaidDiagram chart={typeof value?.code === "string" ? value.code : ""} />
      ),
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
            <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-[var(--neutral-3)]">
              <Image src={imageUrl} alt={alt} fill className="object-cover" sizes="720px" />
            </div>
            {caption && (
              <figcaption className="mt-2 text-center text-sm text-[var(--neutral-10)]">
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
}: {
  body: PortableTextBlock[] | null | undefined;
  copyLabel?: string;
  copiedLabel?: string;
  headingIds?: Record<string, string>;
}) {
  if (!body?.length) return null;
  const visibleBody = await prepareBlogPortableTextBlocks(
    normalizePortableTextBlocks(body).filter(hasVisibleText),
  );
  if (!visibleBody.length) return null;

  return (
    <div className="max-w-none text-[var(--neutral-11)]">
      <style>{`
        .blog-code-html .shiki {
          margin: 0;
          background: transparent !important;
          padding: 1rem 0;
          font-size: 0.875rem;
          line-height: 1.75;
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
          color: var(--neutral-9);
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
        components={createPortableTextComponents(copyLabel, copiedLabel, headingIds)}
      />
    </div>
  );
}
