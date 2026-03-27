import { AnimateIn } from "@nebutra/ui/components";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "@/i18n/navigation";

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
      <div className="group relative flex flex-col h-full w-full overflow-hidden rounded-[2.5rem] border border-border/50 bg-background/50 backdrop-blur-md transition-all duration-500 hover:border-border/80 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1">
        {/* Subtle Gradient Hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none z-0" />

        {/* Synthetic Mockup Top Half */}
        <div className="h-64 sm:h-72 w-full bg-muted/30 border-b border-border/50 overflow-hidden relative flex items-center justify-center p-6 z-10">
          <Mockup />
        </div>

        {/* Content Bottom Half */}
        <div className="p-8 sm:p-10 flex-grow flex flex-col z-10 bg-background/80">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-xl bg-background border border-border/50 shadow-sm shrink-0">
              <Icon className="h-6 w-6" style={{ color }} />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {t(`sections.${categoryKey}`)}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 mt-4">
            {features.map((f) => (
              <div key={f.titleKey} className="flex gap-3 items-start">
                <CheckCircle2 className="h-4 w-4 mt-1 text-primary shrink-0 drop-shadow-sm" />
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-bold text-foreground">
                    {t(`sections.${f.titleKey}`)}
                  </span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t(`sections.${f.descKey}`)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer / CTA / Tech Strip */}
          <div className="mt-10 pt-6 border-t border-border/40 mt-auto flex items-center justify-between">
            <Link
              href="/docs"
              className="text-sm font-bold text-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
            >
              Explore documentation <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </AnimateIn>
  );
}
