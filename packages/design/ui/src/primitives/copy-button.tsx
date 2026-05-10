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
 * ```
 */

import { Check, Code, Copy, Hash, Link } from "lucide-react";
import * as React from "react";
// Toast feedback handled by consumer
import { toast } from "sonner";
import { cn } from "../utils/cn";
import { Button } from "./button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

// ============================================================================
// Types
// ============================================================================

export interface CopyButtonProps
  extends Omit<React.ComponentProps<typeof Button>, "onClick" | "onCopy"> {
  /** Value to copy to clipboard */
  value: string;
  /** Button label (if not icon-only) */
  label?: string;
  /** Success message for toast */
  successMessage?: string;
  /** Tooltip text */
  tooltipText?: string;
  /** Icon type */
  iconType?: "copy" | "link" | "code" | "hash";
  /** Show toast on copy */
  showToast?: boolean;
  /** Callback after successful copy */
  onCopied?: (value: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export function CopyButton({
  value,
  label,
  successMessage = "Copied to clipboard",
  tooltipText = "Copy",
  iconType = "copy",
  showToast = true,
  onCopied,
  variant = "ghost",
  size = "icon",
  className,
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);

  const IconComponent = {
    copy: Copy,
    link: Link,
    code: Code,
    hash: Hash,
  }[iconType];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);

      if (showToast) {
        toast.success(successMessage);
      }

      onCopied?.(value);

      // Reset after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Failed to copy to clipboard");
    }
  };

  const button = (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={cn("transition-colors", copied && "text-green-600 dark:text-green-400", className)}
      {...props}
    >
      {copied ? <Check className="size-4" /> : <IconComponent className="size-4" />}
      {label && <span className="ml-1.5">{label}</span>}
      <span className="sr-only">{tooltipText}</span>
    </Button>
  );

  // If it's icon-only, wrap with tooltip
  if (!label) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>
          <p>{copied ? "Copied!" : tooltipText}</p>
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
  showToast?: boolean;
  timeout?: number;
}

export interface UseCopyToClipboardReturn {
  copied: boolean;
  copy: (value: string) => Promise<boolean>;
}

export function useCopyToClipboard(
  options: UseCopyToClipboardOptions = {},
): UseCopyToClipboardReturn {
  const { successMessage = "Copied to clipboard", showToast = true, timeout = 2000 } = options;

  const [copied, setCopied] = React.useState(false);

  const copy = React.useCallback(
    async (value: string): Promise<boolean> => {
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);

        if (showToast) {
          toast.success(successMessage);
        }

        setTimeout(() => setCopied(false), timeout);
        return true;
      } catch (error) {
        console.error("Failed to copy:", error);
        toast.error("Failed to copy to clipboard");
        return false;
      }
    },
    [successMessage, showToast, timeout],
  );

  return { copied, copy };
}
