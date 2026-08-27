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
        className="inline-flex size-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      aria-label={text}
    >
      {icon}
      <span>{text}</span>
    </button>
  );
}
