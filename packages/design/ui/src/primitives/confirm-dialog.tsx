"use client";

/**
 * Confirm Dialog Components
 *
 * Confirmation dialog components for dangerous action confirmations.
 *
 * Usage:
 * ```tsx
 * // Basic confirmation
 * <ConfirmDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Confirm Delete"
 *   description="This action cannot be undone"
 *   onConfirm={handleDelete}
 * />
 *
 * // Input confirmation (type "DELETE" to confirm)
 * <ConfirmDeleteDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   itemName="Project Alpha"
 *   onConfirm={handleDelete}
 * />
 *
 * // Bulk action confirmation
 * <BulkActionConfirmDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   action="delete"
 *   itemCount={5}
 *   itemType="users"
 *   onConfirm={handleBulkDelete}
 * />
 * ```
 */

import { AlertCircle, AlertTriangle, Loader2, Trash2 } from "lucide-react";
import * as React from "react";
import { cn } from "../utils/cn";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./alert-dialog";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";

// ============================================================================
// Types
// ============================================================================

export interface ConfirmDialogProps {
  /** Dialog open state */
  open: boolean;
  /** State change callback */
  onOpenChange: (open: boolean) => void;
  /** Dialog title */
  title: string;
  /** Dialog description */
  description?: string;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Confirm callback */
  onConfirm: () => void | Promise<void>;
  /** Cancel callback */
  onCancel?: () => void;
  /** Visual variant */
  variant?: "default" | "destructive" | "warning";
  /** Loading state */
  loading?: boolean;
  /** Custom icon */
  icon?: React.ReactNode;
  /** Additional content */
  children?: React.ReactNode;
}

