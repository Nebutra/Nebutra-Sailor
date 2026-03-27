import { AnimateIn } from "../AnimateIn";
import { ArrowRight } from "lucide-react";

interface FeatureBentoCardProps {
  categoryKey: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  mockup: React.ComponentType;
  features: readonly { titleKey: string; descKey: string }[];
  t: any;
}

export function FeatureBentoCard({
  categoryKey,
  icon: Icon,
  color,
  mockup: Mockup,
  features,
  t,
}: FeatureBentoCardProps) {
  return (
    <AnimateIn preset="fadeUp" className="h-full">
      <div className="group relative flex flex-col h-full w-full overflow-hidden rounded-[2rem] border border-border/60 dark:border-white/10 bg-background dark:bg-[#0A0A0B] transition-all duration-500 hover:border-foreground/20 dark:hover:border-white/20 hover:shadow-2xl dark:hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        {/* Subtle Ambient Background */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(#0000001a_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff1a_1px,transparent_1px)] [background-size:24px_24px] opacity-20 dark:opacity-5 pointer-events-none" />

        {/* Top Text Area - Vercel Style Minimal */}
        <div className="px-8 pt-10 sm:px-10 flex-none z-10 relative">
          <h2 className="text-[26px] sm:text-[32px] font-black tracking-tight text-foreground dark:text-white leading-tight">
            {t(`sections.${categoryKey}`)}
          </h2>
          <p className="mt-4 text-[15px] sm:text-base text-muted-foreground dark:text-zinc-400 font-medium leading-relaxed max-w-sm">
            {t(`sections.${features[0].descKey}`)}
          </p>

          <div className="mt-8 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full border border-border/50 dark:border-white/10 flex items-center justify-center text-muted-foreground group-hover:text-foreground group-hover:border-foreground dark:group-hover:text-white dark:group-hover:border-white transition-colors cursor-pointer bg-background/50 backdrop-blur-sm">
              <ArrowRight className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-muted-foreground group-hover:text-foreground dark:group-hover:text-white transition-colors">
              Explore feature
            </span>
          </div>
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
