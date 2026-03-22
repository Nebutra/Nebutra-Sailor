"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface CommandInstallBoxProps {
  command: string;
  copyLabel: string;
  copiedLabel: string;
  className?: string;
}

export function CommandInstallBox({
  command,
  copyLabel,
  copiedLabel,
  className,
}: CommandInstallBoxProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col sm:flex-row items-stretch sm:items-center rounded-[var(--radius-xl)] border border-[color:var(--neutral-7)] bg-[color:var(--neutral-2)] p-1.5 transition-all hover:border-[color:var(--blue-7)] dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20",
        className,
      )}
    >
      <code className="flex-1 overflow-x-auto whitespace-nowrap px-5 py-3.5 font-mono text-sm text-[color:var(--neutral-12)] md:text-base dark:text-white">
        <span className="text-[color:var(--neutral-9)] dark:text-white/50">$</span> {command}
      </code>
      <button
        type="button"
        onClick={handleCopy}
        className="mt-2 sm:mt-0 flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-[color:var(--blue-9)] px-5 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? copiedLabel : copyLabel}
      </button>
    </div>
  );
}

CommandInstallBox.displayName = "CommandInstallBox";
