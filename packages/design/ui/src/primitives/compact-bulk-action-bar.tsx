"use client";

import { cn } from "../utils/cn";
import type { BulkAction } from "./bulk-action-bar";
import { getBulkActionKey } from "./bulk-action-bar-utils";
import { Button } from "./button";
import { Separator } from "./separator";

export interface CompactBulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  actions: BulkAction[];
  className?: string;
}

export function CompactBulkActionBar({
  selectedCount,
  onClearSelection,
  actions,
  className,
}: CompactBulkActionBarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-[var(--radius-md)] bg-primary/10 px-3 py-1.5 text-sm",
        className,
      )}
    >
      <span className="font-medium">{selectedCount} selected</span>
      <Separator orientation="vertical" className="h-4" />
      {actions.slice(0, 3).map((action) => {
        const Icon = action.icon;
        return (
          <Button
            key={getBulkActionKey(action)}
            variant="ghost"
            size="sm"
            onClick={action.onClick}
            disabled={action.disabled}
            className="h-6 px-2 text-xs"
          >
            {Icon && <Icon className="size-3 mr-1" />}
            {action.label}
          </Button>
        );
      })}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
        className="h-6 px-2 text-xs text-muted-foreground"
      >
        Cancel
      </Button>
    </div>
  );
}
