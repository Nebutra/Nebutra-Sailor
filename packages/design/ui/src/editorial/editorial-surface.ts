import { cva } from "class-variance-authority";
import type { CSSProperties } from "react";

/**
 * Shared visual grammar for long-form editorial blocks.
 *
 * Every block in this directory composes these recipes instead of hand-picking
 * borders, radii and shadows, so a change to the editorial voice is one edit
 * here rather than fifteen edits across the renderer.
 *
 * The grammar is hairline-first: separation comes from a 1px border plus the
 * ambient elevation ramp, never from a filled colour panel. Tone is carried by
 * a 2px rail and an icon, so a page of stacked blocks still reads as one
 * document rather than a row of coloured cards.
 */

/** Uppercase micro-label that opens a block. Not part of the registered type scale. */
export const EDITORIAL_EYEBROW =
  "text-[0.6875rem] font-semibold uppercase leading-none tracking-[0.14em] text-muted-foreground";

/** Caption / footnote text under a figure, table or chart. */
export const EDITORIAL_CAPTION = "text-sm leading-6 text-muted-foreground";

/** Body copy inside a block. One step tighter than article prose. */
export const EDITORIAL_BODY = "text-[0.9375rem] leading-7 text-muted-foreground";

/** Block title. Sits below an article h3 so it never competes with the outline. */
export const EDITORIAL_TITLE = "text-base font-semibold leading-6 text-foreground";

/**
 * Figures are numeric, so they take tabular lining figures — otherwise a column
 * of stats visually ragged-rights itself as digit widths change.
 */
export const EDITORIAL_FIGURE = "font-mono font-semibold tabular-nums text-foreground";

/**
 * Article body is a ~3xl reading column. Blocks that carry a grid, a table or a
 * chart earn width by breaking out of it; prose-adjacent blocks stay inline so
 * the measure is preserved.
 */
export const editorialBlock = cva("", {
  variants: {
    width: {
      column: "",
      breakout: "lg:-mx-12",
      full: "lg:-mx-20",
    },
    spacing: {
      none: "",
      tight: "my-8",
      normal: "my-10",
      loose: "my-14",
    },
  },
  defaultVariants: { width: "column", spacing: "normal" },
});

/**
 * Surface recipe. `resting` is the default for a card in flow; `raised` is for
 * the one block in a set that should read as emphasised, not for every card.
 */
export const editorialFrame = cva("border border-border bg-background", {
  variants: {
    radius: {
      card: "rounded-[var(--radius-xl)]",
      panel: "rounded-[var(--radius-2xl)]",
      inner: "rounded-[var(--radius-md)]",
    },
    elevation: {
      flat: "",
      resting: "shadow-ambient-sm",
      raised: "shadow-ambient-md",
    },
  },
  defaultVariants: { radius: "card", elevation: "resting" },
});

export const EDITORIAL_TONES = ["note", "insight", "success", "warning", "danger"] as const;

export type EditorialTone = (typeof EDITORIAL_TONES)[number];

/**
 * Every entry resolves to a complete colour, never to bare HSL channels: the
 * accent is consumed by `color-mix()` and by a `background-color`, both of
 * which discard the whole declaration if handed `222 47% 11%`. That is why
 * `insight` wraps `--primary` in `hsl()` rather than reaching for
 * `--brand-primary`, which is the VI identity lock and not a surface colour.
 */
const TONE_ACCENT: Record<EditorialTone, string> = {
  note: "var(--neutral-8)",
  insight: "hsl(var(--primary))",
  success: "var(--status-success)",
  warning: "var(--status-warning)",
  danger: "var(--status-danger)",
};

export function editorialToneAccent(tone: EditorialTone): string {
  return TONE_ACCENT[tone];
}

export function isEditorialTone(value: unknown): value is EditorialTone {
  return typeof value === "string" && (EDITORIAL_TONES as readonly string[]).includes(value);
}

/**
 * Inline custom property consumed by the tone-aware utility classes below.
 * `--editorial-tone` is a private name: shadowing a core token such as
 * `--primary` on an element would leak into the whole subtree.
 */
export function editorialToneStyle(tone: EditorialTone): CSSProperties {
  // `CSSProperties` has no index signature for custom properties, so the cast
  // is unavoidable. Keeping it here means no component repeats it.
  return { "--editorial-tone": editorialToneAccent(tone) } as CSSProperties;
}

/** Foreground for icons and rails. */
export const EDITORIAL_TONE_FG = "text-[color:var(--editorial-tone)]";

/** 5% wash — enough to register as tinted, not enough to read as a coloured block. */
export const EDITORIAL_TONE_WASH = "bg-[color-mix(in_srgb,var(--editorial-tone)_5%,transparent)]";

/** 12% plate behind an icon. */
export const EDITORIAL_TONE_PLATE = "bg-[color-mix(in_srgb,var(--editorial-tone)_12%,transparent)]";
