"use client";

/**
 * Lightweight code block for docs previews (OpenNext / Cloudflare friendly).
 *
 * Avoids fumadocs-ui DynamicCodeBlock and any `shiki` import. The full Shiki
 * package re-exports ~250 languages (~8 MiB) which blows the Workers size
 * limit when pulled through streamdown / fumadocs-core highlight. MDX page
 * fences are already highlighted at build time via rehype; this component is
 * only used for client-side ComponentPreview / markdown widgets.
 */
type Props = {
  lang: string;
  code: string;
  className?: string;
};

export function DynamicCodeBlock({ lang, code, className }: Props) {
  return (
    <pre
      data-language={lang || "text"}
      className={
        className ??
        "overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm leading-relaxed text-zinc-100"
      }
    >
      <code className={lang ? `language-${lang}` : undefined}>{code}</code>
    </pre>
  );
}
