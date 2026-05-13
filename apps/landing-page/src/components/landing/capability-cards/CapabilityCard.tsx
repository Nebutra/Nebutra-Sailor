"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

interface CapabilityCardProps {
  icon?: ReactNode;
  title: string;
  description: string;
  ctaText: string;
  ctaHref: string;
  children: ReactNode;
}

export function CapabilityCard({
  icon,
  title,
  description,
  ctaText,
  ctaHref,
  children,
}: CapabilityCardProps) {
  return (
    <article
      style={{ boxShadow: "var(--ring-hairline)" }}
      className="group relative flex flex-col h-full w-full overflow-hidden rounded-[var(--radius-card)] border border-[var(--neutral-6)] bg-background dark:bg-[var(--neutral-2)] transition-all duration-500 hover:border-foreground/20 dark:hover:border-white/20"
    >
      {/* Subtle Ambient Background */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(var(--overlay-faint)_1px,transparent_1px)] [background-size:24px_24px] opacity-20 dark:opacity-5 pointer-events-none" />

      {/* Top Text Area - Vercel Style Minimal */}
      <div className="px-8 pt-10 sm:px-10 flex-none z-10 relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center text-primary w-8 h-8">{icon}</div>
          <h3 className="text-[26px] sm:text-[32px] font-black tracking-tight text-foreground dark:text-white leading-tight">
            {title}
          </h3>
        </div>
        <p className="text-[15px] sm:text-base text-muted-foreground dark:text-zinc-400 font-medium leading-relaxed max-w-sm">
          {description}
        </p>

        <Link href={ctaHref} className="mt-8 flex items-center gap-3 w-fit group/link">
          <div className="h-8 w-8 rounded-full border border-border/50 dark:border-white/10 flex items-center justify-center text-muted-foreground group-hover/link:text-foreground group-hover/link:border-foreground dark:group-hover/link:text-white dark:group-hover/link:border-white transition-colors cursor-pointer bg-background/50 backdrop-blur-sm">
            <span className="text-current shadow-none">
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
          <span className="text-sm font-semibold text-muted-foreground group-hover/link:text-foreground dark:group-hover/link:text-white transition-colors">
            {ctaText}
          </span>
        </Link>
      </div>

      {/* Bottom Graphic Area - Vercel Bleed */}
      <div className="flex-1 w-full relative flex items-end justify-center px-6 sm:px-10 mt-4 overflow-hidden z-10">
        <div className="relative w-full flex justify-center h-full items-end">{children}</div>
      </div>
    </article>
  );
}
