"use client";

/**
 * Bulk Action Bar Component
 *
 * Batch operations bar for multi-select table interactions.
 *
 * Usage:
 * ```tsx
 * <BulkActionBar
 *   selectedCount={selectedRows.length}
 *   onClearSelection={() => table.resetRowSelection()}
 *   actions={[
 *     { label: "Delete", icon: Trash2, onClick: handleBulkDelete, variant: "destructive" },
 *     { label: "Export", icon: Download, onClick: handleExport },
 *   ]}
 * />
 * ```
 */

import { CheckCircle as CheckCircle2, type Icon as LucideIcon, Cross as X } from "@nebutra/icons";
import * as React from "react";
import { cn } from "../utils/cn";
import { getBulkActionKey } from "./bulk-action-bar-utils";
import { Button } from "./button";
import { Separator } from "./separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

export { CompactBulkActionBar, type CompactBulkActionBarProps } from "./compact-bulk-action-bar";
export { FloatingBulkActionBar, type FloatingBulkActionBarProps } from "./floating-bulk-action-bar";

// ============================================================================
// Types
// ============================================================================

export interface BulkAction {
  /** Action identifier */
  id?: string;
  /** Display label */
  label: string;
  /** Icon component */
  icon?: LucideIcon;
  /** Click callback */
  onClick: () => void | Promise<void>;
  /** Button variant */
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost";
  /** Disabled state */
  disabled?: boolean;
  /** Tooltip when disabled */
  disabledReason?: string;
  /** Loading state */
  loading?: boolean;
  /** Minimum selection count required */
  minSelection?: number;
  /** Maximum selection count allowed */
  maxSelection?: number;
}

