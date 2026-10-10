"use client";

/**
 * Scaffolding shared by every component page.
 *
 * Colour rules this file obeys, because a design site getting them wrong would
 * be its own punchline:
 *   - semantic tokens hold bare HSL channels, so they are only ever used
 *     through a semantic utility (`bg-muted`, `text-muted-foreground`) or
 *     wrapped in `hsl(var(--x))`. A bare `var(--x)` in a colour slot silently
 *     kills the declaration.
 *   - shadows come from the ramp (`shadow-ambient-*`, `shadow-glass-*`,
 *     `shadow-sheen`, `shadow-xs`…`shadow-2xl`). No bespoke `shadow-[...]`.
 *   - a specimen sits on a framed stage: the card surface, one hairline, an
 *     8px corner — Geist's preview card. A tonal wash with no edge read as a
 *     smudge behind the component rather than a place it was put.
 */

import { Check, ChevronDown, Command } from "@nebutra/icons";
import { cn } from "@nebutra/ui/utils";
import * as React from "react";

// ─── page frame ───────────────────────────────────────────────────────────────

export function DemoPage({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col">{children}</div>;
}

/**
 * One state of one component. `id` becomes an anchor so a defect can be linked
 * to precisely ("the overflow case on /components/badge#overflow").
 */
export function State({
  id,
  title,
  note,
  breaks,
  children,
}: {
  id: string;
  title: string;
  /** What this state is showing, and what to look for. */
  note?: React.ReactNode;
  /** Why this state is on the page — the failure it is here to catch. */
  breaks?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={`${id}-heading`}
      className="group -mx-4 scroll-mt-20 border-border border-t px-4 py-12 md:-mx-8 md:px-8 lg:-mx-12 lg:px-12"
      id={id}
    >
      <div className="mb-6 flex flex-col gap-3">
        <div className="flex items-baseline gap-3">
          <h2
            className="m-0 text-2xl text-foreground leading-heading tracking-heading"
            id={`${id}-heading`}
          >
            {title}
          </h2>
          <a
            aria-label={`Link to the ${title} state`}
            className="text-muted-foreground text-sm no-underline opacity-0 transition-opacity duration-micro hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
            href={`#${id}`}
          >
            #
          </a>
        </div>
        {note ? <p className="m-0 max-w-3xl text-base text-neutral-11">{note}</p> : null}
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="p-6">{children}</div>
        {/* What the state is here to catch, in the strip under the stage —
            where Geist puts "Show code": metadata about the specimen, kept off
            the specimen and out of the reading column above it. */}
        {breaks ? (
          <p className="m-0 border-border border-t bg-background px-6 py-3 text-muted-foreground text-sm">
            <span className="font-medium text-foreground">Catches</span>
            <span aria-hidden className="px-2">
              ·
            </span>
            {breaks}
          </p>
        ) : null}
      </div>
    </section>
  );
}

/** The stage a component is rendered on outside a State: the same framed card. */
export function Surface({
  children,
  className,
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    // Deliberately no min-w-0 reset on descendants: the overflow states on these
    // pages show how a component behaves under real pressure, and a blanket
    // shrink override would quietly fix the thing being demonstrated.
    <div className={cn("rounded-lg border border-border bg-card", padded && "p-6", className)}>
      {children}
    </div>
  );
}

/** Even grid for a set of specimens. */
export function Row({
  children,
  className,
  align = "center",
}: {
  children: React.ReactNode;
  className?: string | undefined;
  align?: "center" | "start" | "end" | "baseline";
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-4",
        align === "center" && "items-center",
        align === "start" && "items-start",
        align === "end" && "items-end",
        align === "baseline" && "items-baseline",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Stack({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-4", className)}>{children}</div>;
}

/** A labelled specimen. The label is the value being demonstrated. */
export function Specimen({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col items-start gap-2", className)}>
      <div className="flex min-h-8 items-center">{children}</div>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  );
}

// ─── derived-axis rendering ───────────────────────────────────────────────────

/**
 * Renders one specimen per value of an axis that was read out of the library
 * source. If the axis came back empty the page says so instead of quietly
 * rendering nothing — an empty axis means the extractor lost track of the
 * source, which is a defect, not an absence.
 */
export function AxisMatrix({
  values,
  axisName,
  defaultValue,
  render,
  className,
}: {
  values: string[];
  /** e.g. `variant`, for the empty-axis message. */
  axisName: string;
  defaultValue?: string | undefined;
  render: (value: string) => React.ReactNode;
  className?: string;
}) {
  if (values.length === 0) {
    return <MissingAxis axisName={axisName} />;
  }

  return (
    <Row className={className} align="start">
      {values.map((value) => (
        <Specimen key={value} label={value === defaultValue ? `${value} · default` : value}>
          {render(value)}
        </Specimen>
      ))}
    </Row>
  );
}

export function MissingAxis({ axisName }: { axisName: string }) {
  return (
    <p className="text-sm text-destructive-strong">
      No <code className="font-mono">{axisName}</code> values were found in the library source. This
      page derives them at build time, so an empty axis means the source moved and the extractor in{" "}
      <code className="font-mono">src/lib/components/ui-source.ts</code> needs updating — it does
      not mean the component has no {axisName}.
    </p>
  );
}

// ─── interaction helpers ──────────────────────────────────────────────────────

/** Small control strip for driving a demo's state. */
export function Controls({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">{children}</div>;
}

export function ControlButton({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium text-xs transition-colors",
        active
          ? "bg-foreground text-background"
          : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
      onClick={onClick}
      type="button"
    >
      {active ? <Check className="size-3" /> : null}
      {children}
    </button>
  );
}

/**
 * Describes the keyboard contract of a component and gives the reader a place
 * to actually try it. The steps are prose because a keyboard path is a claim
 * about behaviour, not a value that can be extracted from a type.
 */
export function KeyboardPath({
  steps,
  children,
}: {
  steps: { keys: string; does: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <Command className="size-3.5" />
          <span>Tab into the specimen below and follow the path.</span>
        </div>
        <dl className="flex flex-col gap-1.5">
          {steps.map((step) => (
            <div className="flex flex-wrap items-baseline gap-2" key={step.keys}>
              <dt>
                <kbd className="rounded-[var(--radius-sm)] border border-border bg-background px-1.5 py-0.5 font-mono text-foreground text-xs">
                  {step.keys}
                </kbd>
              </dt>
              <dd className="text-muted-foreground text-sm">{step.does}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="rounded-lg border border-border bg-background p-4">{children}</div>
    </div>
  );
}

/** Long content used by every overflow state, so the pressure is comparable. */
export const LONG_LABEL =
  "Provisioning a dedicated single-tenant analytics cluster in Frankfurt (eu-central-1)";

export const LONG_PARAGRAPH =
  "The deployment could not be promoted because the build produced no output directory. " +
  "This usually means the framework preset was detected incorrectly, or the build command " +
  "exited zero without writing anything. Check the build logs for the last successful step, " +
  "then re-run with the output directory set explicitly.";

/** A collapsible aside for context that would otherwise crowd the specimen. */
export function Aside({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="mt-12 rounded-lg border border-border bg-card">
      <button
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left font-medium text-foreground text-sm"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        {title}
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="px-4 pb-4 text-muted-foreground text-sm [&_code]:font-mono [&_code]:text-xs">
          {children}
        </div>
      ) : null}
    </div>
  );
}
