/**
 * Server-authoritative non-overlap placement.
 *
 * Ported in spirit from the source product's `find_next_best_element_position`:
 * the server — not the client — decides where a freshly generated asset lands,
 * so concurrent generations never stack and every client converges on the same
 * coordinates. Deterministic given (existing elements, size, gap): identical
 * inputs always yield the identical position, which keeps placement tests and
 * websocket-sync reproducible.
 */

import type { CanvasElement, ElementSize, Placement } from "./types";

const DEFAULT_GAP = 40;
/** Columns scanned before wrapping to the next row. Bounds worst-case work. */
const MAX_COLS = 12;

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

function overlaps(a: Box, b: Box, gap: number): boolean {
  return !(
    a.x + a.width + gap <= b.x ||
    b.x + b.width + gap <= a.x ||
    a.y + a.height + gap <= b.y ||
    b.y + b.height + gap <= a.y
  );
}

/**
 * Find the first free top-left position for an element of `size`, scanning
 * left→right then top→down on a grid sized to the largest existing element.
 * Returns `{0,0}` for an empty canvas.
 */
export function findNextPosition(
  existing: readonly CanvasElement[],
  size: ElementSize,
  gap: number = DEFAULT_GAP,
): Placement {
  if (existing.length === 0) return { x: 0, y: 0 };

  // Step = widest/tallest placed element (+gap) so the grid never collides
  // with large neighbours; bounded below by the incoming element's own size.
  const stepX = Math.max(size.width, ...existing.map((e) => e.width)) + gap;
  const stepY = Math.max(size.height, ...existing.map((e) => e.height)) + gap;

  const candidate: Box = { x: 0, y: 0, width: size.width, height: size.height };

  for (let row = 0; row < existing.length + 1; row++) {
    for (let col = 0; col < MAX_COLS; col++) {
      candidate.x = col * stepX;
      candidate.y = row * stepY;
      const clash = existing.some((e) =>
        overlaps(candidate, { x: e.x, y: e.y, width: e.width, height: e.height }, gap),
      );
      if (!clash) return { x: candidate.x, y: candidate.y };
    }
  }

  // Pathological fallback: drop below everything.
  const maxBottom = Math.max(...existing.map((e) => e.y + e.height));
  return { x: 0, y: maxBottom + gap };
}
