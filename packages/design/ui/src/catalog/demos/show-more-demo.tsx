"use client";

import { ShowMore } from "@nebutra/ui/primitives";
import { useState } from "react";

const EVENTS = [
  "Deployment dpl_8Fq promoted to production",
  "Environment variable STRIPE_SECRET_KEY updated",
  "Domain acme.com verified",
  "Member dana@acme.com joined the team",
  "Build cache cleared",
  "Webhook endpoint /hooks/billing added",
  "Plan changed from Pro to Team",
];

export function ShowMoreDemo() {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? EVENTS : EVENTS.slice(0, 3);
  return (
    <div className="w-full max-w-md p-6">
      <ul
        id="activity-list"
        className="divide-y divide-border rounded-[var(--radius-md)] border border-border"
      >
        {visible.map((event) => (
          <li key={event} className="px-4 py-2.5 text-sm text-foreground">
            {event}
          </li>
        ))}
      </ul>
      <ShowMore
        expanded={expanded}
        onExpandedChange={setExpanded}
        controls="activity-list"
        hiddenCount={EVENTS.length - 3}
      />
    </div>
  );
}
