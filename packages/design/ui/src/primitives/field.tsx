"use client";

import type * as React from "react";
import { cn } from "../utils/cn";
import { Label } from "./label";

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Visible label placed above the control. */
  label: string;
  /** Help text shown below the control when no error is present. */
  description?: string;
  /** Validation message that replaces the description and changes the label's tone. */
  error?: string;
  /** ID of the control to associate with the label; supply that ID on the child control. */
  htmlFor?: string;
}

/**
 * Groups a label, child control, and either help text or a validation message.
 * Set the child's aria-describedby or aria-invalid separately when needed.
 */
export const Field = ({
  className,
  label,
  description,
  error,
  htmlFor,
  children,
  ref,
  ...props
}: FieldProps & { ref?: React.Ref<HTMLDivElement> | undefined }) => {
  return (
    <div ref={ref} className={cn("grid gap-2", className)} {...props}>
      <Label htmlFor={htmlFor} className={cn(error && "text-destructive-strong")}>
        {label}
      </Label>
      {children}
      {description && !error && <p className="text-sm text-muted-foreground">{description}</p>}
      {error && <p className="text-sm font-medium text-destructive-strong">{error}</p>}
    </div>
  );
};

Field.displayName = "Field";
