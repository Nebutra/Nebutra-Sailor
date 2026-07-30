/**
 * Presentation primitives for the token pages.
 *
 * Kept deliberately small and semantic-token-only. Every colour on these pages
 * that is NOT a token being demonstrated comes from a semantic utility
 * (`bg-card`, `text-muted-foreground`, `border-border`); every shadow comes from
 * the ramp. A page about the design system that reaches for `bg-[#f8fafc]` or
 * `shadow-[0_2px_8px_rgba(0,0,0,.1)]` would be arguing against itself.
 */

import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-12 max-w-3xl">
      <p className="mb-3 font-mono text-muted-foreground text-xs uppercase tracking-widest">
        {eyebrow}
      </p>
      <h1 className="font-semibold text-3xl text-foreground tracking-tight sm:text-4xl">{title}</h1>
      {children ? (
        <div className="mt-5 space-y-4 text-[15px] text-muted-foreground leading-relaxed">
          {children}
        </div>
      ) : null}
    </header>
  );
}

export function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mb-16">
      <h2 className="mb-2 font-semibold text-foreground text-xl tracking-tight">{title}</h2>
      {note ? (
        <div className="mb-6 max-w-3xl space-y-3 text-[14px] text-muted-foreground leading-relaxed">
          {note}
        </div>
      ) : (
        <div className="mb-6" />
      )}
      {children}
    </section>
  );
}

/** A tonal panel. Separation by background shift and space, not by an outline. */
export function Panel({
  children,
  className = "",
  tone = "card",
}: {
  children: ReactNode;
  className?: string;
  tone?: "card" | "muted";
}) {
  const background = tone === "card" ? "bg-card" : "bg-muted/50";
  return (
    <div className={`rounded-panel ${background} p-5 shadow-ambient-sm ${className}`}>
      {children}
    </div>
  );
}

/** Monospace value display. */
export function Mono({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <code className={`font-mono text-[12.5px] text-foreground/90 tabular-nums ${className}`}>
      {children}
    </code>
  );
}

/** The CSS custom property a consumer writes. */
export function VarName({ name }: { name: string | null }) {
  if (name === null) {
    return (
      <span className="font-mono text-[12.5px] text-muted-foreground italic">
        not emitted as a variable
      </span>
    );
  }
  return <Mono>--{name}</Mono>;
}

type ChipTone = "neutral" | "pass" | "warn" | "fail" | "accent";

const CHIP_TONE: Record<ChipTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  accent: "bg-secondary text-secondary-foreground",
  pass: "bg-success/12 text-success-strong",
  warn: "bg-warning/14 text-warning-strong",
  fail: "bg-destructive/12 text-destructive-strong",
};

export function Chip({
  tone = "neutral",
  children,
  title,
}: {
  tone?: ChipTone;
  children: ReactNode;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-sm px-1.5 py-0.5 font-medium font-mono text-[11px] tabular-nums ${CHIP_TONE[tone]}`}
    >
      {children}
    </span>
  );
}

/** Table shell: no vertical rules, rows separated by a tonal wash. */
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-2 overflow-x-auto px-2">
      <table className="w-full min-w-[42rem] border-collapse text-left text-[13px]">
        {children}
      </table>
    </div>
  );
}

export function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={`pb-2 pl-3 font-medium text-[11px] text-muted-foreground uppercase tracking-wider ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className = "",
  colSpan,
}: {
  children: ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={`py-2.5 pl-3 align-middle ${className}`}>
      {children}
    </td>
  );
}

/** Zebra by tonal shift — the alternative to a border between every row. */
export function Tr({ children, index }: { children: ReactNode; index: number }) {
  return <tr className={index % 2 === 1 ? "bg-muted/35" : undefined}>{children}</tr>;
}

/**
 * Renders a subtree in a fixed colour mode by scoping the theme class, so both
 * modes appear on the page at once.
 *
 * `.dark` is the selector the token pipeline emits its dark block under (see
 * `style-dictionary.config.mjs`: light → `:root`, dark → `.dark`), and custom
 * properties inherit, so a nested `.dark` re-resolves every token below it. This
 * is why the token pages have no light/dark toggle: a toggle shows one mode and
 * asks you to remember the other, and the dark ramp is not a mirror of the light
 * one — the values are chosen independently. Side by side, a divergence is
 * visible instead of remembered.
 */
export function ModeFrame({
  mode,
  children,
  className = "",
}: {
  mode: "light" | "dark";
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`${mode === "dark" ? "dark" : ""} rounded-panel bg-background p-5 text-foreground shadow-ambient-sm ${className}`}
    >
      <p className="mb-4 font-mono text-[11px] text-muted-foreground uppercase tracking-widest">
        {mode}
        <span className="ml-2 normal-case tracking-normal">
          {mode === "dark" ? ".dark" : ":root"}
        </span>
      </p>
      {children}
    </div>
  );
}

/** Two `ModeFrame`s, light then dark, on one row at wide sizes. */
export function BothModes({ render }: { render: (mode: "light" | "dark") => ReactNode }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ModeFrame mode="light">{render("light")}</ModeFrame>
      <ModeFrame mode="dark">{render("dark")}</ModeFrame>
    </div>
  );
}

/** A short aside for a fact that would otherwise need a footnote. */
export function Note({ children }: { children: ReactNode }) {
  return (
    <p className="max-w-3xl rounded-lg bg-muted/60 px-4 py-3 text-[13px] text-muted-foreground leading-relaxed">
      {children}
    </p>
  );
}
