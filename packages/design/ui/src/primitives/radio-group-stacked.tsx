"use client";

"use client";

import { Radio as BaseRadio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import type * as React from "react";
import { cn } from "../utils/cn";

const RadioGroupStacked = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseRadioGroup> & {
  ref?: React.Ref<React.ComponentRef<typeof BaseRadioGroup>> | undefined;
}) => {
  return <BaseRadioGroup className={cn("grid gap-2", className)} {...props} ref={ref} />;
};
RadioGroupStacked.displayName = "RadioGroupStacked";

const RadioGroupStackedItem = ({
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
        "relative flex w-full flex-row items-center justify-between rounded-[var(--radius-lg)] border px-4 py-3 text-left hover:bg-accent outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 peer-data-state-checked:border-primary peer-data-state-checked:bg-primary/5 data-state-checked:border-primary data-state-checked:bg-primary/5",
        className,
      )}
      {...props}
    >
      <div className="flex w-full items-center">
        <BaseRadio.Indicator className="absolute left-4 flex items-center justify-center"></BaseRadio.Indicator>
        <div className="flex w-full items-center">{children}</div>
      </div>
    </BaseRadio.Root>
  );
};
RadioGroupStackedItem.displayName = "RadioGroupStackedItem";

export { RadioGroupStacked, RadioGroupStackedItem };
