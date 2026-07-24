/**
 * Layout SSOT for Type Lens containers.
 *
 * Prefer these Tailwind utility strings for gutters — they go through the
 * utility pipeline and cannot be silently dropped the way custom CSS classes
 * can when co-located with `@import "tailwindcss"` under Turbopack.
 *
 * Keep `tl-container` as a secondary hook (defined in styles/shell.css).
 * See packages/design/ARCHITECTURE.md §2.1
 */
export const TL_CONTAINER =
  "tl-container mx-auto box-border w-full max-w-[1480px] px-5 sm:px-6 md:px-8 lg:px-10";
