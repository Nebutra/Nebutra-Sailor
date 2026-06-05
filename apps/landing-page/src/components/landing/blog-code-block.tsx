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
    <figure className="my-8 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--neutral-7)] bg-[var(--neutral-1)] shadow-sm">
      <figcaption className="flex min-h-11 items-center justify-between gap-3 border-b border-[var(--neutral-6)] bg-[var(--neutral-2)] px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <CodeBlockLanguageIcon className="size-4" language={language || filename || null} />
          <div className="min-w-0">
            <p className="truncate font-mono text-xs font-medium text-[var(--neutral-12)]">
              {filename || language || "code"}
            </p>
            {filename && language && (
              <p className="mt-0.5 font-mono text-[10px] uppercase text-[var(--neutral-10)]">
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
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-[var(--neutral-7)] bg-[var(--neutral-1)] text-[var(--neutral-10)] transition-colors hover:bg-[var(--neutral-3)] hover:text-[var(--neutral-12)]"
          aria-label={label}
          title={label}
        >
          <Icon className="size-3.5" aria-hidden />
        </button>
      </figcaption>
      <div
        className="blog-code-html overflow-x-auto bg-[var(--neutral-1)] text-sm"
        dangerouslySetInnerHTML={shikiHtml}
      />
    </figure>
  );
}
