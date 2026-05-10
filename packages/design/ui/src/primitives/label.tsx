"use client";

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../utils";

// =============================================================================
// Types
// =============================================================================

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
);

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement>,
    VariantProps<typeof labelVariants> {}

// =============================================================================
// Components
// =============================================================================

/**
 * Label - Accessible form label component
 *
 * @description
 * A label component built as a native HTML label element.
 * Automatically handles accessibility attributes and peer styling.
 *
 * @example Basic usage
 * ```tsx
 * <Label htmlFor="email">Email</Label>
 * <Input id="email" type="email" />
 * ```
 *
 * @example With peer styling (disabled state)
 * ```tsx
 * <div className="flex items-center gap-2">
 *   <Checkbox id="terms" disabled />
 *   <Label htmlFor="terms">Accept terms</Label>
 * </div>
 * ```
 *
 * @example Required field indicator
 * ```tsx
 * <Label htmlFor="name">
 *   Name <span className="text-destructive">*</span>
 * </Label>
 * ```
 */
const Label = React.forwardRef<HTMLLabelElement, LabelProps>(({ className, ...props }, ref) => (
  <label ref={ref} className={cn(labelVariants(), className)} {...props} />
));
Label.displayName = "Label";

export { Label, labelVariants };
