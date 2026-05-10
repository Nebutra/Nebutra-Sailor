"use client";

import { AlertCircle, ExternalLink } from "lucide-react";
import * as React from "react";
import { cn } from "../utils/cn";

// =============================================================================
// Types
// =============================================================================

export interface ErrorObject {
  /** Error description */
  message: string;
  /** Label for the action link */
  action?: string;
  /** href for the action link */
  link?: string;
}

export interface ErrorMessageProps {
  /** Inline error text (alternative to `error` prop) */
  children?: React.ReactNode;
  /** Optional label prefix shown before the message (e.g. "Email Error") */
  label?: string;
  /** Font size variant */
  size?: "small" | "medium" | "large";
  /** Structured error object — `message` + optional `action`/`link` */
  error?: ErrorObject;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Size maps
// =============================================================================

const textSize: Record<NonNullable<ErrorMessageProps["size"]>, string> = {
  small: "text-xs",
  medium: "text-sm",
  large: "text-base",
};

const iconSize: Record<NonNullable<ErrorMessageProps["size"]>, number> = {
  small: 12,
  medium: 14,
  large: 16,
};

// =============================================================================
// ErrorMessage
// =============================================================================

/**
 * ErrorMessage — inline error indicator with icon, optional label, and action link.
 *
 * @example
 * // Simple inline error
 * <ErrorMessage>This email is already in use.</ErrorMessage>
 *
 * @example
 * // With label prefix
 * <ErrorMessage label="Email Error">This email is already in use.</ErrorMessage>
 *
 * @example
 * // Structured with action link
 * <ErrorMessage error={{ message: "The request failed.", action: "Contact Us", link: "/contact" }} />
 */
export const ErrorMessage = React.forwardRef<HTMLSpanElement, ErrorMessageProps>(
  ({ children, label, size = "medium", error, className }, ref) => {
    const sz = size;

    // Resolve content from either `error` prop or `children`
    const message = error?.message ?? children;

    return (
      <span
        ref={ref}
        role="alert"
        className={cn("inline-flex items-center gap-1.5 text-destructive", textSize[sz], className)}
      >
        <AlertCircle size={iconSize[sz]} aria-hidden="true" className="shrink-0" />

        <span>
          {label && <span className="font-medium">{label}:&nbsp;</span>}
          {message}
          {error?.action && error.link && (
            <>
              {" "}
              <a
                href={error.link}
                className="underline underline-offset-2 hover:no-underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {error.action}
                <ExternalLink size={10} aria-hidden="true" className="ml-0.5 inline" />
              </a>
            </>
          )}
        </span>
      </span>
    );
  },
);
ErrorMessage.displayName = "ErrorMessage";
