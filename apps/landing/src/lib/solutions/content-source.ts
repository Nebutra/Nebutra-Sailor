/**
 * Source-decoupled content for the Solutions pages.
 *
 * The `/solutions/[slug]` "best practices" strip reads through this interface
 * instead of touching Sanity directly. While content is being authored,
 * `getSolutionContentSource()` returns `EmptyContentSource` (the strip hides
 * itself). When clusters are ready, flip the factory to `SanityContentSource`
 * — no route or component changes.
 */
import type { Locale } from "@/i18n/routing";

export interface PostSummary {
  slug: string;
  title: string;
  excerpt: string;
  /** ISO date string. */
  date: string;
  /** Locale-aware href into the blog. */
  href: string;
}

export interface SolutionContentSource {
  /**
   * Posts tagged with `category`, newest first, capped at `limit`.
   * Returns `[]` when no content exists for the category.
   */
  getRelatedPosts(category: string, locale: Locale, limit: number): Promise<PostSummary[]>;
}

/** No-op source used while clusters are being authored. */
export const EmptyContentSource: SolutionContentSource = {
  async getRelatedPosts() {
    return [];
  },
};

/**
 * Sanity-backed source. Not wired yet — kept here so activating it is a
 * one-line change in `getSolutionContentSource()` once content exists.
 *
 * Implementation lands in Phase 2 against `@/lib/blog` `getAllPosts`,
 * filtered by `categories.includes(category)` and mapped to `PostSummary`.
 */
// export const SanityContentSource: SolutionContentSource = { ... }

/**
 * Resolve the active content source. Returns `EmptyContentSource` until the
 * Sanity clusters are populated (Phase 2).
 */
export function getSolutionContentSource(): SolutionContentSource {
  return EmptyContentSource;
}
