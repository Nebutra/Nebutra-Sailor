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

/**
 * Full-bleed band inside the article column: cancels the column's side padding
 * so a section's hairline runs from the rail to the edge of the frame, as every
 * Geist page section does, then puts the same padding back inside.
 */
export const BAND = "-mx-4 px-4 md:-mx-8 md:px-8 lg:-mx-12 lg:px-12";

export function PageHeader({
  eyebrow,
  title,
  actions,
  children,
}: {
  /** Kept as a path for the call sites; the rail already shows where you are. */
  eyebrow: string;
  title: string;
  /** Right-aligned beside the title — a page-level control, not navigation. */
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className={`${BAND} pt-12 pb-12 lg:pt-14`} data-eyebrow={eyebrow}>
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <h1 className="m-0 text-4xl text-foreground leading-heading tracking-display">{title}</h1>
        {actions ? <div className="flex items-center gap-2 pt-2">{actions}</div> : null}
      </div>
      {children ? (
        <div className="mt-4 max-w-3xl space-y-4 text-base text-neutral-11 sm:text-lg [&_p]:m-0">
          {children}
        </div>
      ) : null}
    </header>
  );
}

/**
 * Slug for a section heading, so it can be linked to and listed.
 *
 * Derived from the title rather than passed in: an id nobody has to supply is
 * an id nobody forgets, and the on-this-page rail reads these back out of the
 * DOM. A heading that changes wording changes its anchor with it, which is the
 * right trade — a stale anchor that silently scrolls nowhere is worse than one
 * that visibly 404s in the rail.
 */
export function sectionId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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
  const id = sectionId(title);
  return (
    <section className={`${BAND} scroll-mt-20 border-border border-t py-12`} id={id}>
      <h2
        className="m-0 text-2xl text-foreground leading-heading tracking-heading"
        id={`${id}-heading`}
      >
        {title}
      </h2>
      {note ? (
        <div className="mt-3 mb-8 max-w-3xl space-y-3 text-base text-neutral-11 [&_p]:m-0">
          {note}
        </div>
      ) : (
        <div className="mb-8" />
      )}
      {children}
    </section>
  );
}

/** A framed panel — the same hairline-edged card the component previews use. */
export function Panel({
  children,
  className = "",
  tone = "card",
}: {
  children: ReactNode;
  className?: string;
  tone?: "card" | "muted";
}) {
  // A Geist preview card: white on the canvas, one hairline, an 8px corner.
  // The muted tone is the canvas-coloured strip variant, still edged.
  const background = tone === "card" ? "bg-card" : "bg-background";
  return (
    <div className={`rounded-lg border border-border ${background} p-6 ${className}`}>
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
      <table className="w-full min-w-[42rem] border-collapse text-left text-ui">{children}</table>
    </div>
  );
}

export function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={`border-border border-b py-2.5 pl-3 font-medium text-muted-foreground text-xs first:pl-0 ${className}`}
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
    <td colSpan={colSpan} className={`py-3 pl-3 align-middle first:pl-0 ${className}`}>
      {children}
    </td>
  );
}

/** Rows on hairlines, as Geist and Radix set their reference tables. `index`
 * is kept for the call sites that pair a value row with its description row. */
export function Tr({ children, index: _index }: { children: ReactNode; index: number }) {
  return <tr className="border-border border-b last:border-b-0">{children}</tr>;
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
      className={`${mode === "dark" ? "dark" : ""} rounded-lg border border-border bg-card p-6 text-foreground ${className}`}
    >
      <p className="m-0 mb-5 flex items-baseline gap-2 text-sm">
        <span className="font-medium text-foreground">{mode === "dark" ? "Dark" : "Light"}</span>
        <code className="font-mono text-muted-foreground text-xs">
          {mode === "dark" ? ".dark" : ":root"}
        </code>
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
    <p className="m-0 max-w-3xl rounded-lg border border-border bg-card px-4 py-3 text-neutral-11 text-sm">
      {children}
    </p>
  );
}
