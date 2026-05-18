import { getImageUrl } from "@nebutra/sanity/image";
import { PortableText, type PortableTextComponents } from "@portabletext/react";
import Image from "next/image";
import { codeToHtml } from "shiki";
import type { PortableTextBlock, PortableTextSpan } from "@/lib/blog";
import { BlogCopyButton } from "./blog-copy-button";

const TEMPLATE_PLACEHOLDER_MARK = "templatePlaceholder";
const TEMPLATE_PLACEHOLDER_PATTERN = /\[[^[\]\n]{1,120}\]/g;
const LANGUAGE_ALIASES: Record<string, string> = {
  js: "javascript",
  jsx: "jsx",
  md: "markdown",
  shell: "bash",
  sh: "bash",
  ts: "typescript",
  tsx: "tsx",
  txt: "text",
};

function hasTemplatePlaceholders(text: string): boolean {
  return /\[[^[\]\n]{1,120}\]/.test(text);
}

function getBlockText(block: PortableTextBlock | undefined): string {
  return block?.children?.map((child) => child.text ?? "").join("") ?? "";
}

function hasVisibleText(block: PortableTextBlock): boolean {
  if (block._type !== "block") return true;
  return Boolean(block.children?.some((child) => child.text?.trim()));
}

function splitSpanTemplatePlaceholders(span: PortableTextSpan): PortableTextSpan[] {
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

function decorateTemplatePlaceholders(block: PortableTextBlock): PortableTextBlock {
  if (block._type !== "block" || block.style !== "blockquote" || !block.children?.length) {
    return block;
  }
  return { ...block, children: block.children.flatMap(splitSpanTemplatePlaceholders) };
}

function normalizeCodeLanguage(language: string | null | undefined): string {
  const normalized = language?.trim().toLowerCase() || "text";
  return LANGUAGE_ALIASES[normalized] ?? normalized;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function renderCodeHtml(block: PortableTextBlock): Promise<string> {
  const code = block.code ?? "";
  if (!code) return "";

  try {
    return await codeToHtml(code, {
      lang: normalizeCodeLanguage(block.language),
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      defaultColor: false,
    });
  } catch {
    return `<pre class="shiki"><code>${escapeHtml(code)}</code></pre>`;
  }
}

async function decorateBody(body: PortableTextBlock[]): Promise<PortableTextBlock[]> {
  return Promise.all(
    body.filter(hasVisibleText).map(async (block) => {
      if (block._type === "code") {
        return { ...block, html: await renderCodeHtml(block) };
      }
      return decorateTemplatePlaceholders(block);
    }),
  );
}

function getHeadingId(
  value: unknown,
  headingIdByKey: Record<string, string> | undefined,
): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const key = (value as { _key?: unknown })._key;
  if (typeof key !== "string") return undefined;
  return key ? headingIdByKey?.[key] : undefined;
}

function createPortableTextComponents(
  copyLabel: string,
  copiedLabel: string,
  headingIdByKey?: Record<string, string>,
): PortableTextComponents {
  return {
    block: {
      normal: ({ children }) => (
        <p className="mt-5 text-[1.02rem] leading-8 text-[var(--neutral-11)]">{children}</p>
      ),
      h2: ({ children, value }) => (
        <h2
          id={getHeadingId(value, headingIdByKey)}
          className="mt-14 scroll-mt-28 text-2xl font-semibold tracking-tight text-[var(--neutral-12)]"
        >
          {children}
        </h2>
      ),
      h3: ({ children, value }) => (
        <h3
          id={getHeadingId(value, headingIdByKey)}
          className="mt-9 scroll-mt-28 text-xl font-semibold tracking-tight text-[var(--neutral-12)]"
        >
          {children}
        </h3>
      ),
      h4: ({ children, value }) => (
        <h4
          id={getHeadingId(value, headingIdByKey)}
          className="mt-7 scroll-mt-28 text-base font-semibold tracking-tight text-[var(--neutral-12)]"
        >
          {children}
        </h4>
      ),
      blockquote: ({ children, value }) => {
        const text = getBlockText(value as PortableTextBlock);
        const isTemplate = hasTemplatePlaceholders(text);

        if (!isTemplate) {
          return (
            <blockquote className="my-7 text-lg font-semibold leading-8 tracking-tight text-[var(--neutral-12)]">
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
        <ul className="mt-5 list-disc space-y-2 pl-6 text-[var(--neutral-11)] marker:text-[var(--neutral-8)]">
          {children}
        </ul>
      ),
      number: ({ children }) => (
        <ol className="mt-5 list-decimal space-y-2 pl-6 text-[var(--neutral-11)] marker:text-[var(--neutral-9)]">
          {children}
        </ol>
      ),
    },
    listItem: {
      bullet: ({ children }) => <li className="leading-7">{children}</li>,
      number: ({ children }) => <li className="leading-7">{children}</li>,
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
      code: ({ value }) => {
        const block = value as PortableTextBlock & { html?: string };
        const code = block.code ?? "";
        const language = block.language?.trim() || "text";
        const filename = block.filename?.trim();

        if (!code) return null;

        return (
          <figure className="blog-code my-8 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--neutral-6)] bg-[var(--neutral-1)]">
            <figcaption className="flex min-h-10 items-center justify-between gap-3 border-b border-[var(--neutral-6)] px-4 py-2 font-mono text-xs text-[var(--neutral-10)]">
              <span className="truncate">{filename || language}</span>
              <BlogCopyButton
                value={code}
                label={copyLabel}
                copiedLabel={copiedLabel}
                variant="icon"
              />
            </figcaption>
            <div
              className="overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: block.html ?? "" }}
            />
          </figure>
        );
      },
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
  headingIdByKey,
}: {
  body: PortableTextBlock[] | null | undefined;
  copyLabel?: string;
  copiedLabel?: string;
  headingIdByKey?: Record<string, string>;
}) {
  if (!body?.length) return null;
  const visibleBody = await decorateBody(body);
  if (!visibleBody.length) return null;

  return (
    <div className="blog-prose max-w-none text-[var(--neutral-11)]">
      <PortableText
        value={visibleBody}
        components={createPortableTextComponents(copyLabel, copiedLabel, headingIdByKey)}
      />
    </div>
  );
}
