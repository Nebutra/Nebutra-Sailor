import { CheckCircle as CheckCircle2, Eye } from "@nebutra/icons";
import { useTranslations } from "next-intl";

export function VrtCard() {
  const t = useTranslations("designSystem");

  return (
    <div className="relative flex h-full flex-col overflow-hidden p-6 md:p-8">
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-lg)] bg-primary/10 text-primary shrink-0">
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
      <div className="relative z-10 mt-auto flex h-[160px] w-full rounded-[var(--radius-xl)] border border-border/50 bg-black/5 overflow-hidden flex-col justify-center items-center group shadow-inner">
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-[var(--radius-lg)] mx-auto">
          {/* Left side (Base / Raw) */}
          <div className="absolute inset-y-0 left-0 w-1/2 flex items-center justify-center bg-background border-r border-border/50 overflow-hidden group-hover:w-[40%] transition-[width] duration-700 ease-in-out motion-reduce:transition-none z-10 flex-col gap-2">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
              V1.0
            </span>
            <button
              type="button"
              className="px-4 py-2 bg-muted/50 border-2 border-dashed border-red-500/30 text-muted-foreground rounded-[var(--radius-sm)] text-xs font-mono opacity-80 pointer-events-none scale-95 whitespace-nowrap"
            >
              {"<Button />"}
            </button>
          </div>

          {/* Laser Line Scanner */}
          <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-emerald-500/50 shadow-[0_0-[15px_15px]_rgba(16,185,129,0.3)] z-30 group-hover:left-[40%] transition-[left] duration-700 ease-in-out motion-reduce:transition-none flex flex-col items-center justify-center">
            {/* Glow dot on laser */}
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_8px_rgba(16,185,129,0.4)]" />
          </div>

          {/* Right side (Head / Polished) */}
          <div className="absolute inset-y-0 right-0 w-1/2 flex items-center justify-center bg-background/50 group-hover:w-[60%] transition-[width] duration-700 ease-in-out motion-reduce:transition-none z-20 flex-col gap-2">
            <span className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> V1.1
            </span>

            {/* Diff Highlight Overlay */}
            <div className="relative">
              <div className="absolute -inset-1.5 border border-emerald-500/40 bg-emerald-500/5 rounded-[var(--radius-xl)] border-dashed animate-pulse" />
              <button
                type="button"
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-bold border border-border pointer-events-none whitespace-nowrap relative z-10"
                style={{ boxShadow: "var(--ring-hairline)" }}
              >
                {"<Button />"}
              </button>
            </div>
          </div>

          {/* subtle grid background */}
          <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff22_1px,transparent_1px)] [background-size:16px_16px] z-0 opacity-40"></div>
        </div>
      </div>
    </div>
  );
}
