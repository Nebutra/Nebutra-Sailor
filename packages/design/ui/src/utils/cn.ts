import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Font-size steps the design system adds on top of Tailwind's own
 * (core.json:type). tailwind-merge only knows Tailwind's defaults, so an
 * unknown `text-*` is read as a colour: `cn("text-label text-destructive")`
 * returned `text-destructive` and the label silently fell back to the inherited
 * size — which is how PARA's "Delete" and its selected segment rendered larger
 * than their neighbours. Every step and role alias in core.json:type that is
 * not a Tailwind default belongs here.
 */
export const DESIGN_SYSTEM_TEXT_SIZES = ["2xs", "ui", "display", "body", "label", "meta"] as const;

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: [...DESIGN_SYSTEM_TEXT_SIZES] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
