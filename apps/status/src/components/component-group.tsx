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
 * A component group: one header carrying the group's worst state, its
 * component count and its mean uptime. Collapsed, it shows the merged
 * 90-day strip; expanded, every component. A group with anything wrong opens
 * by default — the reader should not have to dig for the failing row.
 */
export function ComponentGroup({
  name,
  count,
  state,
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
    <Collapsible open={open} onOpenChange={setOpen} className="px-4 py-5 sm:px-5">
      <div className="flex items-center justify-between gap-3">
        <CollapsibleTrigger
          aria-controls={contentId}
          aria-label={t(open ? "group.collapse" : "group.expand", { name })}
          className="-mx-1 flex min-w-0 items-center gap-2 rounded-md px-1 py-0.5 text-left"
        >
          <ChevronRight
            aria-hidden
            className={cn(
              "size-4 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:duration-200",
              open && "rotate-90",
            )}
          />
          <StateIcon state={state} className="size-4 shrink-0" />
          <span className="truncate text-sm font-medium text-foreground">{name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {t("group.count", { count })}
          </span>
          {state !== "operational" ? (
            <span className={cn("shrink-0 text-xs", stateInk[state])}>{t(`state.${state}`)}</span>
          ) : null}
        </CollapsibleTrigger>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {uptime90 === null
            ? t("uptime.unmeasured")
            : t("uptime.value", { value: formatUptime(uptime90) })}
        </span>
      </div>
      {open ? null : (
        <div className="mt-3">
          <UptimeBar days={days} locale={locale} incidentHref={incidentHref} label={name} />
        </div>
      )}
      <CollapsibleContent id={contentId}>
        <ul className="mt-2 divide-y divide-border border-l border-border pl-4 sm:ml-2">
          {children}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
