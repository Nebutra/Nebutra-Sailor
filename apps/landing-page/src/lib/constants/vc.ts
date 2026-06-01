/**
 * Shared types for the VC directory surfaces (China + Global).
 * Both directories render through the same `<VcDirectory>` component.
 */
export interface VcOrg {
  id: number;
  name: string;
  /** Institution types — VC / PE / Accelerator / Seed / Growth … */
  types: string[];
  /** Investment sectors (赛道 / focus areas). */
  sectors: string[];
  summary: string;
  /** Official website. */
  website: string;
  /** Deal-count metrics (China dataset). */
  total?: number;
  y2024?: number;
  /** Profile attributes (Global dataset). */
  region?: string;
  founded?: number;
  /** Resolved logo path, or null for monogram. Precomputed server-side so no
   *  function crosses the server→client boundary. */
  logo?: string | null;
}

/** 1–2 char monogram from the institution name (drops trailing parenthetical). */
export function vcMonogram(name: string): string {
  const base = name.replace(/[（(].*$/, "").trim();
  return base.slice(0, 2) || "VC";
}
