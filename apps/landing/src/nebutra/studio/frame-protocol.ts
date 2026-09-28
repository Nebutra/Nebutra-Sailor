import type { Preset } from "@nebutra/tokens/preset";
import type { CatalogCategory } from "@nebutra/ui/catalog";

/**
 * Studio ↔ catalog frame messages. The frame is a same-origin page
 * (/sailor/studio/frame) so the chosen look covers the whole document —
 * dialogs, menus and toasts portal to its <body> and still wear it — and the
 * device widths are real media queries, not a narrowed div.
 */

export type CatalogFilter = CatalogCategory | "all";

export interface FrameState {
  preset: Preset;
  dark: boolean;
  category: CatalogFilter;
  query: string;
  /** An open entry's id, or null for the grid. */
  entry: string | null;
}

export type ToFrame = { type: "studio:state"; state: FrameState };

export type FromFrame = { type: "studio:ready" } | { type: "studio:open"; entry: string | null };

export function isFromFrame(data: unknown): data is FromFrame {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof (data as { type?: unknown }).type === "string" &&
    ((data as { type: string }).type === "studio:ready" ||
      (data as { type: string }).type === "studio:open")
  );
}

export function isToFrame(data: unknown): data is ToFrame {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { type?: unknown }).type === "studio:state" &&
    typeof (data as { state?: unknown }).state === "object"
  );
}