// ============================================================================
// Base Confirm Dialog
// ============================================================================

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  variant = "default",
  loading = false,
  icon,
  children,
}: ConfirmDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error("[ConfirmDialog] Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const isProcessing = loading || isLoading;

  const variantStyles = {
    default: {
      icon: <AlertCircle className="size-6 text-primary" />,
      iconBg: "bg-primary/10",
      confirmVariant: "default" as const,
    },
    destructive: {
      icon: <Trash2 className="size-6 text-destructive" />,
      iconBg: "bg-destructive/10",
      confirmVariant: "destructive" as const,
    },
    warning: {
      icon: <AlertTriangle className="size-6 text-amber-600" />,
      iconBg: "bg-amber-100 dark:bg-amber-900/30",
      confirmVariant: "default" as const,
    },
  };

  const styles = variantStyles[variant];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div className={cn("rounded-full p-2", styles.iconBg)}>{icon || styles.icon}</div>
            <div className="flex-1">
              <AlertDialogTitle>{title}</AlertDialogTitle>
              {description && (
                <AlertDialogDescription className="mt-2">{description}</AlertDialogDescription>
              )}
            </div>
          </div>
        </AlertDialogHeader>

        {children && <div className="mt-4">{children}</div>}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isProcessing}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={isProcessing}
            className={cn(
              variant === "destructive" &&
                "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            )}
          >
            {isProcessing && <Loader2 className="size-4 mr-2 animate-spin" />}
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ============================================================================
// Confirm Delete Dialog (with input confirmation)
// ============================================================================

export interface ConfirmDeleteDialogProps {
  /** Dialog open state */
  open: boolean;
  /** State change callback */
  onOpenChange: (open: boolean) => void;
  /** Name of item being deleted */
  itemName: string;
  /** Item type (e.g., "project", "user") */
  itemType?: string;
  /** Text to type for confirmation (default: "DELETE") */
  confirmationText?: string;
  /** Confirm callback */
  onConfirm: () => void | Promise<void>;
  /** Loading state */
  loading?: boolean;
  /** Additional warnings to display */
  warnings?: string[];
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  itemName,
  itemType = "item",
  confirmationText = "DELETE",
  onConfirm,
  loading = false,
  warnings = [],
}: ConfirmDeleteDialogProps) {
  const [inputValue, setInputValue] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const isConfirmEnabled = inputValue === confirmationText;
  const isProcessing = loading || isLoading;

  // Reset input when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setInputValue("");
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!isConfirmEnabled) return;

    try {
      setIsLoading(true);
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error("[ConfirmDeleteDialog] Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-destructive/10 p-2">
              <Trash2 className="size-6 text-destructive" />
            </div>
            <div className="flex-1">
              <AlertDialogTitle>Delete {itemType}</AlertDialogTitle>
              <AlertDialogDescription className="mt-2">
                You are about to delete <strong className="text-foreground">{itemName}</strong>.
                This action <span className="font-semibold text-destructive">cannot be undone</span>
                .
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        {/* Warning list */}
        {warnings.length > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="size-4 text-amber-600 mt-0.5 shrink-0" />
              <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
                {warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Input confirmation */}
        <div className="space-y-3 pt-2">
          <Label htmlFor="confirm-input" className="text-sm text-muted-foreground">
            Type{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-destructive">
              {confirmationText}
            </code>{" "}
            to confirm
          </Label>
          <Input
            id="confirm-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={confirmationText}
            className={cn(
              "font-mono",
              isConfirmEnabled && "border-green-500 focus-visible:ring-green-500",
            )}
            disabled={isProcessing}
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === "Enter" && isConfirmEnabled) {
                handleConfirm();
              }
            }}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmEnabled || isProcessing}
          >
            {isProcessing && <Loader2 className="size-4 mr-2 animate-spin" />}
            Confirm Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ============================================================================
// Bulk Action Confirm Dialog
// ============================================================================

export interface BulkActionConfirmDialogProps {
  /** Dialog open state */
  open: boolean;
  /** State change callback */
  onOpenChange: (open: boolean) => void;
  /** Action name (e.g., "delete", "archive") */
  action: string;
  /** Number of selected items */
  itemCount: number;
  /** Item type (e.g., "users", "records") */
  itemType: string;
  /** Confirm callback */
  onConfirm: () => void | Promise<void>;
  /** Visual variant */
  variant?: "default" | "destructive" | "warning";
  /** Loading state */
  loading?: boolean;
  /** Require input confirmation when count exceeds threshold */
  requireInputConfirmation?: boolean;
  /** Threshold for requiring input confirmation */
  inputConfirmationThreshold?: number;
  /** Additional description */
  description?: string;
  /** Items to preview */
  previewItems?: string[];
}

export function BulkActionConfirmDialog({
  open,
  onOpenChange,
  action,
  itemCount,
  itemType,
  onConfirm,
  variant = "default",
  loading = false,
  requireInputConfirmation = false,
  inputConfirmationThreshold = 10,
  description,
  previewItems = [],
}: BulkActionConfirmDialogProps) {
  const [inputValue, setInputValue] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const needsInputConfirmation =
    requireInputConfirmation && itemCount >= inputConfirmationThreshold;
  const confirmationText = itemCount.toString();
  const isConfirmEnabled = !needsInputConfirmation || inputValue === confirmationText;
  const isProcessing = loading || isLoading;

  // Reset input when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setInputValue("");
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!isConfirmEnabled) return;

    try {
      setIsLoading(true);
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error("[BulkActionConfirmDialog] Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const variantStyles = {
    default: {
      icon: <AlertCircle className="size-6 text-primary" />,
      iconBg: "bg-primary/10",
    },
    destructive: {
      icon: <Trash2 className="size-6 text-destructive" />,
      iconBg: "bg-destructive/10",
    },
    warning: {
      icon: <AlertTriangle className="size-6 text-amber-600" />,
      iconBg: "bg-amber-100 dark:bg-amber-900/30",
    },
  };

  const styles = variantStyles[variant];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div className={cn("rounded-full p-2", styles.iconBg)}>{styles.icon}</div>
            <div className="flex-1">
              <AlertDialogTitle>
                {action} {itemCount} {itemType}
              </AlertDialogTitle>
              <AlertDialogDescription className="mt-2">
                {description || (
                  <>
                    You are about to {action}{" "}
                    <strong className="text-foreground">{itemCount}</strong> {itemType}.
                    {variant === "destructive" && (
                      <span className="font-semibold text-destructive">
                        {" "}
                        This action cannot be undone.
                      </span>
                    )}
                  </>
                )}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        {/* Preview items */}
        {previewItems.length > 0 && (
          <div className="max-h-32 overflow-auto rounded-md border bg-muted/50 p-3">
            <ul className="space-y-1 text-sm">
              {previewItems.slice(0, 5).map((item, index) => (
                <li key={index} className="truncate text-muted-foreground">
                  • {item}
                </li>
              ))}
              {previewItems.length > 5 && (
                <li className="text-muted-foreground">...and {previewItems.length - 5} more</li>
              )}
            </ul>
          </div>
        )}

        {/* Input confirmation for large batch operations */}
        {needsInputConfirmation && (
          <div className="space-y-3 pt-2">
            <Label htmlFor="bulk-confirm-input" className="text-sm text-muted-foreground">
              Type{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-primary">
                {confirmationText}
              </code>{" "}
              to confirm
            </Label>
            <Input
              id="bulk-confirm-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={confirmationText}
              className={cn(
                "font-mono",
                isConfirmEnabled && "border-green-500 focus-visible:ring-green-500",
              )}
              disabled={isProcessing}
              autoComplete="off"
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={!isConfirmEnabled || isProcessing}
          >
            {isProcessing && <Loader2 className="size-4 mr-2 animate-spin" />}
            Confirm
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ============================================================================
// Hook for managing confirm dialog state
// ============================================================================

export interface UseConfirmDialogOptions<T = void> {
  onConfirm: (data: T) => void | Promise<void>;
}

export interface UseConfirmDialogReturn<T = void> {
  isOpen: boolean;
  data: T | null;
  open: (data: T) => void;
  close: () => void;
  confirm: () => Promise<void>;
}

export function useConfirmDialog<T = void>({
  onConfirm,
}: UseConfirmDialogOptions<T>): UseConfirmDialogReturn<T> {
  const [isOpen, setIsOpen] = React.useState(false);
  const [data, setData] = React.useState<T | null>(null);

  const open = React.useCallback((newData: T) => {
    setData(newData);
    setIsOpen(true);
  }, []);

  const close = React.useCallback(() => {
    setIsOpen(false);
    setData(null);
  }, []);

  const confirm = React.useCallback(async () => {
    if (data !== null) {
      await onConfirm(data);
    }
    close();
  }, [data, onConfirm, close]);

  return {
    isOpen,
    data,
    open,
    close,
    confirm,
  };
}
