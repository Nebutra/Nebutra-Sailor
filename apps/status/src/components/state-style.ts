import type { DayState } from "@/lib/view";

/**
 * One palette for every state, from the Geist DS scale in @nebutra/tokens
 * (light and dark both defined there). Step 700 for bar cells — the muted
 * mid-tone incident.io-class pages use — and 900 for ink and icons.
 * A source that went quiet is grey, never red: silence is not an outage.
 */
export const stateFill: Record<DayState, string> = {
  operational: "bg-green-700",
  degraded: "bg-amber-700",
  outage: "bg-red-700",
  maintenance: "bg-blue-700",
  unknown: "bg-neutral-6",
  no_data: "bg-neutral-4",
};

export const stateInk: Record<DayState, string> = {
  operational: "text-green-900",
  degraded: "text-amber-900",
  outage: "text-red-900",
  maintenance: "text-blue-900",
  unknown: "text-muted-foreground",
  no_data: "text-muted-foreground",
};

/** Tinted header row of the verdict card. */
export const verdictTint: Record<"operational" | "degraded" | "outage", string> = {
  operational: "bg-green-200",
  degraded: "bg-amber-200",
  outage: "bg-red-200",
};

export const verdictBorder: Record<"operational" | "degraded" | "outage", string> = {
  operational: "border-green-700/40",
  degraded: "border-amber-700/50",
  outage: "border-red-700/40",
};

export const impactFill: Record<"none" | "minor" | "major" | "critical", string> = {
  none: "bg-neutral-6",
  minor: "bg-amber-700",
  major: "bg-amber-700",
  critical: "bg-red-700",
};

export const impactTint: Record<"none" | "minor" | "major" | "critical", string> = {
  none: "bg-muted",
  minor: "bg-amber-200",
  major: "bg-amber-200",
  critical: "bg-red-200",
};

/** Calendar day rings: only for days that were not fine. */
export const stateRing: Record<DayState, string> = {
  operational: "ring-green-700",
  degraded: "ring-amber-700",
  outage: "ring-red-700",
  maintenance: "ring-blue-700",
  unknown: "ring-neutral-6",
  no_data: "ring-neutral-4",
};
