import { Droplet } from "@nebutra/icons";
import { useTranslations } from "next-intl";

/**
 * Everything below the header is an illustration of a theme picker — swatches,
 * a fake dashboard, syntax colours. None of it reports product state, so it
 * uses the registered decorative ramp (200/700/900), not the status tokens:
 * painting a mockup with --success would make it read as a live health signal.
 * The ramp inverts per theme, so no `dark:` twins are needed.
 */
const syntaxClassNames = {
  keyword: "text-[hsl(var(--primary))]",
  string: "text-green-900",
  symbol: "text-[var(--brand-tertiary)]",
} as const;

const swatches = [
  "bg-green-700 shadow-[0_0_8px_color-mix(in_oklch,var(--color-green-700)_45%,transparent)] ring-green-700/30 scale-110",
  "bg-[var(--brand-tertiary)] opacity-40 hover:opacity-100",
  "bg-[hsl(var(--primary))] opacity-40 hover:opacity-100",
  "bg-red-700 opacity-40 hover:opacity-100",
] as const;

export function ThemeSelectorCard() {
  const t = useTranslations("designSystem");

  return (
    <div className="relative flex h-full flex-col overflow-hidden p-6 md:p-8">
      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 mb-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-lg)] bg-primary/10 text-primary">
          <Droplet className="h-4 w-4" />
        </div>
        <h3 className="text-lg font-bold tracking-tight text-foreground line-clamp-1">
          {t("card2Title")}
        </h3>
      </div>

      {/* Theme Selector UI Mockup */}
      <div className="relative z-10 mt-auto flex h-[180px] w-full rounded-[var(--radius-xl)] border border-border/50 bg-background shadow-sm overflow-hidden p-3 gap-3 group">
        {/* Code snippet side */}
        <div className="w-[45%] h-full rounded-[var(--radius-lg)] bg-background p-3 lg:p-4 font-mono text-[9px] sm:text-[10px] leading-relaxed overflow-hidden hidden sm:block relative transition-colors duration-500 group-hover:bg-muted/30 border border-border/60 shadow-sm">
          <span className={syntaxClassNames.keyword}>const</span>{" "}
          <span className="text-foreground">themes = &#123;</span>
          <br />
          &nbsp;&nbsp;<span className={syntaxClassNames.string}>emerald</span>
          <span className="text-foreground">: &#123;</span>
          <br />
          &nbsp;&nbsp;&nbsp;&nbsp;
          <span className={syntaxClassNames.symbol}>"--primary"</span>:{" "}
          <span className={syntaxClassNames.string}>"oklch(0.65 0.15 150)"</span>,
          <br />
          &nbsp;&nbsp;&nbsp;&nbsp;
          <span className={syntaxClassNames.symbol}>"--muted"</span>:{" "}
          <span className={syntaxClassNames.string}>"color-mix(...)"</span>
          <br />
          &nbsp;&nbsp;<span className="text-foreground">&#125;,</span>
          <br />
          &nbsp;&nbsp;<span className={syntaxClassNames.symbol}>violet</span>
          <span className="text-foreground">: &#123; ... &#125;</span>
          <br />
          <span className="text-foreground">&#125;;</span>
          {/* Soft highlight gradient from bottom right */}
          <div className="absolute -bottom-4 -right-4 h-16 w-16 rounded-full bg-green-200 blur-xl" />
        </div>

        {/* Preview UI side */}
        <div className="flex-1 flex flex-col gap-2 relative h-full">
          {/* Theme pills */}
          <div className="flex gap-1.5 p-1.5 rounded-full bg-muted/40 w-fit ring-1 ring-border/50 shadow-inner overflow-x-auto scrollbar-hide">
            {swatches.map((className) => (
              <div
                key={className}
                className={`h-4 w-4 cursor-pointer rounded-full transition-transform duration-150 hover:-translate-y-px ${className}`}
              />
            ))}
          </div>

          {/* Mini dashboard Dashboard preview */}
          <div className="flex-1 bg-background rounded-[var(--radius-lg)] border border-border bg-gradient-to-br from-green-200/70 to-transparent shadow-sm p-3 flex flex-col gap-3 relative overflow-hidden transition-colors duration-500">
            {/* Dashboard Header */}
            <div className="flex justify-between items-center relative z-10">
              <div className="flex flex-col gap-1">
                <div className="h-2 w-16 bg-muted-foreground/30 rounded-full" />
                <div className="h-1.5 w-10 bg-muted rounded-full" />
              </div>
              <div className="flex h-[14px] items-center justify-center rounded bg-green-200 px-1.5 text-[8px] font-bold text-green-900">
                Active
              </div>
            </div>

            {/* Dashboard Content */}
            <div className="grid grid-cols-2 gap-2 mt-auto relative z-10 h-[50%]">
              {/* Chart Block 1 */}
              {/* -900 fill with -200 text: the ramp inverts per theme, so this
                  pair stays legible in both (5.2:1 light, 8.3:1 dark). */}
              <div className="relative flex h-full flex-col items-end justify-end gap-0.5 overflow-hidden rounded bg-green-900 p-1.5 shadow-inner">
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                <div
                  className="font-mono text-[8px] text-green-200 z-10 font-bold"
                  style={{ letterSpacing: "var(--tracking-tight)" }}
                >
                  84%
                </div>
              </div>
              {/* Chart Block 2 */}
              <div className="h-full rounded bg-muted/30 border border-border/50 flex flex-col gap-1 justify-end items-center p-1 relative overflow-hidden">
                {/* Bars */}
                <div className="flex gap-1 items-end w-full h-[80%] px-1">
                  <div className="h-[40%] w-1/3 rounded-t-sm bg-green-700/45 transition-[height] duration-500 group-hover:h-[50%] motion-reduce:transition-none" />
                  <div className="h-[70%] w-1/3 rounded-t-sm bg-green-700/70 transition-[height] delay-75 duration-500 group-hover:h-[80%] motion-reduce:transition-none" />
                  <div className="h-[90%] w-1/3 rounded-t-sm bg-green-900 shadow-[0_0_5px_color-mix(in_oklch,var(--color-green-700)_45%,transparent)] transition-[height] delay-150 duration-500 group-hover:h-[100%] motion-reduce:transition-none" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
