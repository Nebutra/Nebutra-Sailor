"use client";

"use client";

import { Radio as BaseRadio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import * as React from "react";
import { cn } from "../utils/cn";

const RadioGroupCard = React.forwardRef<
  React.ComponentRef<typeof BaseRadioGroup>,
  React.ComponentPropsWithoutRef<typeof BaseRadioGroup>
>(({ className, ...props }, ref) => {
  return <BaseRadioGroup className={cn("grid gap-2", className)} {...props} ref={ref} />;
});
RadioGroupCard.displayName = "RadioGroupCard";

const RadioGroupCardItem = React.forwardRef<
  React.ComponentRef<typeof BaseRadio.Root>,
  React.ComponentPropsWithoutRef<typeof BaseRadio.Root>
>(({ className, children, ...props }, ref) => {
  return (
    <BaseRadio.Root
      ref={ref}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent outline-none hover:text-accent-foreground peer-data-state-checked:border-primary data-state-checked:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
      {...props}
    >
      {children}
    </BaseRadio.Root>
  );
});
RadioGroupCardItem.displayName = "RadioGroupCardItem";

export { RadioGroupCard, RadioGroupCardItem };
