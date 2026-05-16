"use client";

import { Warning as AlertCircle, External as ExternalLink } from "@nebutra/icons";
import * as React from "react";
import { cn } from "../utils/cn";
import { Button, ButtonLink } from "./button";

// =============================================================================
// Types
// =============================================================================

export interface ErrorObject {
  /** Error description */
  message: string;
  /** Optional title for block error surfaces */
  title?: string;
  /** Label for the action link */
  action?: string;
  /** href for the action link */
  link?: string;
  /** Stable request, trace, deployment, or run identifier */
  id?: string;
  /** Short machine-readable code */
  code?: string;
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

export type ErrorSize = "small" | "medium" | "large";

type LinkRecoveryAction = {
  action: string;
  link: string;
  onAction?: never;
  actionLoading?: never;
};

type ButtonRecoveryAction = {
  action: string;
  onAction: () => void;
  link?: never;
  actionLoading?: boolean;
};

type NoRecoveryAction = {
  action?: undefined;
  link?: undefined;
  onAction?: undefined;
  actionLoading?: never;
};

export type ErrorRecoveryAction = LinkRecoveryAction | ButtonRecoveryAction | NoRecoveryAction;

export type ErrorProps = Omit<React.HTMLAttributes<HTMLDivElement>, "title"> &
  ErrorRecoveryAction & {
    /** Error title. Name the resource that failed. */
    title?: string;
    /** Optional compact label above the message, e.g. "Request Error". */
    label?: string;
    /** Hide the label while preserving the message and title. */
    showLabel?: boolean;
    /** Message content. Alternative to `error.message`. */
    children?: React.ReactNode;
    /** Visual density. */
    size?: ErrorSize;
    /** Structured error data. */
    error?: ErrorObject;
    /** Stable request, trace, deployment, or run identifier. */
    errorId?: string;
    /** Label used before the stable identifier. */
    errorIdLabel?: string;
    /** Async announcement mode. Use assertive only for blocking failures. */
    live?: "polite" | "assertive" | "off";
  };

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

const surfaceSize: Record<ErrorSize, string> = {
  small: "gap-2 rounded-[var(--radius-md)] p-3 text-sm",
  medium: "gap-3 rounded-[var(--radius-lg)] p-4 text-sm",
  large: "gap-3 rounded-[var(--radius-lg)] p-5 text-base",
};

const surfaceIconSize: Record<ErrorSize, number> = {
  small: 14,
  medium: 16,
  large: 18,
};

function getActionTarget(link: string | undefined): React.AnchorHTMLAttributes<HTMLAnchorElement> {
  if (link?.startsWith("http")) {
    return { target: "_blank", rel: "noopener noreferrer" };
  }

  return {};
}

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

/**
 * Error — block-level error surface for failed sections, panels, and route boundaries.
 *
 * Use `ErrorMessage` only for legacy inline text. Field validation should prefer
 * the owning form/input primitive.
 */
const ErrorSurface = React.forwardRef<HTMLDivElement, ErrorProps>(
  (
    {
      children,
      label,
      showLabel = true,
      title,
      size = "medium",
      error,
      errorId,
      errorIdLabel = "Request ID",
      live = "polite",
      action,
      link,
      onAction,
      actionLoading = false,
      className,
      role,
      ...props
    },
    ref,
  ) => {
    const message = error?.message ?? children;
    const resolvedTitle = title ?? error?.title;
    const resolvedAction = action ?? error?.action;
    const resolvedLink = link ?? error?.link;
    const resolvedErrorId = errorId ?? error?.id;
    const resolvedRole = role ?? (live === "assertive" ? "alert" : "status");
    const ariaLive = live === "off" ? undefined : live;

    return (
      <div
        ref={ref}
        role={resolvedRole}
        aria-live={ariaLive}
        className={cn(
          "flex w-full border border-destructive/25 bg-destructive/5 text-foreground",
          surfaceSize[size],
          className,
        )}
        {...props}
      >
        <span
          aria-hidden="true"
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-destructive/20 bg-background text-destructive"
        >
          <AlertCircle size={surfaceIconSize[size]} />
        </span>

        <div className="min-w-0 flex-1">
          {label && showLabel ? (
            <p className="mb-1 text-xs font-medium uppercase tracking-normal text-destructive">
              {label}
            </p>
          ) : null}

          {resolvedTitle ? (
            <p className="font-semibold leading-6 text-foreground">{resolvedTitle}</p>
          ) : null}

          {message ? (
            <p className={cn("leading-5 text-muted-foreground", resolvedTitle && "mt-1")}>
              {message}
            </p>
          ) : null}

          {resolvedErrorId ? (
            <details className="mt-3 text-xs text-muted-foreground">
              <summary className="cursor-pointer select-none text-foreground">
                Diagnostic details
              </summary>
              <code className="mt-2 block overflow-x-auto rounded-[var(--radius-sm)] border bg-background px-2 py-1 font-mono text-xs text-muted-foreground">
                {errorIdLabel}: {resolvedErrorId}
                {error?.code ? ` (${error.code})` : ""}
              </code>
            </details>
          ) : null}

          {resolvedAction ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {resolvedLink ? (
                <ButtonLink
                  href={resolvedLink}
                  size="sm"
                  variant="outline"
                  {...getActionTarget(resolvedLink)}
                >
                  {resolvedAction}
                </ButtonLink>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  loading={actionLoading}
                  onClick={onAction}
                >
                  {resolvedAction}
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    );
  },
);
ErrorSurface.displayName = "Error";

export { ErrorSurface as Error };
