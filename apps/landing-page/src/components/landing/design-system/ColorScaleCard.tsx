import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import { Layers } from "lucide-react";
import { useTranslations } from "next-intl";

export function ColorScaleCard() {
  const t = useTranslations("designSystem");

  // 12 steps for the semantic scale
  const steps = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="relative flex h-full flex-col overflow-hidden p-6 md:p-8 group">
      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 mb-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Layers className="h-4 w-4" />
        </div>
        <h3 className="text-lg font-bold tracking-tight text-foreground">{t("card1Title")}</h3>
      </div>

      {/* Visualizer Scale Stack */}
      <div className="relative z-10 flex flex-1 flex-col justify-center gap-1.5 mt-auto">
        <TooltipProvider delayDuration={100}>
          {steps.map((step) => {
            const isDark = step >= 8;
            return (
              <Tooltip key={step}>
                <TooltipTrigger asChild>
                  <div
                    className="relative flex h-7 sm:h-8 lg:h-7 xl:h-8 w-[85%] items-center rounded-md px-3 cursor-pointer transition-all duration-300 hover:w-full hover:shadow-md border border-black/5 dark:border-white/5"
                    style={{
                      backgroundColor: `var(--neutral-${step})`,
                    }}
                  >
                    <span
                      className={cn(
                        "text-[10px] font-mono select-none",
                        isDark ? "text-white/60" : "text-black/40",
                      )}
                    >
                      {step}
                    </span>

                    {/* Fake token tag on hover via CSS group equivalent */}
                    <div className="absolute right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 pointer-events-none hidden md:flex">
                      <span
                        className={cn(
                          "text-[9px] font-mono px-1.5 py-0.5 rounded",
                          isDark ? "bg-white/20 text-white" : "bg-black/10 text-black",
                        )}
                      >
                        semantic-{step}
                      </span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-mono text-xs">
                  <span className="text-muted-foreground mr-2">Variable</span>
                  <span className="text-foreground font-semibold">geist-scale-{step}</span>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>

      {/* Decorative background glow */}
      <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-primary/5 blur-[80px]" />
    </div>
  );
}
