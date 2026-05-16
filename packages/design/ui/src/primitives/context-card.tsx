"use client";

import { Popover as BasePopover } from "@base-ui/react/popover";
import * as React from "react";
import { type ContextCardWidth, contextCardTokens } from "../tokens/components/context-card";
import { cn } from "../utils/cn";

// =============================================================================
// Types
// =============================================================================

export type ContextCardSide = "top" | "bottom" | "left" | "right";
export type ContextCardAlign = "start" | "center" | "end";

type ContextCardCssVar =
  | "--context-card-width"
  | "--context-card-padding-x"
  | "--context-card-padding-y"
  | "--context-card-stack-gap"
  | "--context-card-section-gap"
  | "--context-card-row-gap"
  | "--context-card-radius"
  | "--context-card-body-size"
  | "--context-card-metadata-size"
  | "--context-card-duration"
  | "--context-card-easing";

export interface ContextCardTriggerProps {
  /** Content shown in the context card */
  content: React.ReactNode;
  /** Which side the card appears on */
  side?: ContextCardSide;
  /** Alignment relative to the trigger */
  align?: ContextCardAlign;
  /** Offset from the trigger in pixels */
  sideOffset?: number;
  /** Cross-axis offset from the trigger in pixels */
  alignOffset?: number;
  /** Width token for the panel */
  width?: ContextCardWidth;
  /** Entry delay in milliseconds. Defaults to the component motion token. */
  openDelay?: number;
  /** Exit delay in milliseconds. Defaults to the component motion token. */
  closeDelay?: number;
  /** The element that triggers the card on hover/focus */
  children: React.ReactNode;
  /** Additional CSS classes for the card */
  className?: string;
}

export interface ContextCardMetadataItem {
  id?: string;
  label: React.ReactNode;
  value?: React.ReactNode;
}

export interface ContextCardEntityProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  metadata?: readonly ContextCardMetadataItem[];
  action?: React.ReactNode;
}

const CONTEXT_CARD_FALLBACK = "—";

const contextCardCssVars = (width: ContextCardWidth) =>
  ({
    "--context-card-width": `${contextCardTokens.width[width]}px`,
    "--context-card-padding-x": `${contextCardTokens.padding.x}px`,
    "--context-card-padding-y": `${contextCardTokens.padding.y}px`,
    "--context-card-stack-gap": `${contextCardTokens.gap.stack}px`,
    "--context-card-section-gap": `${contextCardTokens.gap.section}px`,
    "--context-card-row-gap": `${contextCardTokens.gap.row}px`,
    "--context-card-radius": `${contextCardTokens.borderRadius}px`,
    "--context-card-body-size": `${contextCardTokens.fontSize.body}px`,
    "--context-card-metadata-size": `${contextCardTokens.fontSize.metadata}px`,
    "--context-card-duration": `${contextCardTokens.motion.duration}ms`,
    "--context-card-easing": contextCardTokens.motion.easing,
  }) satisfies React.CSSProperties & Record<ContextCardCssVar, string>;

function composeRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }
  };
}

function isFocusableElement(element: Element): element is HTMLElement {
  return element instanceof HTMLElement && !element.hasAttribute("disabled");
}

function focusFirstPanelTarget(panel: HTMLElement | null) {
  if (!panel) return;
  const target = panel.querySelector(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );
  if (target && isFocusableElement(target)) {
    target.focus();
    return;
  }
  panel.focus();
}

// =============================================================================
// ContextCardTrigger
// =============================================================================

