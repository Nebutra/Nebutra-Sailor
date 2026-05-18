"use client";

import { Check, Copy } from "@nebutra/icons";
import { useEffect, useState } from "react";

type BlogCopyButtonProps = {
  value: string;
  label: string;
  copiedLabel: string;
  variant?: "label" | "icon";
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

export function BlogCopyButton({
  value,
  label,
  copiedLabel,
  variant = "label",
}: BlogCopyButtonProps) {
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

  const icon = copied ? (
    <Check className="size-3.5" aria-hidden />
  ) : (
    <Copy className="size-3.5" aria-hidden />
  );
  const text = copied ? copiedLabel : label;

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex size-8 items-center justify-center rounded-full border border-[var(--neutral-7)] bg-[var(--neutral-1)] text-[var(--neutral-10)] transition-colors hover:border-[var(--neutral-8)] hover:bg-[var(--neutral-2)] hover:text-[var(--neutral-12)]"
        aria-label={text}
        title={text}
      >
        {icon}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-1.5 text-sm font-medium text-[var(--neutral-12)] transition-colors hover:border-[var(--neutral-8)] hover:bg-[var(--neutral-2)]"
      aria-label={text}
    >
      {icon}
      <span>{text}</span>
    </button>
  );
}
