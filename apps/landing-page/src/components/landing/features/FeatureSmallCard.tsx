import { AnimateIn } from "../AnimateIn";

interface FeatureSmallCardProps {
  icon: React.ComponentType<{ className?: string }>;
  titleKey: string;
  descKey: string;
  t: any;
}

export function FeatureSmallCard({ icon: Icon, titleKey, descKey, t }: FeatureSmallCardProps) {
  return (
    <AnimateIn preset="fadeUp" className="h-full">
      <div className="group relative h-full w-full overflow-hidden rounded-3xl border border-border/40 bg-background/40 backdrop-blur-md p-8 transition-all duration-300 hover:bg-muted/20 hover:border-border/80 hover:shadow-xl hover:-translate-y-1">
        <div className="flex items-center gap-3 mb-4">
          <Icon className="h-5 w-5 text-primary opacity-80" />
          <h3 className="relative z-10 text-lg font-bold tracking-tight text-foreground">
            {t(`sections.${titleKey}`)}
          </h3>
        </div>
        <p className="relative z-10 text-sm leading-relaxed text-muted-foreground font-medium group-hover:text-foreground transition-colors duration-300">
          {t(`sections.${descKey}`)}
        </p>
      </div>
    </AnimateIn>
  );
}
