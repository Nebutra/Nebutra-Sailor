import { cva, type VariantProps } from "class-variance-authority";
import { type HTMLMotionProps, motion } from "framer-motion";
import * as React from "react";
import { cn } from "../utils";

const toggleVariants = cva(
  "peer relative inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input overflow-hidden",
  {
    variants: {
      size: {
        normal: "h-6 w-11",
        large: "h-8 w-[3.25rem]",
      },
      color: {
        default: "", // uses primary
        amber: "data-[state=checked]:bg-amber-500",
        red: "data-[state=checked]:bg-red-500",
        green: "data-[state=checked]:bg-green-500",
      },
    },
    defaultVariants: {
      size: "normal",
      color: "default",
    },
  },
);

// Map thumb sizes in pixels to compute framer-motion transformations precisely
const SHIFTS = {
  normal: 20, // 44(w) - 24(h) = 20
  large: 26, // 52(w) - 32(h) + border compensation = ~26
};

const THUMB_DIM = {
  normal: 20, // h-5 w-5
  large: 28, // h-7 w-7
};

export interface ToggleProps
  extends Omit<HTMLMotionProps<"button">, "size" | "color" | "onChange">,
    VariantProps<typeof toggleVariants> {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  icon?: {
    checked?: React.ReactNode;
    unchecked?: React.ReactNode;
  };
  direction?: "switch-first" | "switch-last";
  /** Required for native form submission support */
  name?: string;
  value?: string;
}

const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  (
    {
      className,
      size = "normal",
      color,
      checked: controlledChecked,
      defaultChecked = false,
      onChange,
      icon,
      direction = "switch-last",
      children,
      disabled,
      name,
      value = "on",
      ...props
    },
    ref,
  ) => {
    const isControlled = controlledChecked !== undefined;
    const [internalChecked, setInternalChecked] = React.useState(defaultChecked);

    const isChecked = isControlled ? controlledChecked : internalChecked;

    const handleChange = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;
      if (!isControlled) {
        setInternalChecked(!isChecked);
      }
      onChange?.(!isChecked);
      props.onClick?.(e);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (!isControlled) {
          setInternalChecked(!isChecked);
        }
        onChange?.(!isChecked);
      }
      props.onKeyDown?.(e);
    };

    const state = isChecked ? "checked" : "unchecked";
    const xShift = isChecked ? SHIFTS[size || "normal"] : 0;
    const thumbSize = THUMB_DIM[size || "normal"];

    const SwitchElement = (
      <>
        {/* Hidden checkbox for native form integration */}
        {name && (
          <input
            type="checkbox"
            name={name}
            value={value}
            checked={isChecked}
            readOnly
            className="hidden"
          />
        )}
        <motion.button
          type="button"
          role="switch"
          aria-checked={isChecked}
          data-state={state}
          disabled={disabled}
          className={cn(toggleVariants({ size, color, className }))}
          ref={ref}
          onClick={handleChange}
          onKeyDown={handleKeyDown}
          {...(!disabled ? { whileTap: { scale: 0.94 } } : {})}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          style={{ WebkitTapHighlightColor: "transparent" }}
          {...props}
        >
          {/* Thumb */}
          <motion.span
            data-state={state}
            className={cn(
              "pointer-events-none absolute left-0 flex items-center justify-center rounded-full bg-background shadow-sm ring-0",
            )}
            style={{ width: thumbSize, height: thumbSize }}
            animate={{
              x: xShift,
              // Micro-animation: thumb widens slightly during movement, adding momentum
              width: thumbSize,
            }}
            transition={{
              type: "spring",
              stiffness: 700,
              damping: 40,
              mass: 0.8,
            }}
          >
            {/* Embedded Icons inside thumb with opacity crossfading */}
            {icon && (
              <div className="relative flex h-full w-full items-center justify-center text-foreground/70">
                <motion.span
                  className="absolute inset-0 flex items-center justify-center"
                  initial={false}
                  animate={{ opacity: isChecked ? 1 : 0, scale: isChecked ? 1 : 0.8 }}
                  transition={{ duration: 0.15 }}
                  aria-hidden="true"
                >
                  {icon.checked}
                </motion.span>
                <motion.span
                  className="absolute inset-0 flex items-center justify-center"
                  initial={false}
                  animate={{ opacity: !isChecked ? 1 : 0, scale: !isChecked ? 1 : 0.8 }}
                  transition={{ duration: 0.15 }}
                  aria-hidden="true"
                >
                  {icon.unchecked}
                </motion.span>
              </div>
            )}
          </motion.span>
        </motion.button>
      </>
    );

    if (!children) {
      return SwitchElement;
    }

    return (
      <label
        className={cn(
          "flex items-center gap-3 cursor-pointer",
          disabled && "cursor-not-allowed opacity-50",
          direction === "switch-first" ? "flex-row" : "flex-row-reverse justify-end",
        )}
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        {direction === "switch-first" && SwitchElement}
        <span className="text-sm font-medium leading-none select-none">
          {children as React.ReactNode}
        </span>
        {direction === "switch-last" && SwitchElement}
      </label>
    );
  },
);

Toggle.displayName = "Toggle";

export { Toggle };
