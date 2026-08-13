"use client";

import { GitCommit } from "@nebutra/icons";
import { cn } from "@nebutra/ui/utils";
import { useTranslations } from "next-intl";
import { AnimateIn } from "../AnimateIn";

export function PipelineCard() {
  const t = useTranslations("designSystem");

  return (
    <div className="relative flex h-full flex-col overflow-hidden p-6 md:p-8">
      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 mb-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-lg)] bg-primary/10 text-primary">
          <GitCommit className="h-4 w-4" />
        </div>
        <h3 className="text-lg font-bold tracking-tight text-foreground line-clamp-1">
          {t("card6Title")}
        </h3>
      </div>

      {/* Vertical Pipeline Flow */}
      <div className="relative z-10 flex-1 w-full bg-background/40 rounded-[var(--radius-xl)] border border-border/50 p-4 xl:p-6 flex flex-col justify-between shadow-inner group">
        {/* Line down the middle */}
        <div className="absolute left-1/2 top-4 bottom-4 w-[2px] bg-gradient-to-b from-primary/10 via-primary/40 to-primary/10 -translate-x-1/2 rounded-full overflow-hidden">
          {/* Already a CSS animation — the JS guard around it was doing what
              motion-reduce: does, one library heavier. */}
          <div className="-translate-y-full absolute top-0 h-1/4 w-full animate-[slide-down_3s_ease-in-out_infinite] bg-primary opacity-60 blur-[2px] motion-reduce:animate-none" />
        </div>

        {/* Steps */}
        <PipelineStep
          icon="✨"
          label={t("flowBrand")}
          value="--primary: hex..."
          position="left"
          delay={0}
        />
        <PipelineStep
          icon="📦"
          label={t("flowTokens")}
          value="data(scale)"
          position="right"
          delay={0.2}
        />
        <PipelineStep
          icon="🎨"
          label={t("flowTheme")}
          value="color-mix(...)"
          position="left"
          delay={0.4}
        />
        <PipelineStep
          icon="🧩"
          label={t("flowUI")}
          value="<Button />"
          position="right"
          delay={0.6}
        />
      </div>
    </div>
  );
}

function PipelineStep({
  icon,
  label,
  value,
  position,
  delay,
}: {
  icon: string;
  label: string;
  value: string;
  position: "left" | "right";
  delay: number;
}) {
  const isLeft = position === "left";
  return (
    <AnimateIn
      className={cn(
        "relative z-20 flex w-full items-center",
        isLeft ? "justify-start" : "justify-end",
      )}
      delay={0.2 + delay}
      inView
      preset="scale"
    >
      <div className="absolute left-1/2 top-1/2 w-2.5 h-2.5 bg-background border-[2px] border-primary rounded-full -translate-x-1/2 -translate-y-1/2 z-10 shadow-[0_0_10px_hsl(var(--primary)/0.4)] transition-[opacity,transform] duration-150 hover:-translate-y-0.5 hover:opacity-80 motion-reduce:hover:-translate-y-1/2" />

      <div
        className={cn(
          "w-[44%] bg-background border border-border/50 rounded-[var(--radius-lg)] py-2 px-3 shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.2)] flex flex-col gap-1 transition-[border-color,box-shadow,transform] hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 relative overflow-hidden group/step",
          isLeft ? "items-end text-right" : "items-start text-left",
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover/step:opacity-100 transition-opacity" />

        <div
          className={cn(
            "flex items-center gap-1.5 relative z-10",
            isLeft ? "flex-row-reverse" : "flex-row",
          )}
        >
          <span className="text-[10px] sm:text-xs">{icon}</span>
          <span className="text-xs font-bold text-foreground truncate max-w-full">{label}</span>
        </div>

        <div className="font-mono text-[9.5px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded border border-border/30 relative z-10 line-clamp-1 w-fit max-w-full truncate">
          {value}
        </div>
      </div>
    </AnimateIn>
  );
}
