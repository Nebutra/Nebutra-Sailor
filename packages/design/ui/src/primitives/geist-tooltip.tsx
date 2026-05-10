"use client";

import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";
import { cn } from "../utils/cn";

export type GeistTooltipType = "default" | "success" | "warning" | "error" | "violet";
export type GeistTooltipPosition = "top" | "bottom" | "left" | "right";
export type GeistTooltipBoxAlign = "left" | "right" | "center";

export interface GeistTooltipProps {
  /** The element that triggers the tooltip on hover/focus */
  children: React.ReactNode;
  /** The content of the tooltip */
  text: React.ReactNode;
  /** Positioning of the tooltip relative to the trigger */
  position?: GeistTooltipPosition;
  /** Alignment of the tooltip bounding box */
  boxAlign?: GeistTooltipBoxAlign;
  /** Tooltip appearance type */
  type?: GeistTooltipType;
  /** Whether to show a delay before the tooltip appears (or a custom delay in ms) */
  delay?: boolean | number;
  /** Whether to display the small arrow pointing to the trigger */
  tip?: boolean;
  /** Whether the text inside the tooltip is centered */
  center?: boolean;
  /** Custom className for the tooltip container */
  className?: string;
  /** Custom base-ui root props */
  rootProps?: React.ComponentPropsWithoutRef<typeof BaseTooltip.Root>;
  /** Custom base-ui popup props */
  popupProps?: React.ComponentPropsWithoutRef<typeof BaseTooltip.Popup>;
}

const typeStyles: Record<GeistTooltipType, string> = {
  default: "bg-primary text-primary-foreground",
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  error: "bg-destructive text-destructive-foreground",
  violet: "bg-violet text-white", // Violet is often custom in Geist
};

// Map Geist API to Base-UI align property
const getBaseAlign = (boxAlign: GeistTooltipBoxAlign): "start" | "center" | "end" => {
  switch (boxAlign) {
    case "left":
      return "start";
    case "right":
      return "end";
    default:
      return "center";
  }
};

export const GeistTooltip = ({
  children,
  text,
  position = "top",
  boxAlign = "center",
  type = "default",
  delay = true,
  tip = true,
  center = true,
  className,
  rootProps,
  popupProps,
}: GeistTooltipProps) => {
  const [open, setOpen] = React.useState(false);

  const delayMs = typeof delay === "number" ? delay : delay ? 500 : 0;

  // Custom styles for type
  const colorClasses = typeStyles[type] || typeStyles.default;

  return (
    <BaseTooltip.Provider delay={delayMs}>
      <BaseTooltip.Root open={open} onOpenChange={setOpen} {...rootProps}>
        <BaseTooltip.Trigger
          render={
            React.isValidElement(children) ? (
              (children as React.ReactElement<Record<string, unknown>>)
            ) : (
              <span>{children}</span>
            )
          }
        />
        <AnimatePresence>
          {open && (
            <BaseTooltip.Portal>
              <BaseTooltip.Positioner
                side={position}
                align={getBaseAlign(boxAlign)}
                sideOffset={tip ? 5 : 8}
              >
                <BaseTooltip.Popup
                  {...popupProps}
                  render={
                    <motion.div
                      initial={{
                        opacity: 0,
                        scale: 0.96,
                        y: position === "top" ? 4 : position === "bottom" ? -4 : 0,
                        x: position === "left" ? 4 : position === "right" ? -4 : 0,
                      }}
                      animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.1 } }}
                      transition={{
                        type: "spring",
                        damping: 30,
                        stiffness: 400,
                        mass: 0.8,
                      }}
                      className={cn(
                        "z-50 px-3 py-1.5 text-xs leading-tight tracking-tight font-medium rounded-md shadow-md",
                        "flex items-center",
                        colorClasses,
                        center ? "text-center" : "text-left",
                        className,
                      )}
                    >
                      {text}
                      {tip && (
                        <BaseTooltip.Arrow
                          className={cn(
                            "w-2.5 h-2.5 rotate-45 border-none",
                            type === "default" && "bg-primary text-primary",
                            type === "success" && "bg-success text-success",
                            type === "warning" && "bg-warning text-warning",
                            type === "error" && "bg-destructive text-destructive",
                            type === "violet" && "bg-violet text-violet",
                          )}
                          style={{
                            // Base UI naturally positions the arrow, but we add visual flair
                            boxShadow: "-1px -1px 1px rgba(0,0,0,0.05)",
                          }}
                        />
                      )}
                    </motion.div>
                  }
                />
              </BaseTooltip.Positioner>
            </BaseTooltip.Portal>
          )}
        </AnimatePresence>
      </BaseTooltip.Root>
    </BaseTooltip.Provider>
  );
};
