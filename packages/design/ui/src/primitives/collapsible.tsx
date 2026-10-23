"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "../shared/animation/motion";
import { cn } from "../utils/cn";
import { resolveLazyChild } from "../utils/lazy-child";

const CollapsibleContext = React.createContext<{
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean | undefined;
}>({});

/**
 * Collapsible - Root of a single show/hide region.
 *
 * Holds the open state and shares it with `CollapsibleTrigger` and
 * `CollapsibleContent`. Renders a `div` carrying `data-state` ("open" or
 * "closed") and `data-disabled`. Controlled when `open` is passed, otherwise it
 * keeps its own state starting from `defaultOpen`.
 *
 * @example
 * ```tsx
 * <Collapsible>
 *   <CollapsibleTrigger>3 packages</CollapsibleTrigger>
 *   <CollapsibleContent>@nebutra/ui, @nebutra/tokens, @nebutra/icons</CollapsibleContent>
 * </Collapsible>
 * ```
 */
const Collapsible = ({
  className,
  open: openProp,
  defaultOpen,
  onOpenChange,
  disabled,
  children,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  /** Controlled open state. Pair it with `onOpenChange`; leave it out to let the component keep its own. */
  open?: boolean;
  /**
   * Whether the region starts open when uncontrolled.
   * @default false
   */
  defaultOpen?: boolean;
  /** Called with the next open state when the trigger is pressed. Fires in controlled mode too. */
  onOpenChange?: (open: boolean) => void;
  /**
   * Stops the trigger from toggling the region.
   * @default false
   */
  disabled?: boolean;
} & { ref?: React.Ref<HTMLDivElement> | undefined }) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen || false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange],
  );

  return (
    <CollapsibleContext.Provider value={{ open, onOpenChange: handleOpenChange, disabled }}>
      <div
        ref={ref}
        className={className}
        data-state={open ? "open" : "closed"}
        data-disabled={disabled ? "" : undefined}
        {...props}
      >
        {children}
      </div>
    </CollapsibleContext.Provider>
  );
};
Collapsible.displayName = "Collapsible";

/**
 * CollapsibleTrigger - The control that toggles the region.
 *
 * Renders a `button` with `aria-expanded`, `data-state` and `data-disabled`.
 * It does not set `aria-controls` on its own, and it adds no chevron or other
 * styling: bring your own, usually through `asChild`.
 */
const CollapsibleTrigger = ({
  className,
  asChild,
  children: rawChildren,
  onClick,
  ref,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /**
   * Put the trigger behavior on the single child element (a `Button`, say)
   * instead of rendering a `button` around it.
   * @default false
   */
  asChild?: boolean;
} & {
  ref?: React.Ref<HTMLButtonElement> | undefined;
}) => {
  const children = resolveLazyChild(rawChildren);
  const { open, onOpenChange, disabled } = React.use(CollapsibleContext);

  const handleClick = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;
      onOpenChange?.(!open);
      onClick?.(e);
    },
    [disabled, open, onOpenChange, onClick],
  );

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
      ref,
      onClick: handleClick,
      "data-state": open ? "open" : "closed",
      "data-disabled": disabled ? "" : undefined,
      "aria-expanded": open,
      "aria-controls": props["aria-controls"],
      disabled: disabled || props.disabled,
      ...props,
    });
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={handleClick}
      data-state={open ? "open" : "closed"}
      data-disabled={disabled ? "" : undefined}
      aria-expanded={open}
      disabled={disabled || props.disabled}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
};
CollapsibleTrigger.displayName = "CollapsibleTrigger";

/**
 * CollapsibleContent - The region that shows and hides.
 *
 * Mounted only while open, so closed content is not in the DOM (and not found
 * by find-in-page). Height and opacity animate, and snap under reduced motion.
 * `className` and other props land on the inner element, not the animated wrapper.
 */
const CollapsibleContent = ({
  className,
  children,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> | undefined }) => {
  const { open } = React.use(CollapsibleContext);
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="content"
          initial="collapsed"
          animate="open"
          exit="collapsed"
          variants={{
            open: { opacity: 1, height: "auto" },
            collapsed: { opacity: 0, height: 0 },
          }}
          transition={
            shouldReduceMotion ? { duration: 0 } : { duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }
          }
          className="overflow-hidden"
        >
          <div ref={ref} data-state="open" className={cn("", className)} {...props}>
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
CollapsibleContent.displayName = "CollapsibleContent";

export { Collapsible, CollapsibleContent, CollapsibleTrigger };
