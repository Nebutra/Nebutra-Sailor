/**
 * Animated Beam Component Tokens - Layer 3
 *
 * Product data-flow connector. Keep defaults quiet and semantic; consumers
 * should choose tone/intensity before reaching for raw SVG paint overrides.
 */

import { easings } from "../motion";
import { primitiveTransition } from "../primitive";

export type AnimatedBeamTone = "neutral" | "brand" | "success" | "warning";
export type AnimatedBeamIntensity = "subtle" | "normal" | "strong";

export const animatedBeamTokens = {
  path: {
    width: 1.25,
    opacity: {
      subtle: 0.2,
      normal: 0.28,
      strong: 0.36,
    },
  },
  beam: {
    width: {
      subtle: 1.5,
      normal: 2,
      strong: 2.5,
    },
    duration: primitiveTransition.duration.cinematic * 8, // 4000ms
    easing: easings.easeInOut,
  },
  tone: {
    neutral: {
      pathColor: "var(--neutral-7)",
      startColor: "var(--neutral-10)",
      stopColor: "var(--neutral-12)",
    },
    brand: {
      pathColor: "var(--blue-7)",
      startColor: "var(--brand-primary)",
      stopColor: "var(--brand-accent)",
    },
    success: {
      pathColor: "var(--cyan-7)",
      startColor: "var(--cyan-9)",
      stopColor: "var(--brand-accent)",
    },
    warning: {
      pathColor: "var(--neutral-8)",
      startColor: "var(--brand-tertiary)",
      stopColor: "var(--brand-primary)",
    },
  },
} as const;
