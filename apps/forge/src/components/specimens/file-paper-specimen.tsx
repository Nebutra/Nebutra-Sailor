"use client";

import type { ReactNode } from "react";
import { filePaperStats } from "./specimen-utils";

export type FilePaperSpecimenProps = {
  filename: string;
  content: string;
  linesLabel?: string;
  charsLabel?: string;
  kindLabel?: string;
  emptyLabel?: string;
  headerExtra?: ReactNode;
  footer?: ReactNode;
  className?: string;
  maxHeightClassName?: string;
};

function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function FilePaperSpecimen({
  filename,
  content,
  linesLabel,
  charsLabel,
  kindLabel,
  emptyLabel = "—",
  headerExtra,
  footer,
  className,
  maxHeightClassName = "max-h-[28rem]",
}: FilePaperSpecimenProps) {
  const stats = filePaperStats(content);
  const body = content.length > 0 ? content : emptyLabel;
  return (
    <figure
      className={cx(
        "m-0 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--neutral-2)] ring-1 ring-inset ring-[var(--neutral-6)]",
        className,
      )}
      data-specimen="file-paper"
      aria-label={filename}
    >
      <figcaption className="flex flex-wrap items-center gap-2 border-b border-[var(--neutral-4)] bg-[var(--neutral-3)] px-3 py-2">
        <span
          className="h-2 w-2 shrink-0 rounded-full bg-[color-mix(in_srgb,hsl(var(--primary))_55%,var(--neutral-7))]"
          aria-hidden
        />
        <span className="font-mono text-xs font-semibold text-[var(--neutral-12)]">{filename}</span>
        {kindLabel ? (
          <span className="rounded-full bg-[var(--neutral-2)] px-2 py-0.5 text-[0.65rem] text-[var(--neutral-10)]">
            {kindLabel}
          </span>
        ) : null}
        <span className="ml-auto flex flex-wrap items-center gap-2 text-[0.65rem] text-[var(--neutral-10)]">
          {linesLabel ?? (stats.lines > 0 ? `${stats.lines} lines` : null)}
          {charsLabel ? <span aria-hidden>·</span> : null}
          {charsLabel}
          {headerExtra}
        </span>
      </figcaption>
      <pre
        className={cx(
          "m-0 overflow-auto p-3 font-mono text-[0.75rem] leading-relaxed text-[var(--neutral-12)] sm:text-sm",
          maxHeightClassName,
          content.length === 0 && "text-[var(--neutral-10)]",
        )}
      >
        {body}
      </pre>
      {footer ? (
        <div className="border-t border-[var(--neutral-4)] px-3 py-2 text-xs text-[var(--neutral-10)]">
          {footer}
        </div>
      ) : null}
    </figure>
  );
}
