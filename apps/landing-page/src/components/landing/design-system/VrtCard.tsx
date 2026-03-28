import { CheckCircle2, Eye } from "lucide-react";
import { useTranslations } from "next-intl";

export function VrtCard() {
  const t = useTranslations("designSystem");

  return (
    <div className="relative flex h-full flex-col overflow-hidden p-6 md:p-8">
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            <Eye className="h-4 w-4" />
          </div>
          <h3 className="text-lg font-bold tracking-tight text-foreground line-clamp-1">
            {t("card3Title")}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-xs font-semibold border border-emerald-500/20 shadow-sm shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Passed</span>
        </div>
      </div>

      {/* VRT Slider Mockup */}
      <div className="relative z-10 mt-auto flex h-[160px] w-full rounded-xl border border-border/50 bg-black/5 dark:bg-white/5 overflow-hidden flex-col justify-center items-center group shadow-inner">
        <div className="relative w-[90%] md:w-full h-full flex items-center justify-center overflow-hidden rounded-lg mx-auto">
          {/* Left side (Base) */}
          <div className="absolute inset-y-0 left-0 w-1/2 flex items-center justify-center bg-background border-r-2 border-primary/50 overflow-hidden group-hover:w-[30%] transition-all duration-700 ease-in-out z-10">
            <button className="px-5 py-2.5 bg-primary/80 text-primary-foreground rounded-md text-sm font-semibold opacity-60 pointer-events-none scale-[0.98] whitespace-nowrap">
              V1.0 Button
            </button>
          </div>

          {/* Laser Line Scanner */}
          <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-primary shadow-[0_0-[15px_15px]_rgba(var(--primary),0.8)] z-30 group-hover:left-[30%] transition-all duration-700 ease-in-out">
            {/* Glow dot on laser */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_10px_10px_rgba(var(--primary),0.6)]" />
          </div>

          {/* Right side (Head) */}
          <div className="absolute inset-y-0 right-0 w-1/2 flex items-center justify-center bg-background group-hover:w-[70%] transition-all duration-700 ease-in-out z-20">
            {/* New improved button */}
            <button className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold shadow-lg shadow-primary/20 pointer-events-none hover:bg-primary/90 whitespace-nowrap scale-[1.02]">
              V1.1 Button
            </button>
          </div>

          {/* subtle grid background */}
          <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff22_1px,transparent_1px)] [background-size:16px_16px] z-0 opacity-40"></div>
        </div>
      </div>
    </div>
  );
}
