"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "../shared/animation/motion";
import { cn } from "../utils/cn";

const CollapsibleContext = React.createContext<{
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean | undefined;
}>({});

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
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
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

const CollapsibleTrigger = ({
  className,
  asChild,
  children,
  ref,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean } & {
  ref?: React.Ref<HTMLButtonElement> | undefined;
}) => {
  const { open, onOpenChange, disabled } = React.use(CollapsibleContext);

  const handleClick = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;
      onOpenChange?.(!open);
      props.onClick?.(e);
    },
    [disabled, open, onOpenChange, props.onClick],
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
