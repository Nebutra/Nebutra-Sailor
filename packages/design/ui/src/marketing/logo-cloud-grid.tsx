"use client";

import { Plus as PlusIcon } from "@nebutra/icons";
import Image from "next/image";
import type * as React from "react";
import { cn } from "../utils/cn";

export interface LogoCloudGridLogo {
  /** Logo image source URL */
  src: string;
  /** Alt text for accessibility */
  alt: string;
  /** Optional width */
  width?: number;
  /** Optional height */
  height?: number;
}

export interface LogoCloudGridProps extends React.ComponentProps<"div"> {
  /** Array of logos to display (exactly 8 for the grid layout) */
  logos?: LogoCloudGridLogo[];
  /** Show decorative plus icons at intersections */
  showDecorators?: boolean;
}

const DEFAULT_LOGOS: LogoCloudGridLogo[] = [
  { src: "https://svgl.app/library/nvidia-wordmark-light.svg", alt: "Nvidia" },
  { src: "https://svgl.app/library/supabase_wordmark_light.svg", alt: "Supabase" },
  { src: "https://svgl.app/library/github_wordmark_light.svg", alt: "GitHub" },
  { src: "https://svgl.app/library/openai_wordmark_light.svg", alt: "OpenAI" },
  { src: "https://svgl.app/library/turso-wordmark-light.svg", alt: "Turso" },
  { src: "https://svgl.app/library/clerk-wordmark-light.svg", alt: "Clerk" },
  { src: "https://svgl.app/library/claude-ai-wordmark-icon_light.svg", alt: "Claude AI" },
  { src: "https://svgl.app/library/vercel_wordmark.svg", alt: "Vercel" },
];

/**
 * LogoCloudGrid - Grid-based logo cloud with decorative borders
 *
 * A 2x4 (mobile) / 4x2 (desktop) grid layout for displaying partner/client logos
 * with decorative plus icons at intersections.
 *
 * @example
 * ```tsx
 * <LogoCloudGrid
 *   logos={[
 *     { src: "/logo1.svg", alt: "Company 1" },
 *     { src: "/logo2.svg", alt: "Company 2" },
 *     // ... 8 logos total
 *   ]}
 * />
 * ```
 */
export function LogoCloudGrid({
  logos = DEFAULT_LOGOS,
  showDecorators = true,
  className,
  ...props
}: LogoCloudGridProps) {
  // Ensure we have exactly 8 logos (pad or truncate)
  const displayLogos = logos.slice(0, 8);
  while (displayLogos.length < 8) {
    displayLogos.push({ src: "", alt: "" });
  }

  return (
    <div className={cn("relative grid grid-cols-2 border-x md:grid-cols-4", className)} {...props}>
      {/* Top border line */}
      <div className="-translate-x-1/2 -top-px pointer-events-none absolute left-1/2 w-screen border-t" />

      {/* Row 1 */}
      <LogoCard
        className="relative border-r border-b bg-secondary dark:bg-secondary/30"
        logo={displayLogos[0]}
      >
        {showDecorators && (
          <PlusIcon
            className="-right-[12.5px] -bottom-[12.5px] absolute z-10 size-6"
            strokeWidth={1}
          />
        )}
      </LogoCard>

      <LogoCard className="border-b md:border-r" logo={displayLogos[1]} />

      <LogoCard
        className="relative border-r border-b md:bg-secondary dark:md:bg-secondary/30"
        logo={displayLogos[2]}
      >
        {showDecorators && (
          <>
            <PlusIcon
              className="-right-[12.5px] -bottom-[12.5px] absolute z-10 size-6"
              strokeWidth={1}
            />
            <PlusIcon
              className="-bottom-[12.5px] -left-[12.5px] absolute z-10 hidden size-6 md:block"
              strokeWidth={1}
            />
          </>
        )}
      </LogoCard>

      <LogoCard
        className="relative border-b bg-secondary md:bg-background dark:bg-secondary/30 md:dark:bg-background"
        logo={displayLogos[3]}
      />

      {/* Row 2 */}
      <LogoCard
        className="relative border-r border-b bg-secondary md:border-b-0 md:bg-background dark:bg-secondary/30 md:dark:bg-background"
        logo={displayLogos[4]}
      >
        {showDecorators && (
          <PlusIcon
            className="-right-[12.5px] -bottom-[12.5px] md:-left-[12.5px] absolute z-10 size-6 md:hidden"
            strokeWidth={1}
          />
        )}
      </LogoCard>

      <LogoCard
        className="border-b bg-background md:border-r md:border-b-0 md:bg-secondary dark:md:bg-secondary/30"
        logo={displayLogos[5]}
      />

      <LogoCard className="border-r" logo={displayLogos[6]} />

      <LogoCard className="bg-secondary dark:bg-secondary/30" logo={displayLogos[7]} />

      {/* Bottom border line */}
      <div className="-translate-x-1/2 -bottom-px pointer-events-none absolute left-1/2 w-screen border-b" />
    </div>
  );
}

LogoCloudGrid.displayName = "LogoCloudGrid";

interface LogoCardProps extends React.ComponentProps<"div"> {
  logo: LogoCloudGridLogo;
}

function LogoCard({ logo, className, children, ...props }: LogoCardProps) {
  if (!logo.src) {
    return (
      <div
        className={cn("flex items-center justify-center bg-background px-4 py-8 md:p-8", className)}
        {...props}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn("flex items-center justify-center bg-background px-4 py-8 md:p-8", className)}
      {...props}
    >
      <Image
        alt={logo.alt}
        className="pointer-events-none h-4 select-none md:h-5 dark:brightness-0 dark:invert"
        src={logo.src}
        width={logo.width || 400}
        height={logo.height || 400}
      />
      {children}
    </div>
  );
}
