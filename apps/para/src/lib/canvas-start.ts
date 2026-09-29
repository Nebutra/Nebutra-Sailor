import { canvasHref, type SeedMode } from "@/domain/seed";

/**
 * What a create entry on the shell starts with.
 * - `blank`: an empty canvas (sidebar 新建项目, the Home 新建画布创作 card).
 * - `agent`: an empty canvas with the agent composer open.
 * - a seed mode: an empty canvas holding one generator node of that mode.
 */
export type CanvasStart = "blank" | "agent" | SeedMode;

/**
 * What the canvas is opened with, beyond the start. The query-param contract with the canvas:
 * - `template` → `?template=<id>` (the canvas lays the template out; e.g. `text-to-video`).
 * - `seed` → `?seed=image|text` (one empty generator node of that mode).
 * - `prompt` (agent start only) is handed over in the agent store, not the URL: the composer
 *   opens holding it, and the idea never lands in history or in a link someone copies.
 */
export interface CanvasOptions {
  template?: string;
  seed?: SeedMode;
  prompt?: string;
}

/** A new project is named the way LibTV names one; the owner renames it on the canvas. */
export const NEW_PROJECT_NAME = "未命名项目";

/** The canvas URL a start opens. Pure, so the contract above is tested without a router. */
export function startHref(
  projectId: string,
  workspaceId: string,
  start: CanvasStart,
  opts: CanvasOptions = {},
): string {
  const seed = opts.seed ?? (start === "blank" || start === "agent" ? null : start);
  const href = canvasHref(projectId, workspaceId, seed);
  if (!opts.template) return href;
  const sep = href.includes("?") ? "&" : "?";
  return `${href}${sep}template=${encodeURIComponent(opts.template)}`;
}

/** Which entry is busy: a template or seed launcher, or the start itself. */
export function startKey(start: CanvasStart, opts: CanvasOptions = {}): string {
  return opts.template ?? opts.seed ?? start;
}
