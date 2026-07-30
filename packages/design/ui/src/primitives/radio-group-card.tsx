"use client";

"use client";

import { Radio as BaseRadio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import type * as React from "react";
import { cn } from "../utils/cn";

const RadioGroupCard = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseRadioGroup> & {
  ref?: React.Ref<React.ComponentRef<typeof BaseRadioGroup>> | undefined;
}) => {
  return <BaseRadioGroup className={cn("grid gap-2", className)} {...props} ref={ref} />;
};
RadioGroupCard.displayName = "RadioGroupCard";

const RadioGroupCardItem = ({
  className,
  children,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseRadio.Root> & {
  ref?: React.Ref<React.ComponentRef<typeof BaseRadio.Root>> | undefined;
}) => {
  return (
    <BaseRadio.Root
      ref={ref}
      className={cn(
        // Base UI radio emits `data-checked` / `data-unchecked`. The Radix-era
        // `data-state-checked:` selectors this shipped with never matched, so the
        // selected card had no visual state at all.
        "relative flex flex-col items-center justify-center rounded-[var(--radius-lg)] border-2 border-muted bg-popover p-4 hover:bg-accent outline-none hover:text-accent-foreground data-[checked]:border-primary focus-visible:outline-none",
        className,
      )}
      {...props}
    >
      {children}
    </BaseRadio.Root>
  );
};
RadioGroupCardItem.displayName = "RadioGroupCardItem";

export { RadioGroupCard, RadioGroupCardItem };
