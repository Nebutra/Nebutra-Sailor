"use client";

/**
 * Run status as a Badge — shared by the thread column and the canvas inspector
 * so a run reads identically wherever it surfaces.
 */

import type { StartupOperatingRun } from "@nebutra/startup-os/compiler";
import { Badge, type BadgeProps } from "@nebutra/ui/primitives";
import { formatRunStatus } from "./startup-os-model";

const STATUS_BADGE_VARIANT: Record<string, BadgeProps["variant"]> = {
  completed: "success",
  failed: "destructive",
  waiting_for_review: "warning",
  planned: "secondary",
};

export interface StartupRunStatusBadgeProps {
  readonly status: StartupOperatingRun["status"];
}

export function StartupRunStatusBadge({ status }: StartupRunStatusBadgeProps) {
  return (
    <Badge variant={STATUS_BADGE_VARIANT[status] ?? "secondary"} size="sm">
      {formatRunStatus(status)}
    </Badge>
  );
}
