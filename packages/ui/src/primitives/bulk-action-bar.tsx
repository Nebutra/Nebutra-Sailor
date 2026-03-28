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

import { CheckCircle2, type LucideIcon, X } from "lucide-react";
import * as React from "react";
import { cn } from "../utils/cn";
import { Button } from "./button";
import { Separator } from "./separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

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

  const handleActionClick = async (action: BulkAction, index: number) => {
    const actionId = action.id || `action-${index}`;

    try {
      setLoadingActions((prev) => new Set(prev).add(actionId));
      await action.onClick();
    } finally {
      setLoadingActions((prev) => {
        const next = new Set(prev);
        next.delete(actionId);
        return next;
      });
    }
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
        "z-50 flex items-center gap-3 rounded-lg border bg-background/95 px-4 py-2.5 shadow-lg backdrop-blur-sm",
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
        {actions.map((action, index) => {
          const actionId = action.id || `action-${index}`;
          const isLoading = loadingActions.has(actionId) || action.loading;
          const disabled = isActionDisabled(action);
          const disabledReason = getDisabledReason(action);
          const Icon = action.icon;

          const button = (
            <Button
              key={actionId}
              variant={action.variant || "secondary"}
              size="sm"
              onClick={() => handleActionClick(action, index)}
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
// Floating Variant (for absolute positioning in table container)
// ============================================================================

export interface FloatingBulkActionBarProps extends Omit<BulkActionBarProps, "fixed" | "position"> {
  /** Whether visible */
  visible?: boolean;
}

export function FloatingBulkActionBar({
  visible = true,
  className,
  ...props
}: FloatingBulkActionBarProps) {
  if (!visible || props.selectedCount === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4">
      <BulkActionBar {...props} fixed={false} className={cn("pointer-events-auto", className)} />
    </div>
  );
}

// ============================================================================
// Compact Variant (inline in table header)
// ============================================================================

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
        "flex items-center gap-2 rounded-md bg-primary/10 px-3 py-1.5 text-sm",
        className,
      )}
    >
      <span className="font-medium">{selectedCount} selected</span>
      <Separator orientation="vertical" className="h-4" />
      {actions.slice(0, 3).map((action, index) => {
        const Icon = action.icon;
        return (
          <Button
            key={action.id || index}
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

  const selectedItems = React.useMemo(
    () => items.filter((item) => selectedIds.has(getItemId(item))),
    [items, selectedIds, getItemId],
  );

  const isSelected = React.useCallback(
    (item: T) => selectedIds.has(getItemId(item)),
    [selectedIds, getItemId],
  );

  const isAllSelected = items.length > 0 && selectedIds.size === items.length;
  const isPartiallySelected = selectedIds.size > 0 && selectedIds.size < items.length;

  const toggleSelection = React.useCallback(
    (item: T) => {
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
    },
    [getItemId],
  );

  const selectAll = React.useCallback(() => {
    setSelectedIds(new Set(items.map(getItemId)));
  }, [items, getItemId]);

  const clearSelection = React.useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectItems = React.useCallback(
    (itemsToSelect: T[]) => {
      setSelectedIds(new Set(itemsToSelect.map(getItemId)));
    },
    [getItemId],
  );

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
