"use client";

import { Check, Copy } from "@nebutra/icons";
import type { ComponentType, HTMLAttributes, ReactNode } from "react";
import { isValidElement, useState } from "react";
import { cn } from "../utils/cn";

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
type IconInput = IconComponent | ReactNode;

export interface KineticFeatureCardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  icon?: IconInput;
  eyebrow?: ReactNode;
  title: ReactNode;
  description: ReactNode;
  children?: ReactNode;
}

export interface KineticCodePreviewProps extends HTMLAttributes<HTMLDivElement> {
  filename?: string;
  language?: string;
  lines: readonly string[];
}

export interface KineticConsoleFrameProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  status?: ReactNode;
  children: ReactNode;
}

export type KineticStepRailProps = HTMLAttributes<HTMLDivElement>;

export interface KineticMorphSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  activeKey?: string | number;
  children: ReactNode;
}

export interface KineticSignalMarqueeProps extends HTMLAttributes<HTMLDivElement> {
  eyebrow?: ReactNode;
  children: ReactNode;
}

export interface KineticCommandBoxProps extends HTMLAttributes<HTMLDivElement> {
  command: string;
  copyLabel: string;
  copiedLabel: string;
}

export interface KineticStepProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  icon?: IconComponent;
  index: number;
  title: ReactNode;
  description: ReactNode;
  phaseLabel?: string;
}

function lineTone(line: string) {
  const trimmed = line.trim();

  if (trimmed.startsWith("//") || trimmed.startsWith("--")) {
    return "text-muted-foreground/55 italic";
  }

  if (/\b(await|const|export|return|CREATE|ALTER|POLICY|USING|ENABLE|TABLE)\b/.test(trimmed)) {
    return "text-primary font-medium";
  }

  if (trimmed.includes(":")) {
    return "text-emerald-600 dark:text-emerald-400";
  }

  return "text-foreground/78";
}

function renderIcon(icon: IconInput | undefined) {
  if (!icon) {
    return null;
  }

  if (typeof icon === "function") {
    const Icon = icon;
    return <Icon aria-hidden className="size-7 text-primary" />;
  }

  if (isValidElement(icon)) {
    return (
      <span
        aria-hidden
        className="inline-grid place-items-center text-primary [&_svg]:size-7 [&_svg]:text-primary"
      >
        {icon}
      </span>
    );
  }

  return icon;
}

export function KineticFeatureCard({
  icon,
  eyebrow,
  title,
  description,
  children,
  className,
  ...props
}: KineticFeatureCardProps) {
  const renderedIcon = renderIcon(icon);

  return (
    <article
      className={cn(
        "group/kinetic relative flex h-full min-h-[540px] flex-col overflow-hidden rounded-[var(--radius-panel)] border border-border/65 bg-background/82 p-6 shadow-[inset_0_1px_0_rgb(255_255_255/0.45),0_24px_90px_-70px_var(--foreground)] backdrop-blur-2xl transition-[transform,border-color,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-1 hover:border-foreground/25 hover:bg-background/94 hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.55),0_34px_110px_-74px_var(--foreground)] focus-within:-translate-y-1 focus-within:border-foreground/25 sm:p-7",
        className,
      )}
      data-taste="nebutra-texture-cutout-card"
      {...props}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,var(--neutral-8)_1px,transparent_0)] bg-[length:18px_18px] opacity-[0.12]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/12 via-primary/5 to-transparent"
        style={{ maskImage: "linear-gradient(to bottom, black 45%, transparent 100%)" }}
      />
      <div className="absolute right-0 top-0 z-10 rounded-bl-[2rem] border-b border-l border-border/60 bg-muted/55 px-4 py-2 backdrop-blur-xl">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {eyebrow}
        </span>
      </div>

      <div className="relative z-10 flex h-full flex-col">
        <div className="mb-8 flex items-start justify-between gap-4 pr-16">
          {renderedIcon && (
            <div className="grid size-14 place-items-center rounded-[var(--radius-xl)] border border-border/65 bg-background/75 shadow-[inset_0_1px_0_rgb(255_255_255/0.55),0_16px_42px_-34px_var(--foreground)] transition-transform duration-500 group-hover/kinetic:-translate-y-1">
              {renderedIcon}
            </div>
          )}
        </div>

        <h3
          className="text-2xl font-semibold text-foreground text-balance"
          style={{ letterSpacing: "var(--tracking-heading)", lineHeight: "var(--leading-heading)" }}
        >
          {title}
        </h3>
        <p className="mt-4 text-base font-medium leading-7 text-muted-foreground text-balance">
          {description}
        </p>

        <div className="mt-auto pt-8">{children}</div>
      </div>
    </article>
  );
}

