"use client";

import * as React from "react";
import { cn } from "../utils/cn";
import { Label } from "./label";

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  description?: string;
  error?: string;
  htmlFor?: string;
}

export const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ className, label, description, error, htmlFor, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("grid gap-2", className)} {...props}>
        <Label htmlFor={htmlFor} className={cn(error && "text-destructive")}>
          {label}
        </Label>
        {children}
        {description && !error && <p className="text-sm text-muted-foreground">{description}</p>}
        {error && <p className="text-sm font-medium text-destructive">{error}</p>}
      </div>
    );
  },
);

Field.displayName = "Field";
