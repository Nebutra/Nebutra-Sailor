"use client";

import type * as React from "react";
import { cn } from "../utils/cn";
import { Label } from "./label";

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  description?: string;
  error?: string;
  htmlFor?: string;
}

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
      <Label htmlFor={htmlFor} className={cn(error && "text-destructive")}>
        {label}
      </Label>
      {children}
      {description && !error && <p className="text-sm text-muted-foreground">{description}</p>}
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
    </div>
  );
};

Field.displayName = "Field";