export function KineticCodePreview({
  filename = "artifact.ts",
  language = "ts",
  lines,
  className,
  ...props
}: KineticCodePreviewProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-xl)] border border-border/60 bg-muted/30 shadow-[0_18px_70px_-56px_var(--foreground)] transition-[transform,border-color,box-shadow] duration-500 group-hover/kinetic:-translate-y-2 group-hover/kinetic:border-foreground/20 group-hover/kinetic:shadow-[0_26px_90px_-62px_var(--foreground)]",
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-2 border-b border-border/60 bg-background/70 px-4 py-3 backdrop-blur-xl">
        <span className="size-2.5 rounded-full bg-border/90" aria-hidden />
        <span className="size-2.5 rounded-full bg-border/80" aria-hidden />
        <span className="size-2.5 rounded-full bg-border/70" aria-hidden />
        <span
          className="ml-3 min-w-0 truncate font-mono text-[11px] text-muted-foreground"
          translate="no"
        >
          {filename}
        </span>
        <span className="ml-auto rounded-full border border-border/60 bg-background/60 px-2 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
          {language}
        </span>
      </div>

      <pre className="relative max-h-[190px] overflow-hidden p-4 font-mono text-[12px] leading-5">
        {lines.map((line, index) => (
          <span key={`${line}-${index}`} className="flex min-w-0 gap-3">
            <span className="w-5 shrink-0 text-right text-muted-foreground/45 tabular-nums">
              {index + 1}
            </span>
            <code className={cn("min-w-0 truncate", lineTone(line))} translate="no">
              {line || " "}
            </code>
          </span>
        ))}
      </pre>
    </div>
  );
}

export function KineticConsoleFrame({
  title = "operator@nebutra-sailor: ~",
  status,
  children,
  className,
  ...props
}: KineticConsoleFrameProps) {
  return (
    <div
      className={cn(
        "group/kinetic relative flex h-full min-h-[460px] w-full flex-col overflow-hidden rounded-[2rem] border border-border/65 bg-background/84 shadow-[inset_0_1px_0_rgb(255_255_255/0.45),0_32px_120px_-88px_var(--foreground)] backdrop-blur-3xl transition-[transform,border-color,box-shadow] duration-500 hover:-translate-y-1 hover:border-foreground/25 hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.55),0_44px_140px_-90px_var(--foreground)]",
        className,
      )}
      data-taste="nebutra-terminal-animation"
      {...props}
    >
      <div className="flex h-14 flex-none items-center gap-4 border-b border-border/60 bg-background/70 px-5 backdrop-blur-xl">
        <div className="flex gap-2" aria-hidden>
          <span className="size-3 rounded-full border border-border/80 bg-muted shadow-sm transition-colors group-hover/kinetic:bg-red-400/80" />
          <span className="size-3 rounded-full border border-border/80 bg-muted shadow-sm transition-colors group-hover/kinetic:bg-amber-400/80" />
          <span className="size-3 rounded-full border border-border/80 bg-muted shadow-sm transition-colors group-hover/kinetic:bg-emerald-400/80" />
        </div>
        <div className="min-w-0 flex-1 text-center">
          <span className="inline-flex max-w-full items-center rounded-[var(--radius-md)] border border-border/50 bg-muted/35 px-4 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <span className="truncate" translate="no">
              {title}
            </span>
          </span>
        </div>
        <div className="hidden min-w-20 justify-end sm:flex">
          {status && (
            <span className="rounded-full border border-border/55 bg-background/65 px-2 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
              {status}
            </span>
          )}
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden bg-gradient-to-br from-background/55 via-background/25 to-muted/28 p-6 sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--neutral-6)_1px,transparent_1px),linear-gradient(to_bottom,var(--neutral-6)_1px,transparent_1px)] bg-[size:16px_24px] opacity-45"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background/80 to-transparent"
        />
        <div className="relative z-10 h-full w-full">{children}</div>
      </div>
    </div>
  );
}