const ContextCardTrigger = React.forwardRef<HTMLButtonElement, ContextCardTriggerProps>(
  (
    {
      content,
      side = "top",
      align = "center",
      sideOffset = 8,
      alignOffset = 0,
      width = "md",
      openDelay = contextCardTokens.motion.openDelay,
      closeDelay = contextCardTokens.motion.closeDelay,
      children,
      className,
    },
    forwardedRef,
  ) => {
    const [open, setOpen] = React.useState(false);
    const triggerRef = React.useRef<HTMLButtonElement | null>(null);
    const panelRef = React.useRef<HTMLDivElement | null>(null);
    const openTimerRef = React.useRef<number | null>(null);
    const closeTimerRef = React.useRef<number | null>(null);

    const clearTimers = React.useCallback(() => {
      if (openTimerRef.current) window.clearTimeout(openTimerRef.current);
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
      openTimerRef.current = null;
      closeTimerRef.current = null;
    }, []);

    const scheduleOpen = React.useCallback(() => {
      clearTimers();
      openTimerRef.current = window.setTimeout(() => setOpen(true), openDelay);
    }, [clearTimers, openDelay]);

    const scheduleClose = React.useCallback(() => {
      clearTimers();
      closeTimerRef.current = window.setTimeout(() => setOpen(false), closeDelay);
    }, [clearTimers, closeDelay]);

    const closeNow = React.useCallback(() => {
      clearTimers();
      setOpen(false);
    }, [clearTimers]);

    React.useEffect(() => clearTimers, [clearTimers]);

    const triggerElement = React.isValidElement(children) ? children : <span>{children}</span>;
    const renderTrigger = triggerElement as React.ReactElement<Record<string, unknown>>;

    return (
      <BasePopover.Root open={open} onOpenChange={setOpen}>
        <BasePopover.Trigger
          ref={composeRefs(triggerRef, forwardedRef)}
          render={renderTrigger}
          onMouseEnter={scheduleOpen}
          onMouseLeave={scheduleClose}
          onFocus={scheduleOpen}
          onBlur={scheduleClose}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              closeNow();
              triggerRef.current?.focus();
              return;
            }
            if ((event.key === "ArrowDown" || event.key === "Enter") && !open) {
              event.preventDefault();
              clearTimers();
              setOpen(true);
              window.requestAnimationFrame(() => focusFirstPanelTarget(panelRef.current));
            }
          }}
        />
        <BasePopover.Portal>
          <BasePopover.Positioner
            side={side}
            align={align}
            sideOffset={sideOffset}
            alignOffset={alignOffset}
            className="z-50"
          >
            <BasePopover.Popup
              ref={panelRef}
              tabIndex={-1}
              onMouseEnter={scheduleOpen}
              onMouseLeave={scheduleClose}
              onFocus={scheduleOpen}
              onBlur={scheduleClose}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  closeNow();
                  triggerRef.current?.focus();
                }
              }}
              style={contextCardCssVars(width) as React.CSSProperties}
              className={cn(
                "z-50 flex w-[var(--context-card-width)] flex-col gap-[var(--context-card-stack-gap)] overflow-hidden",
                "rounded-[var(--context-card-radius)] border border-border bg-popover",
                "px-[var(--context-card-padding-x)] py-[var(--context-card-padding-y)]",
                "text-[length:var(--context-card-body-size)] text-popover-foreground shadow-md outline-none",
                "transition-[opacity,transform,display] duration-[var(--context-card-duration)] ease-[var(--context-card-easing)]",
                "data-starting-style:opacity-0 data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-ending-style:scale-[0.98]",
                "motion-reduce:transition-none motion-reduce:data-starting-style:scale-100 motion-reduce:data-ending-style:scale-100",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                "data-[side=bottom]:origin-top data-[side=left]:origin-right data-[side=right]:origin-left data-[side=top]:origin-bottom",
                className,
              )}
            >
              {content}
            </BasePopover.Popup>
          </BasePopover.Positioner>
        </BasePopover.Portal>
      </BasePopover.Root>
    );
  },
);
ContextCardTrigger.displayName = "ContextCard.Trigger";

const ContextCardEntity = React.forwardRef<HTMLDivElement, ContextCardEntityProps>(
  ({ title, description, metadata, action, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col gap-[var(--context-card-section-gap)]", className)}
      {...props}
    >
      <div className="flex flex-col gap-[var(--context-card-row-gap)]">
        <p className="truncate font-medium leading-tight text-popover-foreground">{title}</p>
        {description ? (
          <p className="text-muted-foreground text-[length:var(--context-card-metadata-size)] leading-snug">
            {description}
          </p>
        ) : null}
      </div>
      {metadata?.length ? (
        <dl className="grid gap-[var(--context-card-row-gap)] text-[length:var(--context-card-metadata-size)]">
          {metadata.map((item) => (
            <div
              key={item.id ?? String(item.label)}
              className="grid grid-cols-[minmax(5rem,auto)_1fr] items-baseline gap-[var(--context-card-section-gap)]"
            >
              <dt className="text-muted-foreground">{item.label}</dt>
              <dd className="min-w-0 truncate text-right text-popover-foreground">
                {item.value ?? CONTEXT_CARD_FALLBACK}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {action ? <div className="pt-[var(--context-card-row-gap)]">{action}</div> : null}
    </div>
  ),
);
ContextCardEntity.displayName = "ContextCard.Entity";

// =============================================================================
// Compound Export
// =============================================================================

/**
 * ContextCard — Geist-style hover card that shows rich content on hover/focus.
 *
 * @example
 * ```tsx
 * <ContextCard.Trigger
 *   content={<ContextCard.Entity title="Nebula Console" description="nebutra/production" />}
 *   side="top"
 * >
 *   <button type="button">Nebula Console</button>
 * </ContextCard.Trigger>
 * ```
 */
export const ContextCard = {
  Entity: ContextCardEntity,
  Trigger: ContextCardTrigger,
} as const;
