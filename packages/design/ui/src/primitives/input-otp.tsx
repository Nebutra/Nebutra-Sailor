"use client";

import { Minus } from "@nebutra/icons";
import { OTPInput, OTPInputContext, type RenderProps } from "input-otp";
import * as React from "react";
import { cn } from "../utils/cn";

export interface InputOTPProps {
  /** Maximum number of characters */
  maxLength: number;
  /** Current value */
  value?: string;
  /** Change handler */
  onChange?: (newValue: string) => void;
  /** Complete handler */
  onComplete?: (value: string) => void;
  /** Render function for slots */
  render?: (props: RenderProps) => React.ReactNode;
  /** Children (alternative to render) */
  children?: React.ReactNode;
  /** Container class name */
  containerClassName?: string;
  /** Input class name */
  className?: string;
  /** Input pattern validation */
  pattern?: string;
  /** Text alignment */
  textAlign?: "left" | "center" | "right";
  /** Disabled state */
  disabled?: boolean;
}

const InputOTP = ({
  className,
  containerClassName,
  children,
  render,
  ref,
  ...props
}: InputOTPProps & { ref?: React.Ref<HTMLInputElement> | undefined }) => {
  // Build the OTPInput props based on whether render or children is provided
  const otpProps = render ? { render, ...props } : { children, ...props };

  return (
    <OTPInput
      ref={ref}
      containerClassName={cn(
        "flex items-center gap-2 has-[:disabled]:opacity-50",
        containerClassName,
      )}
      className={cn("disabled:cursor-not-allowed", className)}
      {...(otpProps as React.ComponentProps<typeof OTPInput>)}
    />
  );
};
InputOTP.displayName = "InputOTP";

export type InputOTPGroupProps = React.ComponentPropsWithoutRef<"div">;

const InputOTPGroup = ({
  className,
  ref,
  ...props
}: InputOTPGroupProps & { ref?: React.Ref<React.ElementRef<"div">> | undefined }) => (
  <div ref={ref} className={cn("flex items-center", className)} {...props} />
);
InputOTPGroup.displayName = "InputOTPGroup";

export interface InputOTPSlotProps extends React.ComponentPropsWithoutRef<"div"> {
  index: number;
}

const InputOTPSlot = ({
  index,
  className,
  ref,
  ...props
}: InputOTPSlotProps & { ref?: React.Ref<React.ElementRef<"div">> | undefined }) => {
  const inputOTPContext = React.use(OTPInputContext);
  const slot = inputOTPContext.slots[index];
  const char = slot?.char ?? "";
  const hasFakeCaret = slot?.hasFakeCaret ?? false;
  const isActive = slot?.isActive ?? false;

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex h-10 w-10 items-center justify-center border-y border-r border-input text-sm transition-[background-color,border-color,box-shadow,color,opacity,transform] first:rounded-l-md first:border-l last:rounded-r-md",
        isActive && "z-10 ring-2 ring-ring ring-offset-background",
        className,
      )}
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
