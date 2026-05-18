"use client";

import { Check, Copy } from "@nebutra/icons";
import { useEffect, useState } from "react";

type BlogTemplateCopyButtonProps = {
  value: string;
  label: string;
  copiedLabel: string;
};

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function BlogTemplateCopyButton({ value, label, copiedLabel }: BlogTemplateCopyButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const handleCopy = async () => {
    await copyText(value);
    setCopied(true);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-2.5 py-1 text-xs font-medium text-[var(--neutral-11)] transition-colors hover:border-[var(--neutral-8)] hover:bg-[var(--neutral-2)] hover:text-[var(--neutral-12)] sm:absolute sm:right-3 sm:top-3 sm:mt-0"
      aria-label={copied ? copiedLabel : label}
    >
      {copied ? (
        <Check className="size-3.5" aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
      <span>{copied ? copiedLabel : label}</span>
    </button>
  );
}
