import type { ComponentType, ReactNode } from "react";
import { cn } from "../utils/cn";

type DashboardMetricTone = "neutral" | "blue" | "green" | "amber";

const metricToneClasses: Record<DashboardMetricTone, string> = {
  neutral: "bg-muted/70 text-muted-foreground ring-border",
  blue: "bg-info/10 text-info ring-info/20",
  green: "bg-success/10 text-success ring-success/20",
  amber: "bg-warning/10 text-warning ring-warning/20",
};

export interface DashboardCommandSurfaceProps {
  status?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function DashboardCommandSurface({
  status,
  title,
  description,
  actions,
  children,
  className,
}: DashboardCommandSurfaceProps) {
  return (
    <section
      data-pattern="nebutra-dashboard-command"
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card p-4 text-card-foreground shadow-sm",
        "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[linear-gradient(90deg,transparent,hsl(var(--primary)/0.58),transparent)]",
        "after:pointer-events-none after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.08),transparent_42%)]",
        "sm:p-5",
        className,
      )}
    >
      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          {status ? (
            <div className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-green-9 shadow-[0_0_0_3px_var(--green-3)]" />
              <p className="text-[11px] font-medium uppercase text-muted-foreground">{status}</p>
            </div>
          ) : null}
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-card-foreground sm:text-[28px]">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-[13px] leading-5 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">{actions}</div>
        ) : null}
      </div>
      {children ? <div className="relative z-10 mt-4">{children}</div> : null}
    </section>
  );
}

export interface DashboardPanelProps {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
}

export function DashboardPanel({
  title,
  description,
  meta,
  action,
  children,
  className,
  headerClassName,
}: DashboardPanelProps) {
  return (
    <section
      data-pattern="nebutra-dashboard-panel"
      className={cn(
        "rounded-[var(--radius-lg)] border border-border bg-card p-3.5 text-card-foreground shadow-sm sm:p-4",
        className,
      )}
    >
      <div
        className={cn(
          "mb-3 flex flex-col gap-2.5 border-b border-border pb-3 lg:flex-row lg:items-start lg:justify-between",
          headerClassName,
        )}
      >
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-normal text-card-foreground">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {(meta || action) && (
          <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
            {meta}
            {action}
          </div>
        )}
      </div>
      {children}
    </section>
  );
}

export interface DashboardMetricTileProps {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  source?: ReactNode;
  icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  tone?: DashboardMetricTone;
  className?: string;
}

export function DashboardMetricTile({
  label,
  value,
  detail,
  source,
  icon: Icon,
  tone = "neutral",
  className,
}: DashboardMetricTileProps) {
  return (
    <div
      data-pattern="nebutra-dashboard-metric"
      className={cn(
        "group h-full rounded-[var(--radius-lg)] border border-border bg-muted/40 p-3 transition-colors duration-150",
        "hover:border-muted-foreground/30 hover:bg-muted/65",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-xs font-medium text-muted-foreground">{label}</span>
        {Icon ? (
          <span
            className={cn(
              "inline-flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] ring-1",
              metricToneClasses[tone],
            )}
          >
            <Icon className="size-3.5" aria-hidden={true} />
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-normal text-card-foreground">
        {value}
      </p>
      {(detail || source) && (
        <div className="mt-1.5 space-y-0.5 text-xs leading-5 text-muted-foreground">
          {detail ? <span className="block">{detail}</span> : null}
          {source ? (
            <span className="block text-[11px] text-muted-foreground/70">{source}</span>
          ) : null}
        </div>
      )}
    </div>
  );
}
