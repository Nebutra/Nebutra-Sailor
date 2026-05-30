"use client";

import { GitCommit } from "@nebutra/icons";
import { cn } from "@nebutra/ui/utils";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";

export function PipelineCard() {
  const t = useTranslations("designSystem");
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="relative flex h-full flex-col overflow-hidden p-6 md:p-8">
      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 mb-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-lg)] bg-primary/10 text-primary">
          <GitCommit className="h-4 w-4" />
        </div>
        <h3 className="text-lg font-bold tracking-tight text-foreground line-clamp-1">
          {t("badge")}
        </h3>
      </div>

      {/* Vertical Pipeline Flow */}
      <div className="relative z-10 flex-1 w-full bg-background/40 rounded-[var(--radius-xl)] border border-border/50 p-4 xl:p-6 flex flex-col justify-between shadow-inner group">
        {/* Line down the middle */}
        <div className="absolute left-1/2 top-4 bottom-4 w-[2px] bg-gradient-to-b from-primary/10 via-primary/40 to-primary/10 -translate-x-1/2 rounded-full overflow-hidden">
          {!shouldReduceMotion && (
            <div className="absolute top-0 w-full h-1/4 bg-primary blur-[2px] -translate-y-full opacity-60 animate-[slide-down_3s_ease-in-out_infinite]" />
          )}
        </div>

        {/* Steps */}
        <PipelineStep
          icon="✨"
          label={t("flowBrand")}
          value="--primary: hex..."
          position="left"
          delay={0}
          reduceMotion={shouldReduceMotion}
        />
        <PipelineStep
          icon="📦"
          label={t("flowTokens")}
          value="data(scale)"
          position="right"
          delay={0.2}
          reduceMotion={shouldReduceMotion}
        />
        <PipelineStep
          icon="🎨"
          label={t("flowTheme")}
          value="color-mix(...)"
          position="left"
          delay={0.4}
          reduceMotion={shouldReduceMotion}
        />
        <PipelineStep
          icon="🧩"
          label={t("flowUI")}
          value="<Button />"
          position="right"
          delay={0.6}
          reduceMotion={shouldReduceMotion}
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
  reduceMotion,
}: {
  icon: string;
  label: string;
  value: string;
  position: "left" | "right";
  delay: number;
  reduceMotion: boolean | null;
}) {
  const isLeft = position === "left";
  return (
    <motion.div
      initial={reduceMotion ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 15, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={
        reduceMotion ? { duration: 0 } : { duration: 0.5, delay: 0.2 + delay, ease: "easeOut" }
      }
      className={cn(
        "flex w-full relative items-center z-20",
        isLeft ? "justify-start" : "justify-end",
      )}
    >
      <div className="absolute left-1/2 top-1/2 w-2.5 h-2.5 bg-background border-[2px] border-primary rounded-full -translate-x-1/2 -translate-y-1/2 z-10 shadow-[0_0_8px_rgba(var(--primary),0.8)] transition-all duration-150 hover:-translate-y-0.5 hover:opacity-80" />

      <div
        className={cn(
          "w-[44%] bg-background border border-border/50 rounded-[var(--radius-lg)] py-2 px-3 shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.2)] flex flex-col gap-1 transition-all hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden group/step",
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
    </motion.div>
  );
}
