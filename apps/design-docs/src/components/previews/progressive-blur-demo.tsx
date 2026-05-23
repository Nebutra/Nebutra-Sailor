"use client";

import { ProgressiveBlur } from "@nebutra/ui/primitives";

export function ProgressiveBlurDemo() {
  const items = Array.from({ length: 8 }).map((_, i) => (
    <div
      key={i}
      className="p-4 gap-4 flex items-center rounded-lg border bg-card text-card-foreground shadow-sm"
    >
      <div className="size-10 flex-shrink-0 rounded-full bg-muted" />
      <div className="space-y-2 flex-grow">
        <div className="h-4 rounded w-1/3 bg-muted" />
        <div className="h-3 rounded w-2/3 bg-muted/60" />
      </div>
    </div>
  ));

  return (
    <div className="max-w-2xl p-4 md:p-8 md:flex-row gap-8 mx-auto flex w-full flex-col">
      {/* Example 1: Bottom Blur */}
      <div className="gap-2 flex flex-1 flex-col">
        <h3 className="text-sm font-medium mb-2 text-muted-foreground">Bottom Blur</h3>
        <div className="relative h-[300px] w-full overflow-hidden rounded-xl border bg-background">
          <div className="inset-0 p-4 space-y-4 absolute overflow-y-auto">
            {items}
            {items}
          </div>
          <ProgressiveBlur position="bottom" height="100px" />
        </div>
      </div>

      {/* Example 2: Top Blur */}
      <div className="gap-2 flex flex-1 flex-col">
        <h3 className="text-sm font-medium mb-2 text-muted-foreground">Top & Bottom Blur</h3>
        <div className="bg-dot-pattern relative h-[300px] w-full overflow-hidden rounded-xl border bg-background">
          <div className="inset-0 p-4 space-y-4 pt-16 pb-16 absolute overflow-y-auto">
            <h4 className="mb-4 text-center font-semibold text-xl">Terms of Service</h4>
            <p className="text-sm leading-relaxed mb-4 text-foreground/80">
              Review deployment permissions before promoting a workspace to production. Organization
              administrators can update billing, invite members, and rotate API keys.
            </p>
            <p className="text-sm leading-relaxed mb-4 text-foreground/80">
              Audit logs are retained for compliance review and cannot be edited by project members
              after the event is written.
            </p>
            <p className="text-sm leading-relaxed mb-4 text-foreground/80">
              Usage-based features may be paused when quota limits are reached. Billing owners can
              raise limits or move the workspace to a higher plan.
            </p>
            <p className="text-sm leading-relaxed text-foreground/80">
              Contact support before transferring regulated data between regions. Data residency
              settings are enforced per tenant and require an audit note when changed.
            </p>
          </div>
          <ProgressiveBlur position="both" />
        </div>
      </div>
    </div>
  );
}
