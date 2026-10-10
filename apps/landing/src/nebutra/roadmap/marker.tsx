import { CheckCircleFill, Status as StatusDot } from "@nebutra/icons";
import { cn } from "@nebutra/ui/utils";
import type { Status } from "./model";

/**
 * The status marks. Shape carries the status, so it never rests on colour
 * alone — and the phase label says it in words beside the mark:
 * landed is a filled check, in progress a ring with a dot (the page's one
 * accent), planned an open ring, exploring a fainter open ring.
 */
export function Node({ status, className }: { status: Status; className?: string }) {
  const base = "grid size-3 place-items-center rounded-full bg-background";
  if (status === "done") {
    return (
      <span aria-hidden className={cn(base, "text-muted-foreground", className)}>
        <CheckCircleFill size={12} />
      </span>
    );
  }
  if (status === "active") {
    return (
      <span aria-hidden className={cn(base, "text-primary ring-1 ring-primary", className)}>
        <StatusDot size={10} />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        base,
        "border",
        status === "planned" ? "border-muted-foreground" : "border-border",
        className,
      )}
    />
  );
}

/** The same marks at 6px, for the layer stack's count of entries. */
export function Dot({ status }: { status: Status }) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-1.5 rounded-full",
        status === "done" && "bg-muted-foreground",
        status === "active" && "bg-primary",
        status === "planned" && "border border-muted-foreground",
        status === "exploring" && "border border-border",
      )}
    />
  );
}
