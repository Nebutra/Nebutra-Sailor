"use client";
import { ArrowRightIcon, PlusIcon } from "lucide-react";
import { Button } from "../primitives/button";
import { cn } from "../utils/cn";
export interface CTASectionProps {
  /** Main headline text */
  headline?: string;
  /** Description text below headline */
  description?: string;
  /** Primary button text */
  primaryButtonText?: string;
  /** Primary button click handler */
  onPrimaryClick?: () => void;
  /** Secondary button text */
  secondaryButtonText?: string;
  /** Secondary button click handler */
  onSecondaryClick?: () => void;
  /** Whether to show arrow icon on primary button */
  showArrow?: boolean;
  /** Additional className */
  className?: string;
}
/**
 * CTASection - Call to Action section with decorative border styling
 *
 * Features decorative plus icons at corners and vertical border lines.
 * Suitable for landing page CTA sections.
 *
 * @example
 * ```tsx
 * <CTASection
 *   headline="Let your plans shape the future."
 *   description="Start your free trial today."
 *   primaryButtonText="Get Started"
 *   secondaryButtonText="Contact Sales"
 *   onPrimaryClick={() => router.push('/signup')}
 * />
 * ```
 */
export function CTASection({
  headline = "Let your plans shape the future.",
  description = "Start your free trial today. No credit card required.",
  primaryButtonText = "Get Started",
  onPrimaryClick,
  secondaryButtonText = "Contact Sales",
  onSecondaryClick,
  showArrow = true,
  className,
}: CTASectionProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: ARIA pattern
    <div
      className={cn(
        "relative mx-auto flex w-full max-w-3xl flex-col justify-between gap-y-6 border-y border-border bg-[radial-gradient(35%_80%_at_25%_0%,hsl(var(--foreground)/.08),transparent)] px-4 py-8",
        className,
      )}
      role="region"
      aria-label="Call to action"
    >
      {/* Decorative corner icons */}
      <PlusIcon
        className="absolute left-[-11.5px] top-[-12.5px] z-[1] size-6 text-muted-foreground"
        strokeWidth={1}
        aria-hidden="true"
      />
      <PlusIcon
        className="absolute right-[-11.5px] top-[-12.5px] z-[1] size-6 text-muted-foreground"
        strokeWidth={1}
        aria-hidden="true"
      />
      <PlusIcon
        className="absolute bottom-[-12.5px] left-[-11.5px] z-[1] size-6 text-muted-foreground"
        strokeWidth={1}
        aria-hidden="true"
      />
      <PlusIcon
        className="absolute bottom-[-12.5px] right-[-11.5px] z-[1] size-6 text-muted-foreground"
        strokeWidth={1}
        aria-hidden="true"
      />
      {/* Decorative vertical border lines */}
      <div
        className="pointer-events-none absolute -inset-y-6 left-0 w-px border-l border-border"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -inset-y-6 right-0 w-px border-r border-border"
        aria-hidden="true"
      />
      {/* Center dashed line */}
      <div
        className="absolute left-1/2 top-0 -z-10 h-full border-l border-dashed border-border"
        aria-hidden="true"
      />
      {/* Content */}
      <div className="space-y-1">
        <h2 className="text-center text-2xl font-bold text-foreground">{headline}</h2>
        <p className="text-center text-muted-foreground">{description}</p>
      </div>
      {/* Actions */}
      <div className="flex items-center justify-center gap-2">
        {secondaryButtonText && (
          <Button variant="outline" onClick={onSecondaryClick}>
            {secondaryButtonText}
          </Button>
        )}
        <Button onClick={onPrimaryClick}>
          {primaryButtonText}
          {showArrow && <ArrowRightIcon className="ml-1 size-4" aria-hidden="true" />}
        </Button>
      </div>
    </div>
  );
}
