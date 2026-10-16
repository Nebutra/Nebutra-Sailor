import type { DayState } from "@/lib/view";

/**
 * Colour is never the only signal: every fill below sits next to a text label
 * or an accessible name. Ink uses the -strong steps, which hold AA on both
 * themes where the base fill does not.
 */
export const stateFill: Record<DayState, string> = {
  operational: "bg-success",
  degraded: "bg-warning",
  outage: "bg-destructive",
  maintenance: "bg-info",
  unknown: "bg-[hsl(var(--muted-foreground)/0.45)]",
  no_data: "bg-[hsl(var(--muted-foreground)/0.16)]",
};

export const stateInk: Record<DayState, string> = {
  operational: "text-success-strong",
  degraded: "text-warning-strong",
  outage: "text-destructive-strong",
  maintenance: "text-info-strong",
  unknown: "text-muted-foreground",
  no_data: "text-muted-foreground",
};

export const impactFill: Record<"none" | "minor" | "major" | "critical", string> = {
  none: "bg-[hsl(var(--muted-foreground)/0.45)]",
  minor: "bg-warning",
  major: "bg-warning",
  critical: "bg-destructive",
};
