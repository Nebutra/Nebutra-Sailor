"use client";

import { Box, Layout as LayoutDashboard, Lightning as Zap } from "@nebutra/icons";
import { Badge, Button } from "@nebutra/ui/primitives";

export function ZIndexDemo() {
  return (
    <div className="w-full my-6 rounded-xl border border-fd-border overflow-hidden bg-zinc-50 dark:bg-zinc-950/50">
      <div className="p-4 border-b border-fd-border font-medium text-sm">
        Marketing Z-Index Scale Visualization
      </div>
      <div className="p-8 md:p-12 pl-12 md:pl-24 h-[400px] flex items-center relative overflow-hidden">
        <div
          className="absolute left-8 md:left-24 top-20 bottom-20 right-8 md:right-24 bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-2xl shadow-sm text-zinc-500 dark:text-zinc-400 p-6 flex flex-col justify-end transition-transform hover:-translate-y-1 motion-reduce:hover:translate-y-0 hover:shadow-md cursor-default z-[0]"
          style={{ transform: "perspective(1000px) rotateX(15deg) rotateY(-20deg) rotateZ(5deg)" }}
        >
          <div className="flex justify-between items-center w-full">
            <span className="font-semibold text-lg flex items-center gap-2">
              <Box className="size-5" /> Base Content
            </span>
            <Badge variant="secondary" className="font-mono text-xs">
              z-index: 0
            </Badge>
          </div>
        </div>

        <div
          className="absolute left-16 md:left-32 top-16 bottom-24 right-16 md:right-32 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-xl p-6 flex flex-col justify-end transition-transform hover:-translate-y-2 motion-reduce:hover:translate-y-0 hover:shadow-2xl cursor-default z-[10]"
          style={{
            transform:
              "perspective(1000px) rotateX(15deg) rotateY(-20deg) rotateZ(5deg) translateZ(40px)",
          }}
        >
          <div className="flex justify-between items-center w-full">
            <span className="font-semibold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <LayoutDashboard className="size-5" /> Elevated Card
            </span>
            <Badge variant="secondary" className="font-mono text-xs bg-zinc-100 dark:bg-zinc-700">
              z-index: 10
            </Badge>
          </div>
        </div>

        <div
          className="absolute left-8 md:left-20 top-12 h-16 right-8 md:right-20 bg-indigo-50/90 dark:bg-indigo-900/40 backdrop-blur-md border border-indigo-200 dark:border-indigo-800/50 rounded-xl shadow-lg p-4 flex items-center justify-between transition-transform z-[100]"
          style={{
            transform:
              "perspective(1000px) rotateX(15deg) rotateY(-20deg) rotateZ(5deg) translateZ(80px)",
          }}
        >
          <span className="font-semibold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
            <LayoutDashboard className="size-4" /> Sticky Header
          </span>
          <Badge
            className="font-mono text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-900/80 dark:text-indigo-200 border-indigo-200 dark:border-indigo-700"
            variant="outline"
          >
            z-index: 100
          </Badge>
        </div>

        <div
          className="absolute left-[30%] right-[20%] top-[30%] bottom-[30%] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.12)] dark:shadow-[0_30px_60px_rgba(0,0,0,0.4)] p-6 flex flex-col justify-between transition-transform z-[1200]"
          style={{
            transform:
              "perspective(1000px) rotateX(15deg) rotateY(-20deg) rotateZ(5deg) translateZ(160px)",
          }}
        >
          <div>
            <span className="font-semibold text-xl text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Zap className="size-5 text-amber-500 fill-amber-500/20" /> Upgrade Plan Modal
            </span>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2">
              Gets top priority context rendering.
            </p>
          </div>
          <div className="flex justify-between items-center">
            <Button size="sm">Upgrade</Button>
            <Badge variant="default" className="font-mono text-xs shadow-none">
              z-index: 1200
            </Badge>
          </div>
        </div>

        <div
          className="absolute right-[15%] top-[25%] bg-zinc-950 dark:bg-white text-white dark:text-black py-1.5 px-3 rounded-md shadow-lg text-xs font-medium z-[1400]"
          style={{
            transform:
              "perspective(1000px) rotateX(15deg) rotateY(-20deg) rotateZ(5deg) translateZ(200px)",
          }}
        >
          Top layer tooltip
          <Badge
            variant="secondary"
            className="font-mono text-[10px] ml-2 bg-zinc-800 dark:bg-zinc-200 text-zinc-300 dark:text-zinc-700 border-none h-4"
          >
            1400
          </Badge>
        </div>
      </div>
      <div className="bg-fd-muted/30 p-4 border-t border-fd-border text-sm text-fd-muted-foreground flex justify-center gap-6">
        <span className="flex items-center gap-2">
          <span className="size-3 rounded bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800"></span>{" "}
          Base (0)
        </span>
        <span className="flex items-center gap-2">
          <span className="size-3 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"></span>{" "}
          Elevated (10)
        </span>
        <span className="flex items-center gap-2">
          <span className="size-3 rounded bg-indigo-50 dark:bg-indigo-900 border border-indigo-200 dark:border-indigo-800"></span>{" "}
          Sticky (100)
        </span>
        <span className="flex items-center gap-2">
          <span className="size-3 rounded bg-zinc-900 dark:bg-white"></span> Overlays (1200+)
        </span>
      </div>
    </div>
  );
}
