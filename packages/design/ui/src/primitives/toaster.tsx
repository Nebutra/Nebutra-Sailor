"use client";

/**
 * Toast — Nebutra notification facade on top of Sonner.
 *
 * Sonner owns the proven rendering, swipe, pause, keyboard, and live-region
 * behavior. This module owns the design-system contract: naming, defaults,
 * tokenized styling, and the Geist-compatible `useToasts` API.
 */

import * as React from "react";
import type { ExternalToast, ToastClassnames, ToasterProps } from "sonner";
import { Toaster as SonnerToaster, toast as sonnerToast } from "sonner";
import { toastTokens } from "../tokens/components/toast";

export type { ExternalToast, ToasterProps };
export { sonnerToast as toast };

type ToastCssVar =
  | "--toast-width"
  | "--toast-radius"
  | "--toast-shadow"
  | "--toast-action-radius"
  | "--toast-action-padding-x"
  | "--toast-action-padding-y"
  | "--toast-title-size"
  | "--toast-description-size"
  | "--toast-line-height"
  | "--toast-title-weight"
  | "--toast-motion-duration"
  | "--toast-motion-easing";

export type ToastTone = "message" | "success" | "warning" | "error";

export interface ToastMessage {
  text: React.ReactNode;
  preserve?: boolean;
  action?: React.ReactNode;
  onAction?: () => void;
  onUndoAction?: () => void;
  description?: React.ReactNode;
  duration?: number;
  id?: string | number;
}

export interface ToastOptions {
  preserve?: boolean;
  description?: React.ReactNode;
  duration?: number;
  id?: string | number;
}

export interface UseToastsReturn {
  message: (message: ToastMessage) => string | number;
  success: (text: React.ReactNode, options?: ToastOptions) => string | number;
  warning: (text: React.ReactNode, options?: ToastOptions) => string | number;
  error: (text: React.ReactNode, options?: ToastOptions) => string | number;
  dismiss: (id?: string | number) => string | number;
}

const DEFAULT_RICH_COLORS = true;
let toastSequence = 0;

const defaultClassNames = {
  toast:
    "group w-[var(--toast-width)] rounded-[var(--toast-radius)] border border-border bg-card text-card-foreground shadow-[var(--toast-shadow)]",
  title:
    "text-[length:var(--toast-title-size)] font-[var(--toast-title-weight)] leading-[var(--toast-line-height)]",
  description:
    "text-[length:var(--toast-description-size)] leading-[var(--toast-line-height)] text-muted-foreground",
  actionButton:
    "rounded-[var(--toast-action-radius)] bg-primary px-[var(--toast-action-padding-x)] py-[var(--toast-action-padding-y)] text-xs font-medium text-primary-foreground",
  cancelButton:
    "rounded-[var(--toast-action-radius)] bg-muted px-[var(--toast-action-padding-x)] py-[var(--toast-action-padding-y)] text-xs font-medium text-foreground",
  closeButton:
    "border-border bg-card text-muted-foreground transition-colors duration-[var(--toast-motion-duration)] ease-[var(--toast-motion-easing)] hover:bg-muted hover:text-foreground",
  success: "border-success bg-success text-success-foreground",
  error: "border-destructive bg-destructive text-destructive-foreground",
  warning: "border-warning bg-warning text-warning-foreground",
  info: "border-info bg-info text-info-foreground",
  default: "border-border bg-card text-card-foreground",
} satisfies ToastClassnames;

function createToastVars(style?: React.CSSProperties) {
  return {
    "--toast-width": `${toastTokens.width}px`,
    "--toast-radius": `${toastTokens.radius}px`,
    "--toast-shadow": toastTokens.shadow,
    "--toast-action-radius": `${toastTokens.action.radius}px`,
    "--toast-action-padding-x": `${toastTokens.action.paddingX}px`,
    "--toast-action-padding-y": `${toastTokens.action.paddingY}px`,
    "--toast-title-size": `${toastTokens.typography.titleSize}px`,
    "--toast-description-size": `${toastTokens.typography.descriptionSize}px`,
    "--toast-line-height": `${toastTokens.typography.lineHeight}px`,
    "--toast-title-weight": toastTokens.typography.titleWeight,
    "--toast-motion-duration": `${toastTokens.motion.duration}ms`,
    "--toast-motion-easing": toastTokens.motion.easing,
    ...style,
  } satisfies React.CSSProperties & Record<ToastCssVar, string | number>;
}

