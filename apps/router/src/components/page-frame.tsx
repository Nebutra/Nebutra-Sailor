import type { ReactNode } from "react";

/**
 * Console content frame — wide, tight padding (not marketing py-12 / max-w-2xl).
 */
export function PageFrame({
  children,
  width = "wide",
  className,
  title,
  description,
  actions,
}: {
  children: ReactNode;
  width?: "wide" | "content";
  className?: string;
  /** Compact page title row (preferred over large PageHeader) */
  title?: string;
  description?: string;
  actions?: ReactNode;
}) {
  const max = width === "wide" ? "max-w-[1280px]" : "max-w-4xl";
  return (
    <div
      className={["mx-auto w-full px-4 py-6 md:px-6 md:py-8", max, className]
        .filter(Boolean)
        .join(" ")}
    >
      {title ? (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            {description ? (
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
