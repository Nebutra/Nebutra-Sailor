"use client";

import { Minus } from "@nebutra/icons";
import { OTPInput, OTPInputContext, type RenderProps } from "input-otp";
import * as React from "react";
import { cn } from "../utils/cn";

export interface InputOTPProps {
  /** Number of characters in the code. Typed or pasted input beyond it is cut off. */
  maxLength: number;
  /** Current code. Pass it with `onValueChange` to control the field. */
  value?: string;
  /**
   * Fires with the new code. Same as `onValueChange`, which wins when both are set.
   * @deprecated Use `onValueChange` — `onChange` conventionally receives an event. */
  onChange?: (newValue: string) => void;
  /** Fires with the new code on every accepted keystroke, paste or deletion. */
  onValueChange?: (newValue: string) => void;
  /** Fires once when the code reaches `maxLength`, whether `value` is controlled or not. */
  onComplete?: (value: string) => void;
  /** Render-prop alternative to `children`; receives the live slot state. */
  render?: (props: RenderProps) => React.ReactNode;
  /** Slot layout built from `InputOTPGroup`, `InputOTPSlot` and `InputOTPSeparator`. */
  children?: React.ReactNode;
  /** Applied to the element that wraps the slots. */
  containerClassName?: string;
  /** Applied to the `<input>` that receives the typing. */
  className?: string;
  /** Regular-expression source the code must match, e.g. `^\d+$`. Typed or pasted text that would break it is rejected. */
  pattern?: string;
  /**
   * Alignment of the input's text.
   * @default "left"
   */
  textAlign?: "left" | "center" | "right";
  /** Blocks focus and input, and dims the whole control. */
  disabled?: boolean;
  /** Id of the input, so an external `<label htmlFor>` can name it. */
  id?: string;
  /** Form field name submitted with the code. */
  name?: string;
  /** Accessible name when there is no visible label. */
  "aria-label"?: string;
  /** Id of the element that labels the control. */
  "aria-labelledby"?: string;
  /** Ids of elements that describe the control, such as a hint or an error message. */
  "aria-describedby"?: string;
  /** Announces the code as invalid. The slots do not restyle themselves from it; use `error` for that. */
  "aria-invalid"?: boolean | "true" | "false";
  /**
   * Marks the code as wrong: sets `aria-invalid` on the input and gives every slot a destructive
   * border and focus ring. It shows no message, so link one with `aria-describedby`.
   * @default false
   */
  error?: boolean;
}

/** Tells the slots drawn inside an `InputOTP` whether the field is in its error state. */
const InputOTPErrorContext = React.createContext(false);

/**
 * One-time-code entry. Renders a single transparent input over the slots, so typing, paste,
 * autofill (`autocomplete="one-time-code"`) and deletion behave like one field,
 * and draws the slots from `children` or `render`.
 */
const InputOTP = ({
  className,
  containerClassName,
  children,
  render,
  ref,
  onValueChange,
  onChange: legacyOnChange,
  error = false,
  ...rest
}: InputOTPProps & { ref?: React.Ref<HTMLInputElement> | undefined }) => {
  // The underlying OTPInput calls onChange with the value; ours is onValueChange.
  const props = {
    ...rest,
    ...(error ? { "aria-invalid": true } : {}),
    onChange: onValueChange ?? legacyOnChange,
  };
  // Build the OTPInput props based on whether render or children is provided
  const otpProps = render ? { render, ...props } : { children, ...props };

  return (
    <InputOTPErrorContext.Provider value={error}>
      <OTPInput
        ref={ref}
        containerClassName={cn(
          "flex items-center gap-2 has-[:disabled]:opacity-50",
          containerClassName,
        )}
        className={cn("disabled:cursor-not-allowed", className)}
        {...(otpProps as React.ComponentProps<typeof OTPInput>)}
      />
    </InputOTPErrorContext.Provider>
  );
};
InputOTP.displayName = "InputOTP";

export type InputOTPGroupProps = React.ComponentPropsWithoutRef<"div">;

/** Joins consecutive `InputOTPSlot`s into one bordered run with shared rounded ends. */
const InputOTPGroup = ({
  className,
  ref,
  ...props
}: InputOTPGroupProps & { ref?: React.Ref<React.ElementRef<"div">> | undefined }) => (
  <div ref={ref} className={cn("flex items-center", className)} {...props} />
);
InputOTPGroup.displayName = "InputOTPGroup";

export interface InputOTPSlotProps extends React.ComponentPropsWithoutRef<"div"> {
  /** Position of this slot in the code, counted from 0. */
  index: number;
}

/** One character cell. Shows the typed character, a blinking caret and the focus ring when active. */
const InputOTPSlot = ({
  index,
  className,
  ref,
  ...props
}: InputOTPSlotProps & { ref?: React.Ref<React.ElementRef<"div">> | undefined }) => {
  const inputOTPContext = React.use(OTPInputContext) as {
    slots: Array<{ char?: string; hasFakeCaret?: boolean; isActive?: boolean } | undefined>;
  };
  const slot = inputOTPContext.slots[index];
  const error = React.use(InputOTPErrorContext);
  const char = slot?.char ?? "";
  const hasFakeCaret = slot?.hasFakeCaret ?? false;
  const isActive = slot?.isActive ?? false;

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex h-10 w-10 items-center justify-center border-y border-e border-input text-sm transition-[background-color,border-color,box-shadow,color,opacity,transform] first:rounded-s-md first:border-s last:rounded-e-md",
        isActive && "z-10 ring-2 ring-ring ring-offset-background",
        error && "border-destructive",
        error && isActive && "ring-destructive",
        className,
      )}
      data-invalid={error ? "true" : undefined}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-foreground duration-1000" />
        </div>
      )}
    </div>
  );
};
InputOTPSlot.displayName = "InputOTPSlot";

export type InputOTPSeparatorProps = React.ComponentPropsWithoutRef<"div">;

/** Decorative dash between two `InputOTPGroup`s. Hidden from assistive tech. */
const InputOTPSeparator = ({
  ref,
  ...props
}: InputOTPSeparatorProps & { ref?: React.Ref<React.ElementRef<"div">> | undefined }) => (
  <div ref={ref} aria-hidden="true" {...props}>
    <Minus className="h-4 w-4" />
  </div>
);
InputOTPSeparator.displayName = "InputOTPSeparator";

export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot };
