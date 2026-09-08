import { cn } from "@nebutra/ui/utils";
import { type StatusTone, statusTone } from "@/lib/format";

/**
 * Status is the only hue on the console. A dot is the whole vocabulary:
 * green = probed and fine, amber = raised, red = down, grey = not known.
 * `unknown` is a real state and never borrows green.
 */
const DOT: Record<StatusTone, string> = {
  ok: "bg-success",
  warn: "bg-warning",
  bad: "bg-destructive",
  unknown: "bg-muted-foreground/40",
};

const INK: Record<StatusTone, string> = {
  ok: "text-[hsl(var(--success-strong))]",
  warn: "text-[hsl(var(--warning-strong))]",
  bad: "text-[hsl(var(--destructive-strong))]",
  unknown: "text-muted-foreground",
};

export function StatusDot({ tone, className }: { tone: StatusTone; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2 shrink-0 rounded-full", DOT[tone], className)}
    />
  );
}

/** Dot + text; the text carries the meaning for screen readers and greyscale. */
export function StatusPill({
  value,
  tone = statusTone(value),
  className,
}: {
  value: string;
  tone?: StatusTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card px-2 text-xs leading-4",
        INK[tone],
        className,
      )}
    >
      <StatusDot tone={tone} />
      {value}
    </span>
  );
}

/** Neutral pill for badges that are labels, not states. */
export function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center whitespace-nowrap rounded-full bg-muted px-2 text-muted-foreground text-xs leading-4",
        className,
      )}
    >
      {children}
    </span>
  );
}
