"use client";

import { ProgressiveBlur } from "@nebutra/ui/primitives";

export function ProgressiveBlurDemo() {
  const items = Array.from({ length: 8 }).map((_, i) => (
    <div
      key={i}
      className="p-4 gap-4 flex items-center rounded-lg border bg-card text-card-foreground shadow-sm"
    >
      <div className="w-10 h-10 flex-shrink-0 rounded-full bg-muted" />
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
            <h4 className="font-bold text-xl mb-4 text-center">Terms of Service</h4>
            <p className="text-sm leading-relaxed mb-4 text-foreground/80">
              These terms govern your use of the service. By creating an account you agree to them
              on behalf of yourself and the workspace you create.
            </p>
            <p className="text-sm leading-relaxed mb-4 text-foreground/80">
              You keep ownership of everything you upload. We process it only to run the service and
              never to train models without your written consent.
            </p>
            <p className="text-sm leading-relaxed mb-4 text-foreground/80">
              Paid plans renew monthly or yearly until cancelled. Cancelling stops the next renewal;
              the current period stays active until it ends.
            </p>
            <p className="text-sm leading-relaxed text-foreground/80">
              We may update these terms. Material changes are announced by email at least 30 days
              before they take effect, and you can export your data at any time before then.
            </p>
          </div>
          <ProgressiveBlur position="both" />
        </div>
      </div>
    </div>
  );
}