export function KineticMorphSurface({
  activeKey,
  className,
  children,
  ...props
}: KineticMorphSurfaceProps) {
  return (
    <div
      className={cn(
        "group/kinetic relative overflow-hidden rounded-[var(--radius-panel)] border border-border/65 bg-background/80 p-3 shadow-[inset_0_1px_0_rgb(255_255_255/0.45),0_28px_110px_-82px_var(--foreground)] backdrop-blur-2xl transition-[border-color,box-shadow,background-color] duration-500 hover:border-foreground/20 hover:bg-background/92 hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.55),0_36px_130px_-88px_var(--foreground)] sm:p-4 lg:p-5",
        className,
      )}
      data-active-key={activeKey}
      data-taste="nebutra-morph-surface"
      {...props}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,var(--neutral-8)_1px,transparent_0)] bg-[length:20px_20px] opacity-[0.10]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-primary/12 via-primary/4 to-transparent"
        style={{ maskImage: "linear-gradient(to bottom, black 45%, transparent 100%)" }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function KineticSignalMarquee({
  eyebrow,
  className,
  children,
  ...props
}: KineticSignalMarqueeProps) {
  return (
    <div
      className={cn(
        "group/kinetic relative mx-auto overflow-hidden rounded-[var(--radius-panel)] border border-border/55 bg-background/72 px-3 py-8 shadow-[inset_0_1px_0_rgb(255_255_255/0.45),0_22px_90px_-76px_var(--foreground)] backdrop-blur-2xl sm:px-5",
        className,
      )}
      data-taste="nebutra-provider-grid"
      {...props}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--neutral-6)_1px,transparent_1px),linear-gradient(to_bottom,var(--neutral-6)_1px,transparent_1px)] bg-[size:32px_32px] opacity-25"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-background via-background/90 to-transparent z-20"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-background via-background/90 to-transparent z-20"
      />
      {eyebrow && (
        <div className="relative z-30 mb-6 text-center font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {eyebrow}
        </div>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function KineticCommandBox({
  command,
  copyLabel,
  copiedLabel,
  className,
  ...props
}: KineticCommandBoxProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "group/kinetic relative flex flex-col items-stretch overflow-hidden rounded-[var(--radius-xl)] border border-border/65 bg-background/82 p-1.5 shadow-[inset_0_1px_0_rgb(255_255_255/0.5),0_20px_70px_-58px_var(--foreground)] backdrop-blur-2xl transition-[transform,border-color,box-shadow,background-color] duration-500 hover:-translate-y-1 hover:border-foreground/25 hover:bg-background/92 hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.6),0_28px_90px_-62px_var(--foreground)] sm:flex-row sm:items-center",
        className,
      )}
      data-taste="nebutra-texture-command"
      {...props}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,var(--neutral-8)_1px,transparent_0)] bg-[length:16px_16px] opacity-[0.10]"
      />
      <code className="relative z-10 flex-1 overflow-x-auto whitespace-nowrap px-4 py-3.5 font-mono text-xs text-foreground sm:px-5 sm:text-sm md:text-base">
        <span className="text-muted-foreground">$</span> {command}
      </code>
      <button
        type="button"
        onClick={handleCopy}
        className="relative z-10 mt-2 flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-primary/20 bg-foreground px-5 py-2.5 text-sm font-medium text-background shadow-[inset_0_1px_0_rgb(255_255_255/0.2)] transition-[transform,opacity] hover:-translate-y-px hover:opacity-90 sm:mt-0"
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? copiedLabel : copyLabel}
      </button>
    </div>
  );
}

export function KineticStepRail({ className, children, ...props }: KineticStepRailProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-panel)] border border-border/65 bg-background/78 p-6 shadow-[inset_0_1px_0_rgb(255_255_255/0.45),0_24px_100px_-78px_var(--foreground)] backdrop-blur-2xl md:p-10",
        className,
      )}
      data-taste="nebutra-grid-beam"
      {...props}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--neutral-6)_1px,transparent_1px),linear-gradient(to_bottom,var(--neutral-6)_1px,transparent_1px)] bg-[size:36px_36px] opacity-30"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-8 right-8 top-[5.7rem] hidden h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent md:block"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-8 bottom-8 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-primary/35 to-transparent md:hidden"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function KineticStep({
  icon: Icon,
  index,
  title,
  description,
  phaseLabel,
  className,
  ...props
}: KineticStepProps) {
  const formatted = String(index).padStart(2, "0");

  return (
    <article
      className={cn(
        "group/kinetic relative flex h-full flex-col items-center rounded-[var(--radius-xl)] border border-border/60 bg-background/82 p-5 text-center shadow-[0_18px_70px_-58px_var(--foreground)] backdrop-blur-xl transition-[transform,border-color,box-shadow] duration-500 hover:-translate-y-1 hover:border-foreground/25 hover:shadow-[0_28px_90px_-62px_var(--foreground)]",
        className,
      )}
      {...props}
    >
      <div className="relative mb-6 grid size-16 place-items-center rounded-[var(--radius-xl)] border border-border/65 bg-background shadow-[inset_0_1px_0_rgb(255_255_255/0.55),0_18px_56px_-42px_var(--foreground)]">
        <span
          className="absolute -right-2 -top-2 rounded-full border border-border/60 bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
          aria-hidden
        >
          {formatted}
        </span>
        {Icon && (
          <Icon
            aria-hidden
            className="size-7 text-primary transition-colors group-hover/kinetic:text-foreground"
          />
        )}
      </div>
      <span className="mb-4 rounded-full border border-primary/20 bg-primary/7 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
        {phaseLabel ?? `Phase ${formatted}`}
      </span>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted-foreground text-balance">{description}</p>
    </article>
  );
}
