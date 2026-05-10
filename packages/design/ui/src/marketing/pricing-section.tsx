"use client";
import { motion, type Transition } from "framer-motion";
import { CheckCircleIcon, StarIcon } from "lucide-react";
import Link from "next/link";
import React from "react";
import { Button } from "../primitives/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../primitives/tooltip";
import { cn } from "../utils/cn";

type PricingFrequency = "monthly" | "yearly";
const frequencies: PricingFrequency[] = ["monthly", "yearly"];
export interface PricingPlan {
  name: string;
  info: string;
  price: {
    monthly: number;
    yearly: number;
  };
  features: {
    text: string;
    tooltip?: string;
  }[];
  btn: {
    text: string;
    href: string;
  };
  highlighted?: boolean;
}
export interface PricingSectionProps extends React.ComponentProps<"div"> {
  plans: PricingPlan[];
  heading: string;
  description?: string;
}
export function PricingSection({
  plans,
  heading,
  description,
  className,
  ...props
}: PricingSectionProps) {
  const [frequency, setFrequency] = React.useState<PricingFrequency>("monthly");
  return (
    <div
      className={cn("flex w-full flex-col items-center justify-center space-y-5 p-4", className)}
      {...props}
    >
      <div className="mx-auto max-w-xl space-y-2">
        <h2 className="text-center text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl">
          {heading}
        </h2>
        {description && (
          <p className="text-muted-foreground text-center text-sm md:text-base">{description}</p>
        )}
      </div>
      <PricingFrequencyToggle frequency={frequency} setFrequency={setFrequency} />
      <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <PricingCard plan={plan} key={plan.name} frequency={frequency} />
        ))}
      </div>
    </div>
  );
}
export interface PricingFrequencyToggleProps extends React.ComponentProps<"div"> {
  frequency: PricingFrequency;
  setFrequency: React.Dispatch<React.SetStateAction<PricingFrequency>>;
}
export function PricingFrequencyToggle({
  frequency,
  setFrequency,
  className,
  ...props
}: PricingFrequencyToggleProps) {
  return (
    <div
      className={cn(
        "bg-muted/30 mx-auto flex w-fit rounded-full border border-border p-1",
        className,
      )}
      role="radiogroup"
      aria-label="Billing frequency"
      {...props}
    >
      {frequencies.map((freq) => (
        // biome-ignore lint/a11y/useSemanticElements: ARIA pattern
        <button
          type="button"
          key={freq}
          onClick={() => setFrequency(freq)}
          className="relative px-4 py-1 text-sm capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full"
          role="radio"
          aria-checked={frequency === freq}
        >
          <span className="relative z-10">{freq}</span>
          {frequency === freq && (
            <motion.span
              layoutId="frequency"
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-foreground absolute inset-0 z-0 rounded-full mix-blend-difference"
            />
          )}
        </button>
      ))}
    </div>
  );
}
export interface PricingCardProps extends React.ComponentProps<"div"> {
  plan: PricingPlan;
  frequency?: PricingFrequency;
}
export function PricingCard({
  plan,
  className,
  frequency = frequencies[0],
  ...props
}: PricingCardProps) {
  return (
    <div
      key={plan.name}
      className={cn(
        "relative flex w-full flex-col rounded-[var(--radius-lg)] border border-border",
        className,
      )}
      {...props}
    >
      {plan.highlighted && (
        <BorderTrail
          style={{
            boxShadow:
              "0px 0px 60px 30px rgb(255 255 255 / 50%), 0 0 100px 60px rgb(0 0 0 / 50%), 0 0 140px 90px rgb(0 0 0 / 50%)",
          }}
          size={100}
        />
      )}
      <div
        className={cn(
          "bg-muted/20 rounded-t-lg border-b border-border p-4",
          plan.highlighted && "bg-muted/40",
        )}
      >
        <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
          {plan.highlighted && (
            <p className="bg-background flex items-center gap-1 rounded-[var(--radius-md)] border border-border px-2 py-0.5 text-xs">
              <StarIcon className="h-3 w-3 fill-current" />
              Popular
            </p>
          )}
          {frequency === "yearly" && (
            <p className="bg-primary text-primary-foreground flex items-center gap-1 rounded-[var(--radius-md)] border px-2 py-0.5 text-xs">
              {Math.round(
                ((plan.price.monthly * 12 - plan.price.yearly) / plan.price.monthly / 12) * 100,
              )}
              % off
            </p>
          )}
        </div>
        <div className="text-lg font-medium">{plan.name}</div>
        <p className="text-muted-foreground text-sm font-normal">{plan.info}</p>
        <h3 className="mt-2 flex items-end gap-1">
          <span className="text-3xl font-bold">${plan.price[frequency]}</span>
          <span className="text-muted-foreground">
            {plan.name !== "Free" ? "/" + (frequency === "monthly" ? "month" : "year") : ""}
          </span>
        </h3>
      </div>
      <div
        className={cn(
          "text-muted-foreground space-y-4 px-4 py-6 text-sm",
          plan.highlighted && "bg-muted/10",
        )}
      >
        {plan.features.map((feature, index) => (
          <div key={index} className="flex items-center gap-2">
            <CheckCircleIcon className="text-foreground h-4 w-4 shrink-0" />
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <p
                    className={cn(
                      feature.tooltip &&
                        "cursor-pointer border-b border-dashed border-muted-foreground",
                    )}
                  >
                    {feature.text}
                  </p>
                </TooltipTrigger>
                {feature.tooltip && (
                  <TooltipContent>
                    <p>{feature.tooltip}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        ))}
      </div>
      <div
        className={cn(
          "mt-auto w-full border-t border-border p-3",
          plan.highlighted && "bg-muted/40",
        )}
      >
        <Button className="w-full" variant={plan.highlighted ? "default" : "outline"} asChild>
          <Link href={plan.btn.href}>{plan.btn.text}</Link>
        </Button>
      </div>
    </div>
  );
}
// BorderTrail animation component (artistic element - exempt from Primer)
interface BorderTrailProps {
  className?: string;
  size?: number;
  transition?: Transition;
  delay?: number;
  onAnimationComplete?: () => void;
  style?: React.CSSProperties;
}
export function BorderTrail({
  className,
  size = 60,
  transition,
  delay,
  onAnimationComplete,
  style,
}: BorderTrailProps) {
  const BASE_TRANSITION = {
    repeat: Infinity,
    duration: 5,
    ease: "linear",
  };
  return (
    <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]">
      <motion.div
        className={cn("absolute aspect-square bg-[var(--neutral-8)]", className)}
        style={{
          width: size,
          offsetPath: `rect(0 auto auto 0 round ${size}px)`,
          ...style,
        }}
        animate={{
          offsetDistance: ["0%", "100%"],
        }}
        transition={{
          ...(transition ?? BASE_TRANSITION),
          delay: delay,
        }}
        onAnimationComplete={onAnimationComplete}
      />
    </div>
  );
}
// Default plans for Nebutra
export const DEFAULT_PRICING_PLANS: PricingPlan[] = [
  {
    name: "Free",
    info: "For individuals getting started",
    price: {
      monthly: 0,
      yearly: 0,
    },
    features: [
      { text: "Up to 3 projects" },
      {
        text: "Basic AI features",
        tooltip: "Limited to 100 AI requests/month",
      },
      { text: "Community support" },
      { text: "1 team member" },
    ],
    btn: {
      text: "Get Started",
      href: "/sign-up",
    },
  },
  {
    highlighted: true,
    name: "Pro",
    info: "For growing teams",
    price: {
      monthly: 29,
      yearly: Math.round(29 * 12 * 0.8),
    },
    features: [
      { text: "Unlimited projects" },
      {
        text: "Advanced AI features",
        tooltip: "Up to 10,000 AI requests/month",
      },
      { text: "Priority support", tooltip: "24/7 email & chat support" },
      { text: "Up to 10 team members" },
      { text: "Custom integrations" },
      { text: "Analytics dashboard" },
    ],
    btn: {
      text: "Start Free Trial",
      href: "/sign-up?plan=pro",
    },
  },
  {
    name: "Enterprise",
    info: "For large organizations",
    price: {
      monthly: 99,
      yearly: Math.round(99 * 12 * 0.75),
    },
    features: [
      { text: "Everything in Pro" },
      { text: "Unlimited AI requests" },
      { text: "Dedicated support", tooltip: "Dedicated account manager" },
      { text: "Unlimited team members" },
      { text: "SSO & SAML", tooltip: "Enterprise-grade authentication" },
      { text: "Custom SLA" },
      { text: "On-premise deployment" },
    ],
    btn: {
      text: "Contact Sales",
      href: "/contact?inquiry=enterprise",
    },
  },
];
