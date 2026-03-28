import { BookOpen, TerminalSquare } from "lucide-react";
import { useTranslations } from "next-intl";

export function InteractiveDocsCard() {
  const t = useTranslations("designSystem");

  return (
    <div className="relative flex h-full flex-col overflow-hidden p-6 md:p-8">
      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 mb-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <BookOpen className="h-4 w-4" />
        </div>
        <h3 className="text-lg font-bold tracking-tight text-foreground">{t("card5Title")}</h3>
      </div>

      {/* Docs Mockup */}
      <div className="relative z-10 mt-auto flex h-[200px] w-full mt-4 rounded-xl border border-border/50 bg-background/50 shadow-sm overflow-hidden group">
        {/* Sidebar */}
        <div className="w-1/3 border-r border-border/50 bg-muted/30 p-3 hidden sm:flex flex-col gap-2">
          <div className="h-2 w-16 bg-muted-foreground/30 rounded-full mb-2" />
          <div className="h-2.5 w-full bg-primary/20 rounded-sm relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 w-1 bg-primary rounded-l-sm" />
          </div>
          <div className="h-2 w-5/6 bg-muted rounded-full hover:bg-muted-foreground/20 cursor-pointer transition-colors" />
          <div className="h-2 w-4/6 bg-muted rounded-full hover:bg-muted-foreground/20 cursor-pointer transition-colors" />
          <div className="h-2 w-full bg-muted rounded-full mt-2 hover:bg-muted-foreground/20 cursor-pointer transition-colors" />
          <div className="h-2 w-3/4 bg-muted rounded-full hover:bg-muted-foreground/20 cursor-pointer transition-colors" />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-background p-4 flex flex-col gap-3 relative">
          <div className="h-3 w-32 bg-foreground/80 rounded" />
          <div className="h-2 w-full bg-muted rounded-full" />
          <div className="h-2 w-5/6 bg-muted rounded-full" />

          {/* Code Block Mockup */}
          <div className="mt-2 rounded-lg bg-zinc-950 p-3 w-[110%] sm:w-full shadow-inner border border-zinc-800 font-mono transition-transform ease-out group-hover:-translate-y-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-1.5">
                <div className="h-2 w-2 rounded-full bg-red-500/80" />
                <div className="h-2 w-2 rounded-full bg-yellow-500/80" />
                <div className="h-2 w-2 rounded-full bg-green-500/80" />
              </div>
              <TerminalSquare className="w-3 h-3 text-zinc-500" />
            </div>
            <div className="text-[10px] text-zinc-300 leading-relaxed font-light mt-1 opacity-90">
              <span className="text-pink-400">export const</span>{" "}
              <span className="text-blue-200">Button</span> ={" "}
              <span className="text-yellow-200">cva</span>(<br />
              &nbsp;&nbsp;<span className="text-green-300">"inline-flex font-medium"</span>,<br />
              &nbsp;&nbsp;&#123; variants: &#123; <span className="text-blue-300">size</span>: ...
              &#125; &#125;
              <br />
              );
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
