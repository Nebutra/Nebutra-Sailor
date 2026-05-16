import { getImageUrl } from "@nebutra/sanity/image";
import { PortableText, type PortableTextComponents } from "@portabletext/react";
import Image from "next/image";
import type { PortableTextBlock } from "@/lib/blog";

const components: PortableTextComponents = {
  block: {
    normal: ({ children }) => <p className="mt-4 leading-7 text-[var(--neutral-11)]">{children}</p>,
    h2: ({ children }) => (
      <h2 className="mt-10 text-2xl font-semibold text-[var(--neutral-12)]">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-8 text-xl font-semibold text-[var(--neutral-12)]">{children}</h3>
    ),
    blockquote: ({ children }) => (
      <blockquote className="mt-6 rounded-lg bg-[var(--blue-3)] px-4 py-3 text-[var(--neutral-11)] italic shadow-[inset_2px_0_0_var(--blue-9)]">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="mt-4 list-disc space-y-2 pl-6 text-[var(--neutral-11)]">{children}</ul>
    ),
    number: ({ children }) => (
      <ol className="mt-4 list-decimal space-y-2 pl-6 text-[var(--neutral-11)]">{children}</ol>
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
          className="font-medium text-[var(--blue-9)] underline-offset-4 hover:underline"
          rel={isExternal ? "noopener noreferrer" : undefined}
          target={isExternal ? "_blank" : undefined}
        >
          {children}
        </a>
      );
    },
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

  return (
    <div className="max-w-none">
      <PortableText value={body} components={components} />
    </div>
  );
}
