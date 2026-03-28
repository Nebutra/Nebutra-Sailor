import { Droplet } from "lucide-react";
import { useTranslations } from "next-intl";

export function ThemeSelectorCard() {
  const t = useTranslations("designSystem");

  return (
    <div className="relative flex h-full flex-col overflow-hidden p-6 md:p-8">
      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 mb-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Droplet className="h-4 w-4" />
        </div>
        <h3 className="text-lg font-bold tracking-tight text-foreground line-clamp-1">
          {t("card2Title")}
        </h3>
      </div>

      {/* Theme Selector UI Mockup */}
      <div className="relative z-10 mt-auto flex h-[180px] w-full rounded-xl border border-border/50 bg-background shadow-sm overflow-hidden p-3 gap-3 group">
        {/* Code snippet side */}
        <div className="w-[45%] h-full rounded-lg bg-zinc-950 p-3 lg:p-4 font-mono text-[9px] sm:text-[10px] leading-relaxed overflow-hidden hidden sm:block relative transition-transform duration-500 group-hover:bg-zinc-900 border border-zinc-900 shadow-inner">
          <span className="text-blue-400">const</span>{" "}
          <span className="text-zinc-300">themes = &#123;</span>
          <br />
          &nbsp;&nbsp;<span className="text-emerald-300">emerald</span>
          <span className="text-zinc-300">: &#123;</span>
          <br />
          &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-purple-300">"--primary"</span>:{" "}
          <span className="text-green-300">"oklch(0.65 0.15 150)"</span>,<br />
          &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-purple-300">"--muted"</span>:{" "}
          <span className="text-green-300">"color-mix(...)"</span>
          <br />
          &nbsp;&nbsp;<span className="text-zinc-300">&#125;,</span>
          <br />
          &nbsp;&nbsp;<span className="text-violet-300">violet</span>
          <span className="text-zinc-300">: &#123; ... &#125;</span>
          <br />
          <span className="text-zinc-300">&#125;;</span>
          {/* Soft highlight gradient from bottom right */}
          <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-emerald-500/20 blur-xl rounded-full" />
        </div>

        {/* Preview UI side */}
        <div className="flex-1 flex flex-col gap-2 relative h-full">
          {/* Theme pills */}
          <div className="flex gap-1.5 p-1.5 rounded-full bg-muted/40 w-fit ring-1 ring-border/50 shadow-inner overflow-x-auto scrollbar-hide">
            {/* Emerald (Active) */}
            <div className="h-4 w-4 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] ring-2 ring-emerald-500/30 transition-transform scale-110 cursor-pointer" />
            {/* Violet */}
            <div className="h-4 w-4 rounded-full bg-violet-500 opacity-40 hover:opacity-100 hover:scale-110 transition-all cursor-pointer" />
            {/* Blue */}
            <div className="h-4 w-4 rounded-full bg-blue-500 opacity-40 hover:opacity-100 hover:scale-110 transition-all cursor-pointer" />
            {/* Rose */}
            <div className="h-4 w-4 rounded-full bg-rose-500 opacity-40 hover:opacity-100 hover:scale-110 transition-all cursor-pointer" />
          </div>

          {/* Mini dashboard Dashboard preview */}
          <div className="flex-1 bg-background rounded-lg border border-border bg-gradient-to-br from-emerald-500/5 to-transparent shadow-sm p-3 flex flex-col gap-3 relative overflow-hidden transition-colors duration-500">
            {/* Dashboard Header */}
            <div className="flex justify-between items-center relative z-10">
              <div className="flex flex-col gap-1">
                <div className="h-2 w-16 bg-muted-foreground/30 rounded-full" />
                <div className="h-1.5 w-10 bg-muted rounded-full" />
              </div>
              <div className="h-[14px] px-1.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded text-[8px] font-bold flex items-center justify-center">
                Active
              </div>
            </div>

            {/* Dashboard Content */}
            <div className="grid grid-cols-2 gap-2 mt-auto relative z-10 h-[50%]">
              {/* Chart Block 1 */}
              <div className="h-full rounded bg-emerald-500/90 shadow-inner flex flex-col justify-end p-1.5 items-end gap-0.5 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                <div className="font-mono text-[8px] text-white/90 z-10 font-bold tracking-tighter">
                  84%
                </div>
              </div>
              {/* Chart Block 2 */}
              <div className="h-full rounded bg-muted/30 border border-border/50 flex flex-col gap-1 justify-end items-center p-1 relative overflow-hidden">
                {/* Bars */}
                <div className="flex gap-1 items-end w-full h-[80%] px-1">
                  <div className="w-1/3 bg-emerald-500/40 rounded-t-sm h-[40%] group-hover:h-[50%] transition-all duration-500" />
                  <div className="w-1/3 bg-emerald-500/60 rounded-t-sm h-[70%] group-hover:h-[80%] transition-all duration-500 delay-75" />
                  <div className="w-1/3 bg-emerald-500/90 rounded-t-sm h-[90%] group-hover:h-[100%] transition-all duration-500 delay-150 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
