/**
 * Product sub-brand mark for Nebutra Forge — blocky anvil silhouette
 * (craft-table aesthetic, original geometry — not third-party assets).
 */
import { cn } from "@nebutra/ui/utils";

export function ForgeMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={cn("block shrink-0", className)}
    >
      {/* Horn + face (top deck) */}
      <path d="M2 4.5h16.5v2.25H17V9h-2.25V6.75H6.5V9H4.25V6.75H2V4.5Z" />
      {/* Waist / stem */}
      <path d="M8.25 9h7.5v5.25h-7.5V9Z" />
      {/* Base plate */}
      <path d="M5.25 14.25h13.5V17H5.25v-2.75Z" />
      {/* Foot */}
      <path d="M6.75 17h10.5v2.5H6.75V17Z" />
    </svg>
  );
}