export interface BulkActionBarProps {
  /** Number of selected items */
  selectedCount: number;
  /** Total number of items */
  totalCount?: number;
  /** Clear selection callback */
  onClearSelection: () => void;
  /** Select all callback */
  onSelectAll?: () => void;
  /** List of bulk actions */
  actions: BulkAction[];
  /** Item name for display (e.g., "items", "users") */
  itemName?: string;
  /** Custom class name */
  className?: string;
  /** Bar position */
  position?: "bottom" | "top";
  /** Fixed positioning */
  fixed?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function BulkActionBar({
  selectedCount,
  totalCount,
  onClearSelection,
  onSelectAll,
  actions,
  itemName = "items",
  className,
  position = "bottom",
  fixed = true,
}: BulkActionBarProps) {
  const [loadingActions, setLoadingActions] = React.useState<Set<string>>(new Set());

  // Don't render if nothing is selected
  if (selectedCount === 0) {
    return null;
  }

  const handleActionClick = async (action: BulkAction) => {
    const actionId = getBulkActionKey(action);

    setLoadingActions((prev) => new Set(prev).add(actionId));
    await Promise.resolve()
      .then(() => action.onClick())
      .finally(() => {
        setLoadingActions((prev) => {
          const next = new Set(prev);
          next.delete(actionId);
          return next;
        });
      });
  };

  const isActionDisabled = (action: BulkAction): boolean => {
    if (action.disabled) return true;
    if (action.minSelection && selectedCount < action.minSelection) return true;
    if (action.maxSelection && selectedCount > action.maxSelection) return true;
    return false;
  };

  const getDisabledReason = (action: BulkAction): string | undefined => {
    if (action.disabledReason) return action.disabledReason;
    if (action.minSelection && selectedCount < action.minSelection) {
      return `At least ${action.minSelection} items required`;
    }
    if (action.maxSelection && selectedCount > action.maxSelection) {
      return `Maximum ${action.maxSelection} items allowed`;
    }
    return undefined;
  };

  const isAllSelected = totalCount !== undefined && selectedCount === totalCount;

  return (
    <div
      className={cn(
        "z-50 flex items-center gap-3 rounded-[var(--radius-lg)] border bg-background/95 px-4 py-2.5 shadow-lg backdrop-blur-sm",
        "animate-in slide-in-from-bottom-2 duration-200",
        fixed && position === "bottom" && "fixed bottom-4 left-1/2 -translate-x-1/2",
        fixed && position === "top" && "fixed top-4 left-1/2 -translate-x-1/2",
        !fixed && "relative",
        className,
      )}
    >
      {/* Selection status */}
      <div className="flex items-center gap-2 text-sm">
        <CheckCircle2 className="size-4 text-primary" />
        <span className="font-medium text-foreground">
          <span className="text-primary">{selectedCount}</span> {itemName} selected
        </span>
        {totalCount !== undefined && <span className="text-muted-foreground">/ {totalCount}</span>}
      </div>

      <Separator orientation="vertical" className="h-5" />

      {/* Select all / Clear */}
      <div className="flex items-center gap-1">
        {onSelectAll && !isAllSelected && (
          <Button variant="ghost" size="sm" onClick={onSelectAll} className="h-7 px-2 text-xs">
            Select all
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onClearSelection} className="h-7 px-2 text-xs">
          Clear selection
        </Button>
      </div>

      <Separator orientation="vertical" className="h-5" />

      {/* Bulk action buttons */}
      <div className="flex items-center gap-2">
        {actions.map((action) => {
          const actionId = getBulkActionKey(action);
          const isLoading = loadingActions.has(actionId) || action.loading;
          const disabled = isActionDisabled(action);
          const disabledReason = getDisabledReason(action);
          const Icon = action.icon;

          const button = (
            <Button
              key={actionId}
              variant={action.variant || "secondary"}
              size="sm"
              onClick={() => handleActionClick(action)}
              disabled={disabled || isLoading}
              className="h-8 gap-1.5"
            >
              {Icon && <Icon className={cn("size-4", isLoading && "animate-spin")} />}
              <span>{action.label}</span>
            </Button>
          );

          if (disabled && disabledReason) {
            return (
              <Tooltip key={actionId}>
                <TooltipTrigger asChild>
                  <span>{button}</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{disabledReason}</p>
                </TooltipContent>
              </Tooltip>
            );
          }

          return button;
        })}
      </div>

      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClearSelection}
        className="size-7 ml-1 shrink-0"
      >
        <X className="size-4" />
        <span className="sr-only">Close</span>
      </Button>
    </div>
  );
}

// ============================================================================
// Hook for managing bulk selection state
// ============================================================================

export interface UseBulkSelectionOptions<T> {
  items: T[];
  getItemId: (item: T) => string;
}

export interface UseBulkSelectionReturn<T> {
  selectedIds: Set<string>;
  selectedItems: T[];
  selectedCount: number;
  isSelected: (item: T) => boolean;
  isAllSelected: boolean;
  isPartiallySelected: boolean;
  toggleSelection: (item: T) => void;
  selectAll: () => void;
  clearSelection: () => void;
  selectItems: (items: T[]) => void;
}

export function useBulkSelection<T>({
  items,
  getItemId,
}: UseBulkSelectionOptions<T>): UseBulkSelectionReturn<T> {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const selectedItems = items.filter((item) => selectedIds.has(getItemId(item)));

  function isSelected(item: T): boolean {
    return selectedIds.has(getItemId(item));
  }

  const isAllSelected = items.length > 0 && selectedIds.size === items.length;
  const isPartiallySelected = selectedIds.size > 0 && selectedIds.size < items.length;

  function toggleSelection(item: T) {
    const id = getItemId(item);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(items.map(getItemId)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function selectItems(itemsToSelect: T[]) {
    setSelectedIds(new Set(itemsToSelect.map(getItemId)));
  }

  return {
    selectedIds,
    selectedItems,
    selectedCount: selectedIds.size,
    isSelected,
    isAllSelected,
    isPartiallySelected,
    toggleSelection,
    selectAll,
    clearSelection,
    selectItems,
  };
}
