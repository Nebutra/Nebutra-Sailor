"use client";

import { Radio as BaseRadio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import * as React from "react";
import { cn } from "../utils/cn";

const RadioGroup = React.forwardRef<
  React.ComponentRef<typeof BaseRadioGroup>,
  React.ComponentPropsWithoutRef<typeof BaseRadioGroup>
>(({ className, ...props }, ref) => {
  return <BaseRadioGroup className={cn("grid gap-2", className)} {...props} ref={ref} />;
});
RadioGroup.displayName = "RadioGroup";

const RadioGroupItem = React.forwardRef<
  React.ComponentRef<typeof BaseRadio.Root>,
  React.ComponentPropsWithoutRef<typeof BaseRadio.Root>
>(({ className, ...props }, ref) => {
  return (
    <BaseRadio.Root
      ref={ref}
      className={cn(
        "aspect-square h-4 w-4 rounded-full border border-fd-primary text-fd-primary shadow-sm outline-none transition-all duration-200 hover:shadow-md focus:outline-none focus-visible:ring-1 focus-visible:ring-fd-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-fd-primary",
        className,
      )}
      {...props}
    >
      <BaseRadio.Indicator className="flex items-center justify-center">
        <svg
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-3.5 w-3.5"
        >
          <circle cx="12" cy="12" r="6" />
        </svg>
      </BaseRadio.Indicator>
    </BaseRadio.Root>
  );
});
RadioGroupItem.displayName = "RadioGroupItem";

export { RadioGroup, RadioGroupItem };
