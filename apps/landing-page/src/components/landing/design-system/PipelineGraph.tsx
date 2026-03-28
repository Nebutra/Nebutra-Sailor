import { cn } from "@nebutra/ui/utils";
import { useTranslations } from "next-intl";

export function PipelineGraph() {
  const t = useTranslations("designSystem");

  return (
    <div className="flex flex-col items-center justify-center w-full h-full py-8 md:py-12 group">
      {/* Badge */}
      <div className="inline-flex items-center justify-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-6 opacity-0 translate-y-2 animate-[fade-in_0.5s_ease-out_forwards]">
        <span className="text-sm font-semibold text-primary tracking-wide uppercase">
          {t("badge")}
        </span>
      </div>

      {/* Central Title */}
      <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-foreground text-center text-balance opacity-0 translate-y-4 animate-[fade-in_0.7s_ease-out_0.2s_forwards]">
        {t("headline")}
      </h2>
      <p className="mt-4 md:mt-6 text-sm md:text-lg text-muted-foreground text-center max-w-xl text-balance opacity-0 translate-y-4 animate-[fade-in_0.7s_ease-out_0.4s_forwards]">
        {t("subheadline")}
      </p>

      {/* Graphical Pipeline Line */}
      <div className="mt-16 md:mt-24 flex items-center justify-center gap-2 md:gap-4 lg:gap-8 w-full relative opacity-0 animate-[fade-in_1s_ease-out_0.6s_forwards]">
        {/* Background connecting laser line */}
        <div className="absolute top-1/2 left-[5%] right-[5%] h-[2px] bg-border -z-20 rounded-full overflow-hidden">
          {/* Animated scanning light in the conduit */}
          <div className="absolute top-0 bottom-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-primary to-transparent opacity-80 animate-[slide-right_3s_ease-in-out_infinite]" />
        </div>
        <div className="absolute top-1/2 left-[5%] right-[5%] h-[4px] bg-primary/20 blur-[6px] -z-10" />

        <Node label={t("flowBrand")} delay={0} icon="✨" active />
        <Arrow text="--primary: hex..." delay={0.2} />

        <Node label={t("flowTokens")} delay={0.4} icon="📦" />
        <Arrow text="data()" delay={0.6} active />

        <Node label={t("flowTheme")} delay={0.8} icon="🎨" highlight />
        <Arrow text="color-mix(...)" delay={1.0} />

        <Node label={t("flowUI")} delay={1.2} icon="🧩" />
      </div>
    </div>
  );
}

function Node({
  label,
  active,
  highlight,
  delay,
  icon,
}: {
  label: string;
  active?: boolean;
  highlight?: boolean;
  delay: number;
  icon?: string;
}) {
  return (
    <div
      className={cn(
        "px-3 py-1.5 md:px-5 md:py-2.5 text-xs md:text-sm font-bold rounded-full border backdrop-blur-md whitespace-nowrap shadow-sm transition-all duration-300 relative flex items-center gap-1.5 z-10 cursor-default",
        highlight
          ? "border-primary/80 ring-4 ring-primary/15 text-primary shadow-[0_0_20px_rgba(var(--primary),0.3)] scale-[1.05] bg-background/90"
          : "border-border/60 text-foreground bg-background/80 hover:border-black/20 dark:hover:border-white/20 hover:scale-105",
        active && !highlight ? "bg-primary/5 border-primary/30" : "",
      )}
      style={{
        animation: `fade-in-up 0.5s ease-out ${0.8 + delay}s both`,
      }}
    >
      {/* Inner glow on hover */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
      {icon && <span className="opacity-80 text-[10px] md:text-xs">{icon}</span>}
      <span className="relative z-10">{label}</span>
    </div>
  );
}

function Arrow({ text, delay, active }: { text?: string; delay: number; active?: boolean }) {
  return (
    <div
      className="flex flex-col items-center justify-center relative min-w-[20px] md:min-w-[50px] lg:min-w-[80px]"
      style={{
        animation: `fade-in 0.5s ease-out ${0.8 + delay}s both`,
      }}
    >
      <div
        className={cn(
          "h-[2px] w-full rounded-full transition-colors",
          active ? "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.6)]" : "bg-primary/30",
        )}
      />
      {/* Arrow head */}
      <div
        className={cn(
          "absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 border-t-[2px] border-r-[2px] rotate-45 transition-colors",
          active ? "border-primary" : "border-primary/50",
        )}
      />

      {text && (
        <span className="absolute -top-6 text-[8px] md:text-[10px] font-mono text-muted-foreground whitespace-nowrap tracking-wider hidden sm:block bg-background/50 backdrop-blur-sm px-1.5 py-0.5 rounded shadow-sm border border-border/30 z-20">
          {text}
        </span>
      )}
    </div>
  );
}
