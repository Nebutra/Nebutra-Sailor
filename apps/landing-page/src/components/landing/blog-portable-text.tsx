import { getImageUrl } from "@nebutra/sanity/image";
import { PortableText, type PortableTextComponents } from "@portabletext/react";
import Image from "next/image";
import type { PortableTextBlock } from "@/lib/blog";

function hasVisibleText(block: PortableTextBlock): boolean {
  if (block._type !== "block") return true;
  return Boolean(block.children?.some((child) => child.text?.trim()));
}

const components: PortableTextComponents = {
  block: {
    normal: ({ children }) => (
      <p className="mt-5 text-[1.02rem] leading-8 text-[var(--neutral-11)]">{children}</p>
    ),
    h2: ({ children }) => (
      <h2 className="mt-12 border-t border-[var(--neutral-6)] pt-8 text-2xl font-semibold tracking-tight text-[var(--neutral-12)]">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-9 text-xl font-semibold tracking-tight text-[var(--neutral-12)]">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="mt-7 text-base font-semibold tracking-tight text-[var(--neutral-12)]">
        {children}
      </h4>
    ),
    blockquote: ({ children }) => (
      <blockquote className="relative mt-8 border-y border-[var(--neutral-6)] py-5 pl-12 text-lg leading-8 text-[var(--neutral-12)]">
        <span
          aria-hidden
          className="absolute left-0 top-4 font-serif text-6xl leading-none text-[var(--neutral-7)]"
        >
          &ldquo;
        </span>
        <span className="font-medium">{children}</span>
      </blockquote>
    ),
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
  },
  types: {
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

export function BlogPortableText({ body }: { body: PortableTextBlock[] | null | undefined }) {
  if (!body?.length) return null;
  const visibleBody = body.filter(hasVisibleText);
  if (!visibleBody.length) return null;

  return (
    <div className="max-w-none text-[var(--neutral-11)]">
      <PortableText value={visibleBody} components={components} />
    </div>
  );
}
