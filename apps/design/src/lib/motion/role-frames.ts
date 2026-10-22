/**
 * What each motion role does to its subject, as CSS.
 *
 * A frame is a style object, and every number in it is a `var()` onto a motion
 * token: the role's own distance, scale, duration and easing. So changing
 * `motion.enter.distance` in the token source changes the demo, and nothing here
 * can quietly disagree with the token it is demonstrating.
 *
 * The reduced variant follows the policy in `static/base.css`: movement stops,
 * opacity stays, so a state change still reads as a change instead of a snap.
 */

import type { CSSProperties } from "react";

export const ROLE_FRAME_IDS = ["enter", "exit", "swap", "shared", "press"] as const;
export type RoleFrameId = (typeof ROLE_FRAME_IDS)[number];

export interface Frame {
  rest: CSSProperties;
  active: CSSProperties;
}

export interface RoleFrames {
  /** The `transition-property` list the role animates. */
  property: string;
  subject: Frame;
  /** A second element for roles that hand off between two (swap, shared). */
  partner?: Frame;
}

const NONE = "none";

/** Opacity of a pressed control when it cannot move — a presentation value, not a motion token. */
const PRESSED_OPACITY = 0.7;

function fade(from: number, to: number): Frame {
  return { rest: { opacity: from }, active: { opacity: to } };
}

export function roleFrames(id: RoleFrameId, reduced: boolean): RoleFrames {
  switch (id) {
    case "enter":
      return reduced
        ? { property: "opacity", subject: fade(0, 1) }
        : {
            property: "opacity, transform",
            subject: {
              rest: { opacity: 0, transform: "translateY(var(--motion-enter-distance))" },
              active: { opacity: 1, transform: NONE },
            },
          };
    case "exit":
      return reduced
        ? { property: "opacity", subject: fade(1, 0) }
        : {
            property: "opacity, transform",
            subject: {
              rest: { opacity: 1, transform: NONE },
              active: { opacity: 0, transform: "translateY(var(--motion-exit-distance))" },
            },
          };
    case "swap":
      return reduced
        ? { property: "opacity", subject: fade(1, 0), partner: fade(0, 1) }
        : {
            property: "opacity, transform",
            subject: {
              rest: { opacity: 1, transform: NONE },
              active: {
                opacity: 0,
                transform: "translateY(calc(var(--motion-swap-distance) * -1))",
              },
            },
            partner: {
              rest: { opacity: 0, transform: "translateY(var(--motion-swap-distance))" },
              active: { opacity: 1, transform: NONE },
            },
          };
    case "shared":
      // Full: one chip travels its own width plus the gap, the gap being the
      // role's distance token. Reduced: it cannot travel, so it hands over.
      return reduced
        ? { property: "opacity", subject: fade(1, 0), partner: fade(0, 1) }
        : {
            property: "transform",
            subject: {
              rest: { transform: NONE },
              active: { transform: "translateX(calc(100% + var(--motion-shared-distance)))" },
            },
          };
    case "press":
      return reduced
        ? { property: "opacity", subject: fade(1, PRESSED_OPACITY) }
        : {
            property: "transform",
            subject: {
              rest: { transform: NONE },
              active: {
                transform:
                  "translateY(var(--motion-press-distance)) scale(var(--motion-press-scale))",
              },
            },
          };
  }
}

/**
 * `transition` for a role. Duration is multiplied by `--slow` (1 or 4), set on
 * the stage, so 0.25x playback is the same token stretched, not a second tuning.
 */
export function roleTransition(id: RoleFrameId, property: string): string {
  return property
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `${p} calc(var(--motion-${id}-duration) * var(--slow)) var(--motion-${id}-easing)`)
    .join(", ");
}

/** Milliseconds in a resolved CSS time ("300ms", "0.5s"); 0 for anything else. */
export function parseMs(value: string): number {
  const match = /^\s*(-?\d*\.?\d+)(ms|s)\s*$/.exec(value);
  if (!match) return 0;
  const amount = Number(match[1]);
  return match[2] === "s" ? amount * 1000 : amount;
}
