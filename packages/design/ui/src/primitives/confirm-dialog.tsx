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

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import {
  Warning as AlertCircle,
  Warning as AlertTriangle,
  LoaderCircle as Loader2,
  Trash as Trash2,
} from "@nebutra/icons";
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
// Destructive Action Modal (type-to-confirm gate)
// ============================================================================

export interface DestructiveActionModalProps {
  /** Dialog open state. The caller owns it and decides when to close after confirm. */
  open: boolean;
  /** Title Case Verb + Noun label, e.g. "Delete Project". */
  title: string;
  /** Consequence copy. Name the specific resource when possible. */
  description: React.ReactNode;
  /** Primary action label. Should match title 1:1. */
  confirmLabel: string;
  /** Exact phrase the user must type to unlock confirm. */
  verificationPhrase: string;
  /** Resource label used in the prompt, e.g. "project name". */
  verificationLabel?: string;
  /** Optional irreversible-action band. Omit for reversible actions. */
  irreversibleDescription?: React.ReactNode;
  /** Inline API failure. Keep the modal open so the user can retry. */
  error?: string | Error | null;
  /** In-flight state owned by the caller. */
  loading?: boolean;
  /** Cancel callback for cancel button, outside click, and Escape. */
  onCancel: () => void;
  /** Confirm callback. The component never closes itself from here. */
  onConfirm: () => void;
  /** Cancel button label. */
  cancelLabel?: string;
  /** Optional className for the modal panel. */
  className?: string;
}

function getErrorMessage(error: DestructiveActionModalProps["error"]): string | undefined {
  if (!error) return undefined;
  if (typeof error === "string") return error;
  return error.message;
}

export function DestructiveActionModal({
  open,
  title,
  description,
  confirmLabel,
  verificationPhrase,
  verificationLabel,
  irreversibleDescription,
  error,
  loading = false,
  onCancel,
  onConfirm,
  cancelLabel = "Cancel",
  className,
}: DestructiveActionModalProps) {
  const [value, setValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const inputId = React.useId();
  const promptId = React.useId();
  const descriptionId = React.useId();
  const errorId = React.useId();
  const irreversibleId = React.useId();

  const isVerified = value === verificationPhrase;
  const errorMessage = getErrorMessage(error);
  const describedBy = [
    descriptionId,
    errorMessage ? errorId : undefined,
    irreversibleDescription ? irreversibleId : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  React.useEffect(() => {
    if (!open) return;
    setValue("");
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && !loading) onCancel();
    },
    [loading, onCancel],
  );

  const handleSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!isVerified || loading) return;
      onConfirm();
    },
    [isVerified, loading, onConfirm],
  );

  return (
    <BaseDialog.Root open={open} onOpenChange={handleOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm transition-[opacity,display] duration-[var(--motion-duration-flow)] ease-[var(--ease-out)] data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <BaseDialog.Popup
          aria-busy={loading || undefined}
          aria-describedby={describedBy}
          className={cn(
            "fixed left-[50%] top-[50%] z-50 w-[calc(100vw-2rem)] max-w-md translate-x-[-50%] translate-y-[-50%]",
            "overflow-hidden rounded-[var(--radius-lg)] border border-border bg-background text-foreground shadow-2xl",
            "transition-[opacity,transform,display] duration-[var(--motion-duration-flow)] ease-[var(--ease-out)]",
            "data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0",
            "motion-reduce:transition-none motion-reduce:data-starting-style:transform-none motion-reduce:data-ending-style:transform-none",
            className,
          )}
        >
          <form onSubmit={handleSubmit}>
            <div className="space-y-5 p-6">
              <div className="space-y-2">
                <BaseDialog.Title className="text-base font-semibold leading-none">
                  {title}
                </BaseDialog.Title>
                <BaseDialog.Description
                  id={descriptionId}
                  className="text-sm leading-6 text-muted-foreground"
                >
                  {description}
                </BaseDialog.Description>
              </div>

              <div className="space-y-2">
                <Label
                  id={promptId}
                  htmlFor={inputId}
                  className="block text-sm leading-6 text-foreground"
                >
                  To confirm, type{" "}
                  {verificationLabel ? <span>the {verificationLabel} </span> : null}
                  <span className="font-mono text-destructive">"{verificationPhrase}"</span>.
                </Label>
                <Input
                  ref={inputRef}
                  id={inputId}
                  aria-describedby={describedBy}
                  aria-invalid={errorMessage ? true : undefined}
                  aria-labelledby={promptId}
                  autoComplete="off"
                  className="font-mono"
                  disabled={loading}
                  onChange={(event) => setValue(event.target.value)}
                  value={value}
                />
                {errorMessage ? (
                  <p id={errorId} className="text-sm text-destructive" role="alert">
                    {errorMessage}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button disabled={loading} onClick={onCancel} type="button" variant="outline">
                  {cancelLabel}
                </Button>
                <Button
                  disabled={!isVerified || loading}
                  loading={loading}
                  type="submit"
                  variant="destructive"
                >
                  {confirmLabel}
                </Button>
              </div>
            </div>

            {irreversibleDescription ? (
              <div
                id={irreversibleId}
                className={cn(
                  "flex items-start gap-2 border-t border-destructive/20 px-6 py-3 text-sm text-destructive",
                  "bg-[repeating-linear-gradient(-45deg,hsl(var(--destructive)/0.08),hsl(var(--destructive)/0.08)_1px,transparent_1px,transparent_7px)]",
                )}
              >
                <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span>{irreversibleDescription}</span>
              </div>
            ) : null}
          </form>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
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
  const warningCopy = warnings.length > 0 ? ` ${warnings.join(" ")}` : "";
  const verificationLabelProps =
    confirmationText === itemName ? { verificationLabel: `${itemType} name` } : {};

  return (
    <DestructiveActionModal
      confirmLabel={`Delete ${itemType}`}
      description={
        <>
          <span className="font-medium">{itemName}</span> will be permanently deleted.
          {warningCopy}
        </>
      }
      irreversibleDescription={`Deleting ${itemName} cannot be undone.`}
      loading={loading}
      onCancel={() => onOpenChange(false)}
      onConfirm={onConfirm}
      open={open}
      title={`Delete ${itemType}`}
      verificationPhrase={confirmationText}
      {...verificationLabelProps}
    />
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
