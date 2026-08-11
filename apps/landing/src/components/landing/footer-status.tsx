"use client";

/**
 * The footer's status dot, reporting what the probe actually found.
 *
 * It used to be a green dot and a translated string that said "All systems
 * operational" unconditionally — static content, rendered the same during an
 * outage as during a quiet week. This site runs a real probe and publishes it at
 * /status.json; at the time this was written that endpoint returned
 * `"overall":"outage"` while the footer underneath it was still green.
 *
 * A claim about production that cannot be wrong is not a status indicator. This
 * one reads the snapshot.
 *
 * While the request is in flight it shows the neutral state rather than
 * optimistically showing green: a dot that is green before anything has been
 * checked is the same lie with a shorter lifetime.
 */

import { cn } from "@nebutra/ui/utils";
import { useTranslations } from "next-intl";
import * as React from "react";

type Overall = "operational" | "degraded" | "outage" | "unknown";

const DOT: Record<Overall, string> = {
  // The accent belongs to the healthy case only — it is the one that should
  // read as the site's own colour.
  operational:
    "bg-[color:var(--brand-accent)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--brand-accent)_20%,transparent)]",
  degraded:
    "bg-warning shadow-[0_0_0_3px_color-mix(in_srgb,var(--status-warning)_20%,transparent)]",
  outage:
    "bg-destructive shadow-[0_0_0_3px_color-mix(in_srgb,var(--status-danger)_20%,transparent)]",
  unknown: "bg-muted-foreground/50",
};

// `as const` rather than Record<Overall, string>: next-intl types t() against
// the literal key union, so a widened string is rejected — which is the check
// doing its job.
const LABEL_KEY = {
  operational: "statusOnline",
  degraded: "statusDegraded",
  outage: "statusOutage",
  unknown: "statusUnknown",
} as const satisfies Record<Overall, string>;

export function FooterStatus({ href }: { href: string }) {
  const t = useTranslations("footer");
  const [overall, setOverall] = React.useState<Overall>("unknown");

  React.useEffect(() => {
    const controller = new AbortController();
    fetch("/status.json", { cache: "no-store", signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((snapshot: { overall?: string } | null) => {
        const value = snapshot?.overall;
        if (value === "operational" || value === "degraded" || value === "outage") {
          setOverall(value);
        }
      })
      // A failed probe read is itself unknown, not healthy.
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  return (
    <a
      className="flex items-center gap-2 text-muted-foreground text-xs transition-colors hover:text-foreground"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      <span className={cn("size-1.5 rounded-full", DOT[overall])} data-testid="status-dot" />
      {t(LABEL_KEY[overall])}
    </a>
  );
}
