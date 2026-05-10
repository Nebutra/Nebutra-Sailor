"use client";

import type * as React from "react";
import { useId } from "react";
import { cn } from "../utils/cn";

export interface FeatureItem {
  /** Feature title */
  title: string;
  /** Feature description */
  description: string;
}

export interface FeaturesGridProps {
  /** Array of features to display */
  features: FeatureItem[];
  /** Grid cell size for the decorative pattern */
  gridSize?: number;
  /** Additional className */
  className?: string;
}

/**
 * FeaturesGrid - Feature cards with gradient backgrounds and decorative grid patterns
 *
 * Displays features in a responsive grid with gradient card backgrounds
 * and animated grid pattern overlays.
 *
 * @example
 * ```tsx
 * <FeaturesGrid
 *   features={[
 *     { title: "Fast", description: "Lightning fast performance" },
 *     { title: "Secure", description: "Enterprise-grade security" },
 *   ]}
 * />
 * ```
 */
export function FeaturesGrid({ features, gridSize = 20, className }: FeaturesGridProps) {
  return (
    <div className={cn("py-20 lg:py-40", className)}>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-3 md:gap-2 lg:grid-cols-4">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="relative overflow-hidden rounded-[var(--radius-3xl)] bg-gradient-to-b from-muted/50 to-background p-6"
          >
            <DecorativeGrid size={gridSize} />
            <p className="relative z-20 text-base font-bold text-foreground">{feature.title}</p>
            <p className="relative z-20 mt-4 text-base font-normal text-muted-foreground">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Decorative grid overlay for feature cards
 */
export function DecorativeGrid({ pattern, size }: { pattern?: number[][]; size?: number }) {
  const p = pattern ?? [
    [Math.floor(Math.random() * 4) + 7, Math.floor(Math.random() * 6) + 1],
    [Math.floor(Math.random() * 4) + 7, Math.floor(Math.random() * 6) + 1],
    [Math.floor(Math.random() * 4) + 7, Math.floor(Math.random() * 6) + 1],
    [Math.floor(Math.random() * 4) + 7, Math.floor(Math.random() * 6) + 1],
    [Math.floor(Math.random() * 4) + 7, Math.floor(Math.random() * 6) + 1],
  ];

  return (
    <div
      className="pointer-events-none absolute left-1/2 top-0 -ml-20 -mt-2 h-full w-full [mask-image:linear-gradient(white,transparent)]"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-muted/30 to-muted/30 opacity-100 [mask-image:radial-gradient(farthest-side_at_top,white,transparent)]">
        <GridPattern
          width={size ?? 20}
          height={size ?? 20}
          x="-12"
          y="4"
          squares={p}
          className="absolute inset-0 h-full w-full fill-foreground/10 stroke-foreground/10 mix-blend-overlay"
        />
      </div>
    </div>
  );
}

interface GridPatternProps extends React.SVGProps<SVGSVGElement> {
  width: number;
  height: number;
  x: string;
  y: string;
  squares?: number[][];
}

/**
 * SVG grid pattern for decorative backgrounds
 */
export function GridPattern({ width, height, x, y, squares, ...props }: GridPatternProps) {
  const patternId = useId();

  return (
    <svg aria-hidden="true" {...props}>
      <defs>
        <pattern
          id={patternId}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <path d={`M.5 ${height}V.5H${width}`} fill="none" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${patternId})`} />
      {squares && (
        <svg aria-hidden="true" x={x} y={y} className="overflow-visible">
          {squares.map(([squareX, squareY]) => (
            <rect
              strokeWidth="0"
              key={`${squareX}-${squareY}`}
              width={width + 1}
              height={height + 1}
              x={squareX * width}
              y={squareY * height}
            />
          ))}
        </svg>
      )}
    </svg>
  );
}

/** Default features for demo purposes */
export const DEFAULT_FEATURES: FeatureItem[] = [
  {
    title: "HIPAA and SOC2 Compliant",
    description:
      "Our applications are HIPAA and SOC2 compliant, your data is safe with us, always.",
  },
  {
    title: "Automated Social Media Posting",
    description:
      "Schedule and automate your social media posts across multiple platforms to save time and maintain a consistent online presence.",
  },
  {
    title: "Advanced Analytics",
    description:
      "Gain insights into your social media performance with detailed analytics and reporting tools to measure engagement and ROI.",
  },
  {
    title: "Content Calendar",
    description:
      "Plan and organize your social media content with an intuitive calendar view, ensuring you never miss a post.",
  },
  {
    title: "Audience Targeting",
    description:
      "Reach the right audience with advanced targeting options, including demographics, interests, and behaviors.",
  },
  {
    title: "Social Listening",
    description:
      "Monitor social media conversations and trends to stay informed about what your audience is saying and respond in real-time.",
  },
  {
    title: "Customizable Templates",
    description:
      "Create stunning social media posts with our customizable templates, designed to fit your brand's unique style and voice.",
  },
  {
    title: "Collaboration Tools",
    description:
      "Work seamlessly with your team using our collaboration tools, allowing you to assign tasks, share drafts, and provide feedback in real-time.",
  },
];