function resolveDuration({
  preserve,
  duration,
  undo,
}: {
  preserve: boolean | undefined;
  duration: number | undefined;
  undo?: boolean | undefined;
}) {
  if (preserve) {
    return Number.POSITIVE_INFINITY;
  }

  return duration ?? (undo ? toastTokens.duration.undo : toastTokens.duration.default);
}

function toExternalToast({ preserve, description, duration, id }: ToastOptions): ExternalToast {
  const toastOptions: ExternalToast = {
    duration: resolveDuration({ preserve, duration }),
  };

  if (id !== undefined) {
    toastOptions.id = id;
  }

  if (description !== undefined) {
    toastOptions.description = description;
  }

  return toastOptions;
}

function mergeToastOptions(toastOptions: ToasterProps["toastOptions"]) {
  return {
    duration: toastTokens.duration.default,
    ...toastOptions,
    classNames: {
      ...defaultClassNames,
      ...toastOptions?.classNames,
    },
  } satisfies ToasterProps["toastOptions"];
}

function createToastId() {
  toastSequence += 1;
  return `nebutra-toast-${toastSequence}`;
}

export function Toaster({
  position = "bottom-right",
  richColors = DEFAULT_RICH_COLORS,
  closeButton = true,
  theme = "system",
  visibleToasts = toastTokens.stack.visibleToasts,
  gap = toastTokens.stack.gap,
  offset = toastTokens.stack.offset,
  mobileOffset = toastTokens.stack.mobileOffset,
  containerAriaLabel = "Notifications",
  toastOptions,
  style,
  ...props
}: ToasterProps = {}) {
  return (
    <SonnerToaster
      position={position}
      richColors={richColors}
      closeButton={closeButton}
      theme={theme}
      visibleToasts={visibleToasts}
      gap={gap}
      offset={offset}
      mobileOffset={mobileOffset}
      containerAriaLabel={containerAriaLabel}
      toastOptions={mergeToastOptions(toastOptions)}
      style={createToastVars(style)}
      {...props}
    />
  );
}

export function useToasts(): UseToastsReturn {
  const message = React.useCallback(
    ({
      text,
      preserve,
      action,
      onAction,
      onUndoAction,
      description,
      duration,
      id,
    }: ToastMessage) => {
      const controlledId = onUndoAction || action ? (id ?? createToastId()) : id;
      const toastOptions: ExternalToast = {
        duration: resolveDuration({
          preserve,
          duration,
          undo: Boolean(onUndoAction),
        }),
      };

      if (controlledId !== undefined) {
        toastOptions.id = controlledId;
      }

      if (description !== undefined) {
        toastOptions.description = description;
      }

      if (onUndoAction) {
        toastOptions.action = {
          label: "Undo",
          onClick: () => {
            onUndoAction();
            sonnerToast.dismiss(controlledId);
          },
        };
      } else if (action) {
        toastOptions.action = {
          label: action,
          onClick: () => {
            onAction?.();
            sonnerToast.dismiss(controlledId);
          },
        };
      }

      return sonnerToast.message(text, toastOptions);
    },
    [],
  );

  const success = React.useCallback((text: React.ReactNode, options: ToastOptions = {}) => {
    return sonnerToast.success(text, toExternalToast(options));
  }, []);

  const warning = React.useCallback((text: React.ReactNode, options: ToastOptions = {}) => {
    return sonnerToast.warning(text, toExternalToast(options));
  }, []);

  const error = React.useCallback((text: React.ReactNode, options: ToastOptions = {}) => {
    return sonnerToast.error(text, toExternalToast(options));
  }, []);

  const dismiss = React.useCallback((id?: string | number) => sonnerToast.dismiss(id), []);

  return {
    dismiss,
    error,
    message,
    success,
    warning,
  };
}
