"use client";

import { cva } from "class-variance-authority";
import Image from "next/image";
import { AnimateIn, AnimateInGroup } from "../primitives/animate-in";
import { cn } from "../utils/cn";
import type { Logo, SocialProofProps, Stat } from "./types";

const EMPTY_LOGOS: Logo[] = [];
const EMPTY_STATS: Stat[] = [];

const socialProofVariants = cva("w-full overflow-hidden", {
  variants: {
    density: {
      compact: "py-10",
      normal: "py-16 md:py-24",
      spacious: "py-24 md:py-32",
    },
    variant: {
      "logos-only": "",
      "stats-only": "bg-muted border-y border-border",
      combined: "",
    },
  },
  defaultVariants: {
    density: "normal",
    variant: "combined",
  },
});

function getStatKey(stat: Stat) {
  return `${stat.prefix ?? ""}${stat.value}${stat.suffix ?? ""}-${stat.label}`;
}

function LogoCloud({ logos }: { logos: Logo[] }) {
  return (
    <div className="relative w-full overflow-hidden flex flex-col items-center">
      {/* 
        Tailwind CSS v4 approach for marquee, or simple flex wrap if not enough logos.
        We'll use a responsive flex-wrap grid for semantic robustness instead of a complex JS marquee.
      */}
      <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-8 sm:gap-x-12 md:gap-x-16 lg:gap-x-24 opacity-60 hover:opacity-100 transition-opacity duration-500">
        {logos.map((logo) => {
          const logoContent = logo.src ? (
            <Image
              key={`${logo.name}-image`}
              src={logo.src}
              alt={`${logo.name} logo`}
              width={160}
              height={40}
              sizes="(max-width: 768px) 120px, 160px"
              className="h-8 md:h-10 w-auto object-contain brightness-0 dark:invert transition-[filter] group-hover:brightness-100 group-hover:dark:invert-0"
              unoptimized
            />
          ) : (
            <span
              key={`${logo.name}-text`}
              className="text-xl md:text-2xl font-bold tracking-tight text-muted-foreground group-hover:text-foreground"
            >
              {logo.name}
            </span>
          );

          return logo.href ? (
            <a
              key={logo.name}
              href={logo.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex items-center justify-center grayscale hover:grayscale-0 transition-[filter] duration-300"
            >
              {logoContent}
            </a>
          ) : (
            <div
              key={logo.name}
              className="group relative flex items-center justify-center grayscale hover:grayscale-0 transition-[filter] duration-300"
            >
              {logoContent}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnimatedStatCounter({ stat }: { stat: Stat }) {
  // A simplified counting logic would go here. For robust 2026 SV best practices,
  // we either use framer-motion/useMotionValue or just render the final string gracefully
  // since scroll-triggered DOM modifications can be expensive. Let's render beautifully.
  return (
    <div className="flex flex-col items-center text-center p-6 lg:p-8">
      <div className="flex items-baseline gap-1 text-foreground font-bold tracking-tight mb-2">
        {stat.prefix && (
          <span className="text-2xl md:text-3xl lg:text-4xl text-[hsl(var(--primary))]">
            {stat.prefix}
          </span>
        )}
        <span className="text-4xl md:text-5xl lg:text-6xl">{stat.value}</span>
        {stat.suffix && (
          <span className="text-2xl md:text-3xl lg:text-4xl text-[hsl(var(--primary))]">
            {stat.suffix}
          </span>
        )}
      </div>
      <p className="text-sm md:text-base font-medium text-muted-foreground max-w-[200px]">
        {stat.label}
      </p>
    </div>
  );
}

export function SocialProof({
  locale: _locale = "en",
  logos = EMPTY_LOGOS,
  stats = EMPTY_STATS,
  variant = "combined",
  title,
  animateStats: _animateStats = true,
  className,
  id,
  density = "normal",
}: SocialProofProps) {
  const showLogos = (variant === "logos-only" || variant === "combined") && logos.length > 0;
  const showStats = (variant === "stats-only" || variant === "combined") && stats.length > 0;

  return (
    <section id={id} className={cn(socialProofVariants({ density, variant }), className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimateIn preset="fadeUp">
          <div className="mb-12 flex flex-col items-center gap-4 text-center">
            {title && (
              <p className="text-sm font-semibold tracking-widest uppercase text-muted-foreground">
                {title}
              </p>
            )}
          </div>
        </AnimateIn>

        <div className="flex flex-col gap-16 lg:gap-24">
          {showLogos && (
            <AnimateIn preset="fadeUp" delay={0.1}>
              <LogoCloud logos={logos} />
            </AnimateIn>
          )}

          {showStats && (
            <AnimateInGroup stagger="normal">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 divide-x divide-y md:divide-y-0 divide-border rounded-[var(--radius-3xl)] border border-border bg-muted/50 backdrop-blur-sm shadow-sm overflow-hidden">
                {stats.map((stat) => (
                  <AnimateIn key={getStatKey(stat)} preset="scale">
                    <AnimatedStatCounter stat={stat} />
                  </AnimateIn>
                ))}
              </div>
            </AnimateInGroup>
          )}
        </div>
      </div>
    </section>
  );
}

SocialProof.displayName = "SocialProof";
