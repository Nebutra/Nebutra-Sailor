import { AnimateIn } from "../AnimateIn";

interface FeatureSmallCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

export function FeatureSmallCard({ icon: Icon, title, description }: FeatureSmallCardProps) {
  return (
    <AnimateIn preset="fadeUp" className="h-full">
      <div
        className="group relative h-full w-full overflow-hidden rounded-[var(--radius-card)] border border-[var(--neutral-6)] bg-background/40 backdrop-blur-md p-8 transition-transform duration-150 hover:bg-muted/20 hover:border-border/80 hover:-translate-y-px"
        style={{ boxShadow: "var(--ring-hairline)" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Icon className="h-5 w-5 text-primary opacity-80" />
          <h3 className="relative z-10 text-lg font-bold tracking-tight text-foreground">
            {title}
          </h3>
        </div>
        <p className="relative z-10 text-sm leading-relaxed text-muted-foreground font-medium group-hover:text-foreground transition-colors duration-300">
          {description}
        </p>
      </div>
    </AnimateIn>
  );
}
