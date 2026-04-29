import { ArrowRight } from "lucide-react";
import type { ComponentType, CSSProperties } from "react";
import { AnimateIn } from "../AnimateIn";

interface FeatureBentoCardProps {
  href: string;
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  color: string;
  mockup: ComponentType;
  title: string;
  description: string;
  ctaLabel: string;
}

export function FeatureBentoCard({
  href,
  icon: _Icon,
  color: _color,
  mockup: Mockup,
  title,
  description,
  ctaLabel,
}: FeatureBentoCardProps) {
  return (
    <AnimateIn preset="fadeUp" className="h-full">
      <div className="group relative flex h-full w-full flex-col overflow-hidden rounded-[2rem] border border-border/60 bg-background transition-all duration-500 hover:border-foreground/20 hover:shadow-2xl dark:bg-background dark:hover:border-border dark:hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        {/* Subtle Ambient Background */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(#0000001a_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff1a_1px,transparent_1px)] [background-size:24px_24px] opacity-20 dark:opacity-5 pointer-events-none" />

        {/* Top Text Area - Vercel Style Minimal */}
        <div className="px-8 pt-10 sm:px-10 flex-none z-10 relative">
          <h2 className="text-[26px] sm:text-[32px] font-black tracking-tight text-foreground dark:text-white leading-tight">
            {title}
          </h2>
          <p className="mt-4 text-[15px] sm:text-base text-muted-foreground dark:text-zinc-400 font-medium leading-relaxed max-w-sm">
            {description}
          </p>

          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="group/link mt-8 flex w-fit items-center gap-3 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label={`${ctaLabel}: ${title}`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border/50 bg-background/50 text-muted-foreground backdrop-blur-sm transition-colors group-hover/link:border-foreground group-hover/link:text-foreground dark:border-border dark:group-hover/link:border-border dark:group-hover/link:text-white">
              <ArrowRight className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold text-muted-foreground transition-colors group-hover/link:text-foreground dark:group-hover/link:text-white">
              {ctaLabel}
            </span>
          </a>
        </div>

        {/* Bottom Graphic Area - Vercel Bleed */}
        <div className="flex-1 w-full relative flex items-end justify-center px-6 sm:px-10 mt-6 overflow-hidden z-10">
          <div className="relative w-full flex justify-center">
            <Mockup />
          </div>
        </div>
      </div>
    </AnimateIn>
  );
}
