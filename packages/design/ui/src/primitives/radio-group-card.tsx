"use client";

"use client";

import { Radio as BaseRadio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import type * as React from "react";
import { cn } from "../utils/cn";
import { controlFocusVisibleClassName } from "./form-control";

/**
 * Radio group whose choices are selectable cards. A grid wrapper around Base UI's `RadioGroup`:
 * it takes that component's props (`value`, `defaultValue`, `onValueChange`, `name`, `disabled`,
 * `required`) and provides the `radiogroup` role and arrow-key navigation. Lay the cards out with
 * `className`, for example `grid-cols-3`.
 */
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

/**
 * One selectable card in a `RadioGroupCard`; a Base UI `Radio.Root` button that holds any content.
 * It takes that component's props (`value` is required; `disabled` and `readOnly` are supported).
 * The unselected card has a visible `--control-border` edge; the selected card swaps it for a
 * primary border, a 1px primary ring and a faint primary wash.
 */
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
        // The resting edge is --control-border, not the --input hairline: an unselected
        // card has no indicator of its own, so the edge is all that separates it from the
        // page (WCAG 1.4.11, 3:1). Selection swaps it for primary and adds a 1px ring (a
        // 2px edge, drawn only when chosen) plus a faint primary wash.
        "relative flex flex-col items-center justify-center rounded-[var(--radius-card,var(--radius-lg))] border border-[var(--control-border)] bg-popover p-4",
        "transition-[background-color,border-color,box-shadow,color] duration-micro ease-out motion-reduce:transition-none",
        "hover:bg-accent hover:text-accent-foreground",
        "data-[checked]:border-primary data-[checked]:bg-primary/5 data-[checked]:ring-1 data-[checked]:ring-primary",
        // Base UI marks a disabled card (or a card in a disabled group) with data-disabled.
        "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[disabled]:hover:bg-popover",
        controlFocusVisibleClassName,
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
