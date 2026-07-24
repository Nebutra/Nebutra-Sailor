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

  /** Enriched profile fields (head funds) — power the detail pages. */
  nameEn?: string;
  hq?: string;
  thesis?: { en: string; zh: string };
  stages?: string[];
  checkSize?: string;
  /** Notable portfolio company names. */
  notable?: string[];
  /** Notable recent (2025-2026) investments. */
  recent?: string[];
}

/**
 * Similar institutions by sector overlap (desc), tie-broken by activity.
 * Derived — no extra data needed. Excludes the target itself.
 */
export function similarVcs(target: VcOrg, pool: VcOrg[], limit = 4): VcOrg[] {
  const targetSectors = new Set(target.sectors);
  return pool
    .filter((o) => o.id !== target.id)
    .map((o) => ({ o, score: o.sectors.filter((s) => targetSectors.has(s)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || (b.o.total ?? 0) - (a.o.total ?? 0))
    .slice(0, limit)
    .map((x) => x.o);
}

/** 1–2 char monogram from the institution name (drops trailing parenthetical). */
export function vcMonogram(name: string): string {
  const base = name.replace(/[（(].*$/, "").trim();
  return base.slice(0, 2) || "VC";
}
