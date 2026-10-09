"use client";

/**
 * Copy Button Component
 *
 * Unified copy-to-clipboard button with visual feedback.
 *
 * Usage:
 * ```tsx
 * // Basic usage
 * <CopyButton value="text to copy" />
 *
 * // With custom label
 * <CopyButton value={userId} label="Copy ID" />
 *
 * // Icon only (for inline use)
 * <CopyButton value={code} variant="ghost" size="icon" />
 *
 * // With custom success message
 * <CopyButton value={link} successMessage="Link copied!" />
 *
 * // Silent (no toast) with a label that swaps to "Copied" for 1.2s
 * <CopyButton value={css} label="Copy" showToast={false} timeout={1200} />
 *
 * // Label first, icon after — full-width token rows
 * <CopyButton value={token} label={token} iconPosition="trailing" />
 *
 * // Inside a DropdownMenuContent — keeps the Base UI menu keyboard contract
 * <CopyMenuItem value={hex}>Copy HEX</CopyMenuItem>
 * ```
 *
 * Copied-state feedback, in the order a user notices it:
 *   1. the icon swaps to a check tinted `--success-strong` (the foreground-safe
 *      green; `--success` is a fill and fails AA as ink),
 *   2. a visible `label` swaps to `copiedLabel`,
 *   3. `successMessage` lands in a polite live region so a screen-reader user
 *      gets the same confirmation sighted users get from the check,
 *   4. optionally a toast.
 * All four reset together after `timeout` (default 2000ms).
 */

import { Check, Code, Copy, Hash, Link, Warning } from "@nebutra/icons";
import * as React from "react";
// Toast feedback handled by consumer
import { toast } from "sonner";
import { cn } from "../utils/cn";
import { Button } from "./button";
import { DropdownMenuItem } from "./dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

/**
 * Copied-state tint. `--success` is a *fill* token (white text on top);
 * `--success-strong` is the pair tuned to pass AA as ink and it carries its own
 * dark-theme value, so no `dark:` clause is needed or wanted here.
 */
const COPIED_TINT = "text-[hsl(var(--success-strong))]";
const FAILED_TINT = "text-destructive-strong";
const DEFAULT_COPY_ERROR = "Couldn't copy. Select the text and copy it manually.";

/**
 * Polite live region for the copied confirmation. The check mark is `aria-hidden`
 * (it comes through Button's icon slot), so without this a screen-reader user
 * clicks Copy and hears nothing at all — that was true of the library component
 * and of all seven hand-rolled ones. Empty while idle so it never contributes to
 * the button's accessible name.
 */
function CopiedAnnouncement({
  status,
  message,
  errorMessage,
}: {
  status: CopyStatus;
  message: string;
  errorMessage: string;
}) {
  return (
    <span aria-live="polite" className="sr-only">
      {status === "copied" ? message : status === "failed" ? errorMessage : ""}
    </span>
  );
}

// ============================================================================
// Types
// ============================================================================

