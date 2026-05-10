"use client";

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../utils/cn";

const toggleGroupVariants = cva(
  "inline-flex items-center justify-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground",
  {
    variants: {
      variant: {
        default: "",
        outline: "bg-transparent border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const toggleGroupItemVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm",
  {
    variants: {
      variant: {
        default: "",
        outline:
          "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
      },
      size: {
        default: "h-9 px-3",
        sm: "h-8 px-2",
        lg: "h-10 px-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

interface ToggleGroupContextValue extends VariantProps<typeof toggleGroupItemVariants> {
  type?: "single" | "multiple";
  value: string | string[];
  onValueChange: (value: string | string[]) => void;
  disabled?: boolean | undefined;
}

const ToggleGroupContext = React.createContext<ToggleGroupContextValue | null>(null);

function useToggleGroup() {
  const context = React.useContext(ToggleGroupContext);
  if (!context) {
    throw new Error("ToggleGroup internal components must be used within a ToggleGroup");
  }
  return context;
}

export interface ToggleGroupProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toggleGroupVariants>,
    VariantProps<typeof toggleGroupItemVariants> {
  type?: "single" | "multiple";
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  disabled?: boolean;
}

const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>(
  (
    {
      className,
      variant,
      size,
      type = "single",
      value: controlledValue,
      defaultValue,
      onValueChange,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const [uncontrolledValue, setUncontrolledValue] = React.useState<string | string[]>(
      defaultValue !== undefined ? defaultValue : type === "single" ? "" : [],
    );

    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : uncontrolledValue;

    const handleValueChange = React.useCallback(
      (newValue: string | string[]) => {
        if (!isControlled) {
          setUncontrolledValue(newValue);
        }
        onValueChange?.(newValue);
      },
      [isControlled, onValueChange],
    );

    return (
      <div ref={ref} className={cn(toggleGroupVariants({ variant }), className)} {...props}>
        <ToggleGroupContext.Provider
          value={{ variant, size, type, value, onValueChange: handleValueChange, disabled }}
        >
          {children}
        </ToggleGroupContext.Provider>
      </div>
    );
  },
);
ToggleGroup.displayName = "ToggleGroup";

export interface ToggleGroupItemProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "value" | "type">,
    VariantProps<typeof toggleGroupItemVariants> {
  value: string;
}

const ToggleGroupItem = React.forwardRef<HTMLButtonElement, ToggleGroupItemProps>(
  ({ className, variant, size, value, children, ...props }, ref) => {
    const context = useToggleGroup();
    const isDisabled = context.disabled || props.disabled;

    const isSelected = React.useMemo(() => {
      if (context.type === "single") {
        return context.value === value;
      }
      return Array.isArray(context.value) && context.value.includes(value);
    }, [context.value, context.type, value]);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isDisabled) return;

      if (context.type === "single") {
        // If clicking an already selected item in single mode, we often allow deselect.
        // Standard radix-ui also does this unless forced otherwise.
        context.onValueChange(isSelected ? "" : value);
      } else {
        const currentArray = Array.isArray(context.value) ? context.value : [];
        if (isSelected) {
          context.onValueChange(currentArray.filter((v) => v !== value));
        } else {
          context.onValueChange([...currentArray, value]);
        }
      }

      props.onClick?.(e);
    };

    return (
      <button
        ref={ref}
        type="button"
        disabled={isDisabled}
        data-state={isSelected ? "on" : "off"}
        aria-pressed={isSelected}
        className={cn(
          toggleGroupItemVariants({
            variant: variant ?? context.variant,
            size: size ?? context.size,
          }),
          className,
          "focus:z-10", // Prevent focus outline from being clipped by siblings
        )}
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    );
  },
);
ToggleGroupItem.displayName = "ToggleGroupItem";

export { ToggleGroup, ToggleGroupItem, toggleGroupItemVariants, toggleGroupVariants };
