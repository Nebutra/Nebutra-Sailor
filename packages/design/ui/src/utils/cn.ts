import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import { TW_MERGE_CLASS_GROUPS, TW_MERGE_THEME } from "./tw-merge-theme.generated";

/**
 * tailwind-merge only knows Tailwind's default scale. Every utility the design
 * tokens add (text-label, shadow-ambient-md, rounded-card, ease-brand,
 * max-w-wide, …) was otherwise an unknown class: `cn("text-label
 * text-destructive-strong")` returned "text-destructive-strong" and the size fell away, and
 * `cn("rounded-card", "rounded-lg")` kept both so the winner depended on
 * stylesheet order. The theme below is generated from the tokens' @theme blocks
 * (scripts/gen-tw-merge-theme.mjs), so a new token utility is known here the
 * moment it exists; a test fails if the generated file goes stale.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: Object.fromEntries(
      Object.entries(TW_MERGE_THEME).map(([key, values]) => [key, [...values]]),
    ),
    classGroups: Object.fromEntries(
      Object.entries(TW_MERGE_CLASS_GROUPS).map(([key, groups]) => [
        key,
        groups.map((group) =>
          Object.fromEntries(Object.entries(group).map(([k, v]) => [k, [...v]])),
        ),
      ]),
    ),
  },
});

/** Kept for callers and tests that enumerate the design-system text steps. */
export const DESIGN_SYSTEM_TEXT_SIZES = TW_MERGE_THEME.text;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
