"use client";

import { Shield } from "lucide-react";
import Image from "next/image";
import type * as React from "react";
import { cn } from "../utils/cn";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "./input-otp";
import { Separator } from "./separator";

export interface Enable2FAStep {
  /** Step title */
  title: string;
  /** Step description */
  description: string;
  /** Optional custom content */
  content?: React.ReactNode;
}

export interface Enable2FACardProps {
  /** Custom steps (optional, defaults provided) */
  steps?: Enable2FAStep[];
  /** QR code image URL */
  qrCodeUrl?: string;
  /** OTP length */
  otpLength?: number;
  /** Callback when OTP is complete */
  onOtpComplete?: (otp: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Enable2FACard - Two-factor authentication setup card with steps
 *
 * @example
 * ```tsx
 * <Enable2FACard
 *   onOtpComplete={(otp) => console.log('OTP:', otp)}
 * />
 * ```
 */
export function Enable2FACard({
  steps,
  qrCodeUrl = "https://upload.wikimedia.org/wikipedia/commons/4/41/QR_Code_Example.svg",
  otpLength = 6,
  onOtpComplete,
  className,
}: Enable2FACardProps) {
  const defaultSteps: Enable2FAStep[] = [
    {
      title: "Download app",
      description: "Download a mobile authentication app.",
    },
    {
      title: "Scan QR code",
      description:
        "Scan this QR code using a mobile authentication app. This will generate a verification code.",
      content: (
        <div className="inline-block rounded-[var(--radius-lg)] border p-1">
          <Image
            src={qrCodeUrl}
            alt="QR Code"
            className="size-32 dark:invert"
            width={128}
            height={128}
          />
        </div>
      ),
    },
    {
      title: "Enter code",
      description: "Enter the verification code provided by your mobile authentication app.",
      content: (
        <InputOTP
          maxLength={otpLength}
          onComplete={onOtpComplete || (() => {})}
          render={({ slots }) => (
            <InputOTPGroup className="gap-2.5">
              {slots.map((_, i) => (
                <InputOTPSlot key={i} index={i} className="rounded-[var(--radius-lg)] border" />
              ))}
            </InputOTPGroup>
          )}
        />
      ),
    },
  ];

  const stepsToRender = steps || defaultSteps;

  return (
    <Card
      className={cn("flex w-full max-w-[500px] flex-col gap-6 p-5 shadow-none md:p-8", className)}
    >
      <CardHeader className="flex flex-col items-center gap-2 p-0">
        {/* Icon */}
        <div className="relative flex size-[68px] shrink-0 items-center justify-center rounded-full backdrop-blur-xl before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-b before:from-muted-foreground before:to-transparent before:opacity-10 md:size-24">
          <div className="relative z-10 flex size-12 items-center justify-center rounded-full bg-background shadow-xs ring-1 ring-inset ring-border dark:bg-muted/80 md:size-16">
            <Shield className="size-6 text-muted-foreground/80 md:size-8" />
          </div>
        </div>

        {/* Header Text */}
        <div className="flex flex-col space-y-1.5 text-center">
          <CardTitle className="font-medium md:text-xl">Enable Two-Factor Authentication</CardTitle>
          <CardDescription className="tracking-[-0.006em]">
            Secure your account with an additional layer of protection.
          </CardDescription>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="p-0">
        <div className="grid grid-cols-1 items-start justify-start">
          {stepsToRender.map((step, index) => (
            <div
              key={index}
              className={cn(
                "relative flex flex-row items-start gap-3 before:absolute before:start-0 after:absolute after:-translate-x-[0.5px] after:bg-border after:start-3.5 after:top-9 after:bottom-2 after:w-px last:after:hidden",
                index !== stepsToRender.length - 1 && "pb-6",
              )}
            >
              {/* Step Number */}
              <div className="flex flex-col items-center self-stretch">
                <span className="z-10 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground ring-1 ring-inset ring-border">
                  {index + 1}
                </span>
              </div>

              {/* Step Content */}
              <div className="flex flex-col items-start">
                <p className="text-sm font-semibold leading-5 tracking-[-0.006em] text-foreground">
                  {step.title}
                </p>
                <p className="text-sm leading-5 tracking-[-0.006em] text-muted-foreground">
                  {step.description}
                </p>
                {step.content && <div className="mt-2.5">{step.content}</div>}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

Enable2FACard.displayName = "Enable2FACard";
