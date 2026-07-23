"use client";

import { Check, Copy } from "@nebutra/icons";
import { CodeBlockLanguageIcon } from "@nebutra/ui/primitives";
import { useEffect, useState } from "react";

type BlogCodeBlockProps = {
  code: string;
  copiedLabel: string;
  copyLabel: string;
  filename?: string | null;
  html: string;
  language?: string | null;
};

async function copyCode(code: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(code);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = code;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function BlogCodeBlock({
  code,
  copiedLabel,
  copyLabel,
  filename,
  html,
  language,
}: BlogCodeBlockProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const label = copied ? copiedLabel : copyLabel;
  const Icon = copied ? Check : Copy;
  const shikiHtml = { __html: html };

  return (
    <figure className="my-8 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-background shadow-sm">
      <figcaption className="flex min-h-11 items-center justify-between gap-3 border-b border-border bg-muted px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <CodeBlockLanguageIcon className="size-4" language={language || filename || null} />
          <div className="min-w-0">
            <p className="truncate font-mono text-xs font-medium text-foreground">
              {filename || language || "code"}
            </p>
            {filename && language && (
              <p className="mt-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                {language}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            void copyCode(code).then(() => setCopied(true));
          }}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={label}
          title={label}
        >
          <Icon className="size-3.5" aria-hidden />
        </button>
      </figcaption>
      <div
        className="blog-code-html overflow-x-auto bg-background text-sm"
        dangerouslySetInnerHTML={shikiHtml}
      />
    </figure>
  );
}
