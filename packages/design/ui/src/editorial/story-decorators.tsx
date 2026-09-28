import type { Decorator } from "@storybook/react";

/**
 * Renders an editorial block the way an article page actually does: inside a
 * centered ~3xl reading column with enough horizontal padding at `lg` that a
 * `lg:-mx-12` (breakout) or `lg:-mx-20` (full) block stays on-canvas instead
 * of clipping at the viewport edge. Storybook otherwise renders a block alone
 * with no surrounding column, which is not how any block with `width:
 * "breakout" | "full"` (see `editorial-surface.ts` → `editorialBlock`) is
 * meant to be seen.
 *
 * Apply via each story file's `meta.decorators`, not globally, since most
 * editorial blocks stay at `width: "column"` and don't need the extra canvas.
 */
export const editorialReadingColumnDecorator: Decorator = (Story) => (
  <div className="min-h-screen bg-background px-6 py-16 sm:px-12 lg:px-24">
    <div className="mx-auto max-w-3xl">
      <Story />
    </div>
  </div>
);
