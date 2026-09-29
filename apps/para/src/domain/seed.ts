import type { GeneratorMode, Viewport, WorkspaceNode } from "./types";

/**
 * A workspace opened from a Home tool tile arrives with `?seed=<mode>` and starts with one empty
 * generator node of that mode, selected, with its prompt focused.
 *
 * Only the modes the origin can actually generate today are seedable. Video and audio exist in the
 * node model, but a tile that opens a generator whose Generate always fails is a dead link with
 * extra steps, so they are not accepted here — adding one is a one-line change once the backend
 * serves it.
 */
export const SEED_MODES = ["image", "text"] as const satisfies readonly GeneratorMode[];
export type SeedMode = (typeof SEED_MODES)[number];

export function parseSeed(value: string | null | undefined): SeedMode | null {
  return SEED_MODES.includes(value as SeedMode) ? (value as SeedMode) : null;
}

const SEED_SIZE: Record<SeedMode, { width: number; height: number }> = {
  image: { width: 320, height: 180 },
  text: { width: 280, height: 96 },
};

/**
 * The seeded node, centred on what the viewport currently shows. `stage` is the canvas's pixel size;
 * without one the node lands near the origin, which is where a fresh document's viewport points.
 */
export function seedNode(
  mode: SeedMode,
  id: string,
  viewport: Viewport,
  stage: { width: number; height: number } = { width: 1200, height: 700 },
): WorkspaceNode {
  const size = SEED_SIZE[mode];
  const cx = (stage.width / 2 - viewport.x) / viewport.zoom;
  const cy = (stage.height / 2 - viewport.y) / viewport.zoom;
  const base = {
    id,
    x: Math.round(cx - size.width / 2),
    y: Math.round(cy - size.height / 2),
    ...size,
    status: "empty" as const,
    createdBy: "user" as const,
    generator: { mode, model: "Auto", count: 1 as const },
  };
  return mode === "text" ? { ...base, type: "text", text: "" } : { ...base, type: "image" };
}

/** The canvas URL for a workspace, optionally seeded. */
export function canvasHref(projectId: string, workspaceId: string, seed?: SeedMode | null): string {
  const path = `/p/${projectId}/w/${workspaceId}`;
  return seed ? `${path}?seed=${seed}` : path;
}
