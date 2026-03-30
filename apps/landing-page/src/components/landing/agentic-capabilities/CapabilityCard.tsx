import type { CapabilityData } from "./data";

interface CapabilityCardProps {
  card: CapabilityData;
  title: string;
  description: string;
}

/**
 * Individual capability card with icon, terminal status line and hover spotlight.
 */
export function CapabilityCard({ card, title, description }: CapabilityCardProps) {
  const Icon = card.icon;

  return (
    <div className="relative group bg-background/95 backdrop-blur-md p-8 md:p-10 transition-all duration-300 hover:bg-muted/20 flex flex-col items-start text-left overflow-hidden min-h-[300px]">
      {/* Hover corner spotlight */}
      <div
        className="absolute -top-20 -right-20 w-52 h-52 rounded-full blur-[60px] opacity-0 group-hover:opacity-25 transition-opacity duration-700 pointer-events-none z-0"
        style={{ backgroundColor: card.accent }}
      />

      {/* Icon */}
      <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/50 bg-background shadow-sm mb-8 transition-transform duration-300 group-hover:scale-110 group-hover:shadow-md">
        <Icon className="h-6 w-6" style={{ color: card.accent }} />
      </div>

      {/* Title */}
      <h3 className="relative z-10 text-[20px] md:text-[22px] font-bold tracking-tight text-foreground mb-3 leading-snug">
        {title}
      </h3>

      {/* Description */}
      <p className="relative z-10 text-[15px] text-muted-foreground font-medium leading-[1.7] mb-8 flex-1">
        {description}
      </p>

      {/* Terminal system status line */}
      <div className="relative z-10 w-full mt-auto">
        <div className="w-full rounded-lg border border-white/10 dark:border-white/5 bg-zinc-950/90 px-3 py-2 group-hover:border-white/15 transition-colors">
          <code className="block font-mono text-[10px] sm:text-[11px] text-zinc-500 group-hover:text-zinc-400 transition-colors leading-relaxed truncate">
            <span className="text-zinc-600 mr-1.5 select-none">›</span>
            {card.statusLine}
          </code>
        </div>
      </div>
    </div>
  );
}

CapabilityCard.displayName = "CapabilityCard";
