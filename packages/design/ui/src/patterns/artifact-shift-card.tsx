import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../utils/cn";

export interface ArtifactShiftCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  contentClassName?: string;
}

export interface ArtifactShiftCardPreviewProps extends HTMLAttributes<HTMLElement> {
  filename: string;
  language: string;
  code: string;
  label: string;
  maxLines?: number;
  signals?: readonly string[];
}

export type ArtifactShiftCardFooterProps = HTMLAttributes<HTMLElement>;

export function ArtifactShiftCard({
  className,
  contentClassName,
  children,
  ...props
}: ArtifactShiftCardProps) {
  return (
    <div
      className={cn(
        "group/card relative flex h-full min-h-[560px] flex-col overflow-hidden rounded-[var(--radius-panel)] border bg-background/90 transition-[transform,border-color,box-shadow] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-1 hover:border-foreground/25 hover:shadow-[0_28px_90px_-64px_var(--foreground)] focus-within:-translate-y-1 focus-within:border-foreground/25",
        className,
      )}
      data-taste="nebutra-shift-card"
      {...props}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,var(--neutral-8)_1px,transparent_0)] bg-[length:22px_22px] opacity-[0.09]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent opacity-80"
      />

      <div className={cn("relative flex h-full flex-col p-4 sm:p-5", contentClassName)}>
        {children}
      </div>
    </div>
  );
}

export function ArtifactShiftCardPreview({
  filename,
  language,
  code,
  label,
  maxLines = 8,
  signals = ["typed", "scoped", "ready"],
  className,
  ...props
}: ArtifactShiftCardPreviewProps) {
  const lines = code.split("\n").slice(0, maxLines);

  return (
    <section
      aria-label={label}
      className={cn(
        "relative min-h-[260px] overflow-hidden rounded-[var(--radius-xl)] border border-border/60 bg-background/80 p-3 shadow-[0_18px_60px_-46px_var(--foreground)] transition-[transform,border-color,box-shadow] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover/card:-translate-y-1 group-hover/card:border-foreground/20 group-hover/card:shadow-[0_24px_80px_-52px_var(--foreground)] group-focus-within/card:-translate-y-1 group-focus-within/card:border-foreground/20 sm:p-4",
        className,
      )}
      {...props}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,var(--neutral-7)_1px,transparent_0)] bg-[length:18px_18px] opacity-[0.16]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/10 to-transparent opacity-80"
      />

      <div className="relative flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border/60 bg-background/85 px-3 py-2">
        <span className="min-w-0 truncate font-mono text-[11px] text-foreground/80" translate="no">
          {filename}
        </span>
        <span
          className="rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 font-mono text-[10px] text-muted-foreground uppercase"
          translate="no"
        >
          {language}
        </span>
      </div>

      <div className="relative mt-3 space-y-1.5 rounded-[var(--radius-lg)] border border-border/50 bg-muted/25 p-3 font-mono text-[11px] leading-5">
        {lines.map((line, index) => (
          <div key={`${line}-${index}`} className="flex min-w-0 gap-3">
            <span className="w-5 shrink-0 text-right text-muted-foreground/55 tabular-nums">
              {index + 1}
            </span>
            <code className="min-w-0 truncate text-foreground/75" translate="no">
              {line || " "}
            </code>
          </div>
        ))}
      </div>

      <div className="relative mt-3 grid grid-cols-3 gap-2">
        {signals.map((signal) => (
          <span
            key={signal}
            className="rounded-[var(--radius-md)] border border-border/55 bg-background/75 px-2 py-1.5 text-center font-mono text-[10px] text-muted-foreground uppercase tracking-[0.14em]"
          >
            {signal}
          </span>
        ))}
      </div>
    </section>
  );
}

export function ArtifactShiftCardFooter({ className, ...props }: ArtifactShiftCardFooterProps) {
  return (
    <footer
      className={cn(
        "relative mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-xl)] border border-border/60 bg-background/85 px-4 py-3 shadow-[0_14px_48px_-42px_var(--foreground)] backdrop-blur-xl transition-[transform,border-color,box-shadow] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover/card:-translate-y-2 group-hover/card:border-foreground/20 group-hover/card:shadow-[0_22px_70px_-50px_var(--foreground)] group-focus-within/card:-translate-y-2 group-focus-within/card:border-foreground/20",
        className,
      )}
      {...props}
    />
  );
}
