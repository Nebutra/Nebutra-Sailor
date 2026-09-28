"use client";

import { GalleryCard } from "@nebutra/ui/patterns";

export function GalleryCardDemo() {
  return (
    <div className="grid w-full gap-4 p-6 sm:grid-cols-2">
      <GalleryCard
        title="Churn watcher"
        description="Flags accounts whose usage drops for two weeks running."
        iconTone="blue"
        badge={{ label: "New", tone: "new" }}
        metadata={{ author: "By Acme Growth", metric: "1.2k runs" }}
      />
      <GalleryCard
        title="Invoice reconciler"
        description="Matches Stripe payouts to invoices and opens a ticket on drift."
        iconTone="amber"
        pinned
        pinnedLabel="Pinned"
        metadata={{ author: "By Finance Ops", metric: "480 runs" }}
      />
    </div>
  );
}
