"use client";

import {
  DirectionProvider,
  type TextDirection,
  useDirection,
} from "@base-ui/react/direction-provider";
import { Popover as BasePopover } from "@base-ui/react/popover";
import * as React from "react";
import { overlayTokens } from "../tokens/components/overlay";
import { HoverCardContext } from "./hover-card-context";

export { HoverCardContent } from "./hover-card-content";
export { HoverCardTrigger } from "./hover-card-trigger";

type RootProps = React.ComponentPropsWithoutRef<typeof BasePopover.Root>;
type ChangeDetails = Parameters<NonNullable<RootProps["onOpenChange"]>>[1];

/** Change details for opens and closes the wrapper itself decides (hover, focus, blur). */
function createDetails(reason: ChangeDetails["reason"], event: Event): ChangeDetails {
  const details = {
    reason,
    event,
    trigger: undefined,
    isCanceled: false,
    isPropagationAllowed: false,
    cancel() {
      details.isCanceled = true;
    },
    allowPropagation() {
      details.isPropagationAllowed = true;
    },
    preventUnmountOnClose() {},
  };
  return details as unknown as ChangeDetails;
}

function isFocusGuard(target: EventTarget | null) {
  return target instanceof Element && target.hasAttribute("data-base-ui-focus-guard");
}

/**
 * HoverCard - Preview card revealed on pointer hover, keyboard focus or a click
 *
 * @description
 * Groups a trigger and a card. The card opens after the pointer rests on the wrapper or after the
 * trigger receives keyboard focus (both wait `openDelay`), or immediately on a click, tap or
 * Enter/Space on the trigger, which toggles it. It closes `closeDelay` after the pointer leaves or
 * after focus leaves both the trigger and the card, and at once on Escape (focus stays on the
 * trigger) or an outside press. Focus never moves into the card on open; Tab reaches its
 * focusable content in page order and leaves it again, so it is not a focus trap. Under
 * `dir="rtl"` the logical `inline-start` / `inline-end` sides of `HoverCardContent` mirror.
 */
