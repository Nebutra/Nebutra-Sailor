"use client";

import { InputOTP, InputOTPGroup, InputOTPSlot } from "@nebutra/ui/primitives";
import { REGEXP_ONLY_DIGITS } from "input-otp";

export function InputOTPNumericDemo() {
  return (
    <InputOTP maxLength={4} pattern={REGEXP_ONLY_DIGITS}>
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
        <InputOTPSlot index={3} />
      </InputOTPGroup>
    </InputOTP>
  );
}
