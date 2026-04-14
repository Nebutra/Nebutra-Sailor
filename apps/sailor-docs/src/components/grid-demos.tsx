import { cn } from "@nebutra/ui/utils";
import type React from "react";

interface GridDemoProps {
  children?: React.ReactNode;
  columns?: number;
  className?: string;
  showGuides?: boolean;
  guidesConfig?: "all" | "columns-only" | "rows-only" | "none";
  rows?: number;
  gap?: number;
}

export function GridDemo({
  children,
  columns = 4,
  className,
  showGuides = true,
  guidesConfig = "all",
  gap = 4, // equivalent to gap-4 (1rem / 16px)
}: GridDemoProps) {
  return (
    <div
      className={cn(
        "relative my-6 w-full overflow-hidden rounded-xl border border-border bg-background py-16 px-8",
        className,
      )}
    >
      {/* Background Guides - full height, matching padding layout */}
      {showGuides && guidesConfig !== "none" && (
        <div
          className="pointer-events-none absolute inset-x-8 inset-y-0 grid"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gap: `${gap * 0.25}rem`,
          }}
        >
          {Array.from({ length: columns }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-full w-full",
                ["all", "columns-only"].includes(guidesConfig) && "bg-foreground/[0.03]",
              )}
            />
          ))}
        </div>
      )}

      {/* Actual Grid */}
      <div
        className="relative grid"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: `${gap * 0.25}rem`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

interface GridCellProps {
  children?: React.ReactNode;
  className?: string;
  colSpan?: number | "full";
  rowSpan?: number;
}

export function GridCell({ children, className, colSpan = 1, rowSpan = 1 }: GridCellProps) {
  return (
    <div
      className={cn(
        "flex min-h-[64px] items-center justify-center rounded-md bg-foreground p-4 text-sm font-semibold text-background transition-transform hover:scale-[1.02]",
        {
          "col-span-1": colSpan === 1,
          "col-span-2": colSpan === 2,
          "col-span-3": colSpan === 3,
          "col-span-4": colSpan === 4,
          "col-span-6": colSpan === 6,
          "col-span-8": colSpan === 8,
          "col-span-12": colSpan === 12,
          "col-span-full": colSpan === "full",
          "row-span-1": rowSpan === 1,
          "row-span-2": rowSpan === 2,
          "row-span-3": rowSpan === 3,
        },
        className,
      )}
      style={
        typeof colSpan === "number" && ![1, 2, 3, 4, 6, 8, 12].includes(colSpan)
          ? { gridColumn: `span ${colSpan} / span ${colSpan}` }
          : undefined
      }
    >
      {children}
    </div>
  );
}