const HoverCard = ({
  openDelay = overlayTokens.motion.hoverOpenDelay,
  closeDelay = overlayTokens.motion.hoverCloseDelay,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
  ...props
}: RootProps & {
  /**
   * Milliseconds the pointer must rest on the wrapper, or keyboard focus must stay on the trigger,
   * before the card opens. A click, tap or Enter/Space opens it immediately.
   * @default 200
   */
  openDelay?: number;
  /**
   * Milliseconds after the pointer leaves, or focus leaves the trigger and the card, before the
   * card closes.
   * @default 100
   */
  closeDelay?: number;
  /** The `HoverCardTrigger` and `HoverCardContent` parts. */
  children: React.ReactNode;
}) => {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const open = openProp ?? internalOpen;
  const openRef = React.useRef(open);
  openRef.current = open;
  const latest = React.useRef({ openProp, onOpenChange });
  latest.current = { openProp, onOpenChange };

  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const openTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoveredRef = React.useRef(false);
  // True while a focus-driven open is holding the card, so a pointer leaving does not close it.
  const focusHeldRef = React.useRef(false);
  // True between pointerdown and pointerup: focus caused by a press is not keyboard focus.
  const pressingRef = React.useRef(false);
  // Set for one task around Base UI restoring focus to the trigger after a close.
  const suppressFocusRef = React.useRef(false);
  const inputTypeRef = React.useRef<string | null>(null);

  const clearTimers = React.useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  }, []);
  React.useEffect(() => clearTimers, [clearTimers]);

  const apply = React.useCallback((next: boolean, details: ChangeDetails) => {
    latest.current.onOpenChange?.(next, details);
    if (details.isCanceled) return;
    if (latest.current.openProp === undefined) setInternalOpen(next);
    openRef.current = next;
  }, []);

  const contextValue = React.useMemo(
    () => ({
      suppressFocusOpen() {
        suppressFocusRef.current = true;
        setTimeout(() => {
          suppressFocusRef.current = false;
        }, 0);
      },
    }),
    [],
  );

  function scheduleOpen(delay: number, reason: ChangeDetails["reason"], event: Event) {
    if (openTimer.current) clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => {
      openTimer.current = null;
      if (!openRef.current) apply(true, createDetails(reason, event));
    }, delay);
  }

  function scheduleClose(delay: number, reason: ChangeDetails["reason"], event: Event) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      focusHeldRef.current = false;
      // Focus left while the pointer is still over the card: its mouseleave closes it.
      if (hoveredRef.current && reason === "focus-out") return;
      if (openRef.current) apply(false, createDetails(reason, event));
    }, delay);
  }

  function handleMouseEnter(event: React.MouseEvent) {
    // Touch emulates a mouseenter just before the click; the click owns the toggle.
    if (inputTypeRef.current === "touch") return;
    hoveredRef.current = true;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
    scheduleOpen(openDelay, "trigger-hover", event.nativeEvent);
  }

  function handleMouseLeave(event: React.MouseEvent) {
    hoveredRef.current = false;
    if (openTimer.current) clearTimeout(openTimer.current);
    openTimer.current = null;
    if (focusHeldRef.current) return; // keyboard focus is still on the trigger or the card
    scheduleClose(closeDelay, "trigger-hover", event.nativeEvent);
  }

  function handleFocus(event: React.FocusEvent) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
    if (pressingRef.current) return; // a mouse or touch press focused it; the click handles that
    if (suppressFocusRef.current) return; // focus restored after a close is not a new focus
    focusHeldRef.current = true;
    if (!openRef.current) scheduleOpen(openDelay, "trigger-focus", event.nativeEvent);
  }

  function handleBlur(event: React.FocusEvent) {
    if (openTimer.current) clearTimeout(openTimer.current);
    openTimer.current = null;
    // Focus moving trigger -> card (or back) fires blur then focus in the same task; the focus
    // handler cancels this timer before it can run.
    scheduleClose(closeDelay, "focus-out", event.nativeEvent);
  }

  function handleRootOpenChange(next: boolean, details: ChangeDetails) {
    // Focus leaving is owned by the wrapper blur handler so closeDelay applies. Only a Tab past the
    // card (it lands on a Base UI focus guard) closes at once: the guard needs the card unmounted
    // to hand focus to the next control on the page.
    if (details.reason === "focus-out" && !isFocusGuard(details.event.target)) return;
    clearTimers();
    if (details.reason === "trigger-press") {
      // A click on a card the pointer hover just opened keeps it open instead of toggling it shut.
      if (!next && inputTypeRef.current === "mouse") return;
      focusHeldRef.current = next && inputTypeRef.current === "keyboard";
    } else if (!next) {
      focusHeldRef.current = false;
    }
    apply(next, details);
  }

  // Base UI resolves inline-start / inline-end from its DirectionProvider, not from the DOM `dir`
  // attribute, so read the nearest `dir` here and hand it down.
  const contextDirection = useDirection();
  const [domDirection, setDomDirection] = React.useState<TextDirection | undefined>();
  React.useLayoutEffect(() => {
    const attr = wrapperRef.current?.closest("[dir]")?.getAttribute("dir");
    const next = attr === "rtl" || attr === "ltr" ? attr : undefined;
    setDomDirection((prev) => (prev === next ? prev : next));
  });

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hover/focus state wrapper — the interactive trigger lives inside HoverCardTrigger
    <div
      ref={wrapperRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={() => {
        inputTypeRef.current = "keyboard";
      }}
      onPointerDown={(event) => {
        inputTypeRef.current = event.pointerType;
        pressingRef.current = true;
      }}
      onPointerEnter={(event) => {
        inputTypeRef.current = event.pointerType;
      }}
      onPointerUp={() => {
        pressingRef.current = false;
      }}
      onPointerCancel={() => {
        pressingRef.current = false;
      }}
      onClick={() => {
        pressingRef.current = false;
      }}
      className="inline-block relative"
    >
      <DirectionProvider direction={domDirection ?? contextDirection}>
        <HoverCardContext.Provider value={contextValue}>
          <BasePopover.Root {...props} open={open} onOpenChange={handleRootOpenChange}>
            {children}
          </BasePopover.Root>
        </HoverCardContext.Provider>
      </DirectionProvider>
    </div>
  );
};
HoverCard.displayName = "HoverCard";

export { HoverCard };
