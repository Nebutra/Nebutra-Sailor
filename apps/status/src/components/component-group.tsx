"use client";

import { ChevronRight } from "@nebutra/icons";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import { useTranslations } from "next-intl";
import { type ReactNode, useId, useState } from "react";
import { formatUptime } from "@/lib/format";
import type { AppLocale } from "@/lib/locale";
import type { BarDay, DayState } from "@/lib/view";
import { StateIcon } from "./state-icon";
import { stateInk } from "./state-style";
import { UptimeBar } from "./uptime-bar";

/**
 * A group reads as one row — name, component count, merged uptime and one
 * merged strip — and expands to its components, indented and lighter. It
 * opens by default only when something inside is failing or in maintenance;
 * that default comes from the server, so nothing flips after hydration.
 */
export function ComponentGroup({
  name,
  count,
  state,
  stateLabel,
  uptime90,
  days,
  locale,
  incidentHref,
  defaultOpen,
  children,
}: {
  name: string;
  count: number;
  state: DayState;
  stateLabel: string | null;
  uptime90: number | null;
  days: BarDay[];
  locale: AppLocale;
  incidentHref: string;
  defaultOpen: boolean;
  children: ReactNode;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="py-4">
      <div className="flex items-center gap-2">
        <CollapsibleTrigger
          aria-controls={contentId}
          aria-label={t(open ? "group.collapse" : "group.expand", { name })}
          className="-ml-1 flex min-w-0 items-center gap-1.5 rounded px-1 text-left"
        >
          <StateIcon state={state} className="size-4" />
          <span className="truncate text-sm font-medium text-foreground">{name}</span>
          <span className="shrink-0 text-sm text-muted-foreground">
            {t("group.count", { count })}
          </span>
          <ChevronRight
            aria-hidden
            className={cn(
              "size-3.5 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:duration-150",
              open && "rotate-90",
            )}
          />
        </CollapsibleTrigger>
        <span className="ml-auto flex shrink-0 items-center gap-3 text-sm">
          {stateLabel ? (
            <span className={cn("max-sm:hidden", stateInk[state])}>{stateLabel}</span>
          ) : null}
          <span className="tabular-nums text-muted-foreground">
            {uptime90 === null
              ? t("uptime.unmeasured")
              : t("uptime.value", { value: formatUptime(uptime90) })}
          </span>
        </span>
      </div>
      <div className="mt-2.5">
        <UptimeBar days={days} locale={locale} incidentHref={incidentHref} label={name} />
      </div>
      <CollapsibleContent id={contentId}>
        <ul className="mt-2 divide-y divide-border border-l border-border">{children}</ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