export interface CopyButtonProps
  extends Omit<React.ComponentProps<typeof Button>, "onClick" | "onCopy" | "prefix" | "suffix"> {
  /** Value to copy to clipboard */
  value: string;
  /** Button label (if not icon-only) */
  label?: string;
  /**
   * Visible label while the copied state is held. Only rendered when `label` is
   * set — an icon-only button has nowhere to put it and uses the check instead.
   *
   * Pass `false` when the label *is* the payload (a token name, a URL): swapping
   * it for "Copied" would hide the thing the user was reading, and the check
   * carries the confirmation on its own.
   */
  copiedLabel?: string | false;
  /** Success message for toast, and the text announced to screen readers */
  successMessage?: string;
  /** Failure message for toast, and the text announced when the write is refused */
  errorMessage?: string;
  /** Tooltip text — also the accessible name of an icon-only button */
  tooltipText?: string;
  /** Icon type */
  iconType?: "copy" | "link" | "code" | "hash";
  /**
   * Which side of the label the icon sits on. `trailing` is for full-width rows
   * where the value is the label and the affordance belongs at the far edge.
   */
  iconPosition?: "leading" | "trailing";
  /** Show toast on copy */
  showToast?: boolean;
  /** How long the copied state is held, in ms */
  timeout?: number;
  /** Callback after successful copy */
  onCopied?: (value: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export function CopyButton({
  value,
  label,
  copiedLabel = "Copied",
  successMessage = "Copied to clipboard",
  errorMessage = DEFAULT_COPY_ERROR,
  tooltipText = "Copy",
  iconType = "copy",
  iconPosition = "leading",
  showToast = true,
  timeout = 2000,
  onCopied,
  variant = "ghost",
  size = "icon",
  className,
  ...props
}: CopyButtonProps) {
  // Single clipboard implementation for the whole file — the hook owns the
  // timeout, the toast, and the failure path.
  const { copied, failed, status, copy } = useCopyToClipboard({
    successMessage,
    errorMessage,
    showToast,
    timeout,
  });

  const IconComponent = {
    copy: Copy,
    link: Link,
    code: Code,
    hash: Hash,
  }[iconType];

  const handleCopy = async () => {
    if (await copy(value)) onCopied?.(value);
  };

  // Icons go through Button's prefix/suffix so they inherit the size ramp
  // (tiny → 12px, sm → 14px, default → 16px) instead of being pinned to 16.
  //
  // The copied tint lives on the check itself, not on the Button. Put it on the
  // Button and any consumer that passes its own `text-*` in `className` silently
  // wins the merge and deletes the confirmation — two of the seven call sites
  // migrated here do pass one. A class on the svg beats a colour inherited from
  // the parent, so this holds regardless of what the consumer sets.
  const icon = copied ? (
    <Check className={COPIED_TINT} />
  ) : failed ? (
    <Warning className={FAILED_TINT} />
  ) : (
    <IconComponent />
  );
  const iconSlot = iconPosition === "trailing" ? { suffix: icon } : { prefix: icon };

  const button = (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      data-copy-status={status}
      className={cn("transition-colors", className)}
      {...iconSlot}
      {...props}
    >
      {/* `min-w-0` so `truncate` can actually engage: a flex child defaults to
          min-width:auto and refuses to shrink below its text, which is why a
          bare `truncate` on a long label is a no-op. */}
      {label && (
        <span className="min-w-0 truncate">{copied && copiedLabel ? copiedLabel : label}</span>
      )}
      {/* Icon-only: the tooltip text is the accessible name. With a visible
          label the name is the label, so don't emit a second one. */}
      {!label && <span className="sr-only">{tooltipText}</span>}
      <CopiedAnnouncement status={status} message={successMessage} errorMessage={errorMessage} />
    </Button>
  );

  // If it's icon-only, wrap with tooltip
  if (!label) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>
          {/* No trailing "!" — the microcopy rules ban the shout, and the
              wording matches `copiedLabel` so the two confirmations agree. */}
          <p>{copied ? "Copied" : tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
}

// ============================================================================
// Specialized Variants
// ============================================================================

/**
 * Copy ID button - for copying UUIDs, IDs
 */
export function CopyIdButton({
  id,
  className,
  ...props
}: {
  id: string;
  className?: string;
} & Omit<CopyButtonProps, "value" | "iconType" | "tooltipText">) {
  return (
    <CopyButton
      value={id}
      iconType="hash"
      tooltipText="Copy ID"
      successMessage="ID copied"
      className={cn("size-6", className)}
      {...props}
    />
  );
}

/**
 * Copy link button - for copying URLs
 */
export function CopyLinkButton({
  url,
  className,
  ...props
}: {
  url: string;
  className?: string;
} & Omit<CopyButtonProps, "value" | "iconType" | "tooltipText">) {
  return (
    <CopyButton
      value={url}
      iconType="link"
      tooltipText="Copy link"
      successMessage="Link copied"
      className={cn("size-6", className)}
      {...props}
    />
  );
}

/**
 * Copy code button - for copying code snippets
 */
export function CopyCodeButton({
  code,
  className,
  ...props
}: {
  code: string;
  className?: string;
} & Omit<CopyButtonProps, "value" | "iconType" | "tooltipText">) {
  return (
    <CopyButton
      value={code}
      iconType="code"
      tooltipText="Copy code"
      successMessage="Code copied"
      className={cn("size-6", className)}
      {...props}
    />
  );
}

// ============================================================================
// Copy Menu Item
// ============================================================================

export interface CopyMenuItemProps
  extends Omit<React.ComponentProps<typeof DropdownMenuItem>, "onClick" | "onCopy"> {
  /** Value to copy to clipboard */
  value: string;
  /** Visible item text */
  children: React.ReactNode;
  /** Success message for toast, and the text announced to screen readers */
  successMessage?: string;
  /** Failure message, announced when the write is refused */
  errorMessage?: string;
  /** Show toast on copy */
  showToast?: boolean;
  /** How long the copied state is held, in ms */
  timeout?: number;
  /**
   * Close the menu on copy. Defaults to `false`: a menu that closes on select
   * discards its own copied state before it can be seen, and these menus
   * typically offer several values of the same thing (hex, Tailwind class, CSS
   * variable) that a user wants to try in turn.
   */
  closeOnCopy?: boolean;
  /** Callback after successful copy */
  onCopied?: (value: string) => void;
}

/**
 * Copy-to-clipboard as a menu item rather than a button.
 *
 * This is a distinct component and not a `CopyButton` variant on purpose: a
 * `<button>` dropped inside `DropdownMenuContent` is invisible to the menu's
 * keyboard machinery — no arrow-key highlight, no type-ahead, no roving
 * tabindex. Composing over `DropdownMenuItem` keeps all of that.
 */
export function CopyMenuItem({
  value,
  children,
  successMessage = "Copied to clipboard",
  errorMessage = DEFAULT_COPY_ERROR,
  showToast = false,
  timeout = 2000,
  closeOnCopy = false,
  onCopied,
  className,
  ...props
}: CopyMenuItemProps) {
  const { copied, failed, status, copy } = useCopyToClipboard({
    successMessage,
    errorMessage,
    showToast,
    timeout,
  });

  const handleCopy = async () => {
    if (await copy(value)) onCopied?.(value);
  };

  return (
    <DropdownMenuItem
      closeOnClick={closeOnCopy}
      onClick={handleCopy}
      className={cn("cursor-pointer", className)}
      {...props}
    >
      <span className="flex-1">{children}</span>
      {copied ? (
        <Check aria-hidden="true" className={cn("size-4", COPIED_TINT)} />
      ) : failed ? (
        <Warning aria-hidden="true" className={cn("size-4", FAILED_TINT)} />
      ) : (
        <Copy aria-hidden="true" className="size-4 text-muted-foreground" />
      )}
      <CopiedAnnouncement status={status} message={successMessage} errorMessage={errorMessage} />
    </DropdownMenuItem>
  );
}

// ============================================================================
// Inline Copy Field
// ============================================================================

/**
 * Copyable text field - displays value with copy button
 */
export interface CopyableFieldProps {
  value: string;
  label?: string;
  truncate?: boolean;
  className?: string;
}

export function CopyableField({ value, label, truncate = true, className }: CopyableFieldProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {label && <span className="text-sm text-muted-foreground shrink-0">{label}:</span>}
      <code
        className={cn("rounded bg-muted px-2 py-1 text-sm font-mono", truncate && "truncate")}
        title={value}
      >
        {value}
      </code>
      <CopyButton value={value} showToast={false} className="shrink-0 size-7" />
    </div>
  );
}

// ============================================================================
// Hook for programmatic copy
// ============================================================================

export interface UseCopyToClipboardOptions {
  successMessage?: string;
  /** Shown (toast) and announced when the clipboard write is refused. */
  errorMessage?: string;
  showToast?: boolean;
  timeout?: number;
}

export type CopyStatus = "idle" | "copied" | "failed";

export interface UseCopyToClipboardReturn {
  copied: boolean;
  /** True while a refused write is being reported. */
  failed: boolean;
  status: CopyStatus;
  copy: (value: string) => Promise<boolean>;
}

/**
 * The one clipboard implementation. Owns the held "copied" / "failed" state,
 * its reset timer (cleared on unmount), the optional toast, and the failure
 * path — clipboard writes are refused without a user gesture, in insecure
 * contexts, and by some permission policies, and a copy control that fails
 * silently is worse than none.
 */
export function useCopyToClipboard(
  options: UseCopyToClipboardOptions = {},
): UseCopyToClipboardReturn {
  const {
    successMessage = "Copied to clipboard",
    errorMessage = DEFAULT_COPY_ERROR,
    showToast = true,
    timeout = 2000,
  } = options;

  const [status, setStatus] = React.useState<CopyStatus>("idle");
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const hold = React.useCallback(
    (next: CopyStatus) => {
      if (timer.current) clearTimeout(timer.current);
      setStatus(next);
      timer.current = setTimeout(() => setStatus("idle"), timeout);
    },
    [timeout],
  );

  const copy = React.useCallback(
    async (value: string): Promise<boolean> => {
      try {
        if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
        await navigator.clipboard.writeText(value);
        hold("copied");
        if (showToast) toast.success(successMessage);
        return true;
      } catch (error) {
        console.error("Failed to copy:", error);
        hold("failed");
        if (showToast) toast.error(errorMessage);
        return false;
      }
    },
    [hold, successMessage, errorMessage, showToast],
  );

  return { copied: status === "copied", failed: status === "failed", status, copy };
}
