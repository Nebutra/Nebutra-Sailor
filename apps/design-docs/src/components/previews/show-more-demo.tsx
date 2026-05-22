"use client";

import { ShowMore } from "@nebutra/ui/primitives";
import { useRef, useState } from "react";

const items = [
  "Production deploy completed",
  "Billing sync finished",
  "Audit export queued",
  "Invite accepted by Lena",
  "Webhook delivery retried",
  "New API key created",
  "Policy rule updated",
  "Usage threshold reached",
] as const;

export function ShowMoreDemo() {
  const [expanded, setExpanded] = useState(false);
  const firstRevealedRef = useRef<HTMLLIElement>(null);
  const visibleItems = expanded ? items : items.slice(0, 5);

  return (
    <div className="w-full max-w-md rounded-[var(--radius-lg)] border bg-card p-4 text-card-foreground">
      <ul id="show-more-activity" className="grid gap-2 text-sm">
        {visibleItems.map((item, index) => (
          <li
            key={item}
            ref={index === 5 ? firstRevealedRef : undefined}
            tabIndex={index === 5 ? -1 : undefined}
            className="rounded-[var(--radius-md)] border bg-background px-3 py-2"
          >
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-4">
        <ShowMore
          controls="show-more-activity"
          expanded={expanded}
          focusTargetRef={firstRevealedRef}
          hiddenCount={items.length - visibleItems.length}
          onExpandedChange={setExpanded}
        />
      </div>
    </div>
  );
}
