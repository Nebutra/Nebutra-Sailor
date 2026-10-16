"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";

/**
 * The evidence differentiator, kept small: one label naming the strongest
 * proof behind a row ("用户旅程" / "依赖探测"). Focus or hover lists every
 * source with its state and age.
 */
export function CoverageLabel({
  label,
  tone,
  heading,
  lines,
}: {
  label: string;
  tone: "ok" | "bad" | "quiet";
  heading: string;
  lines: string[];
}) {
  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`${heading}: ${lines.join("; ")}`}
            className={cn(
              "inline-flex h-5 shrink-0 items-center gap-1 rounded border border-border px-1.5 text-[11px] leading-none text-muted-foreground",
              "transition-colors hover:text-foreground",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "size-1.5 rounded-full",
                tone === "ok" && "bg-green-700",
                tone === "bad" && "bg-amber-700",
                tone === "quiet" && "bg-neutral-6",
              )}
            />
            <span className="max-sm:sr-only">{label}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-72">
          <p className="font-medium">{heading}</p>
          <ul className="mt-1 space-y-0.5">
            {lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
