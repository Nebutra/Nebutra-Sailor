"use client";

import { AlertDialog as BaseAlertDialog } from "@base-ui/react/alert-dialog";
import * as React from "react";
import { cn } from "../utils/cn";
import { buttonVariants } from "./button";

const AlertDialog = BaseAlertDialog.Root;
const AlertDialogPortal = BaseAlertDialog.Portal;

const AlertDialogTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Trigger> & { asChild?: boolean }
>(({ asChild, children, ...props }, ref) => {
  if (asChild && React.isValidElement(children)) {
    return (
      <BaseAlertDialog.Trigger
        ref={ref}
        {...props}
        render={children as React.ReactElement<Record<string, unknown>>}
      />
    );
  }
  return (
    <BaseAlertDialog.Trigger ref={ref} {...props}>
      {children}
    </BaseAlertDialog.Trigger>
  );
});
AlertDialogTrigger.displayName = "AlertDialogTrigger";

const AlertDialogOverlay = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Backdrop>
>(({ className, ...props }, ref) => (
  <BaseAlertDialog.Backdrop
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-ending-style:animate-out data-starting-style:animate-in data-ending-style:fade-out-0 data-starting-style:fade-in-0 duration-200 transition-[opacity,display]",
      className,
    )}
    {...props}
  />
));
AlertDialogOverlay.displayName = "AlertDialogOverlay";

const AlertDialogContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Popup>
>(({ className, children, ...props }, ref) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <BaseAlertDialog.Popup
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 transition-[opacity,transform,display] data-starting-style:animate-in data-ending-style:animate-out data-ending-style:fade-out-0 data-starting-style:fade-in-0 data-ending-style:zoom-out-95 data-starting-style:zoom-in-95 sm:rounded-[var(--radius-lg)]",
        className,
      )}
      {...props}
    >
      {children}
    </BaseAlertDialog.Popup>
  </AlertDialogPortal>
));
AlertDialogContent.displayName = "AlertDialogContent";

const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
);
AlertDialogHeader.displayName = "AlertDialogHeader";

const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props}
  />
);
AlertDialogFooter.displayName = "AlertDialogFooter";

const AlertDialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Title>
>(({ className, ...props }, ref) => (
  <BaseAlertDialog.Title ref={ref} className={cn("text-lg font-semibold", className)} {...props} />
));
AlertDialogTitle.displayName = "AlertDialogTitle";

const AlertDialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Description>
>(({ className, ...props }, ref) => (
  <BaseAlertDialog.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
AlertDialogDescription.displayName = "AlertDialogDescription";

// Base UI doesn't have an explicit 'Action' or 'Cancel' component. We render native Close triggers.
const AlertDialogAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Close> & { asChild?: boolean }
>(({ className, asChild, children, ...props }, ref) => {
  if (asChild && React.isValidElement(children)) {
    return (
      <BaseAlertDialog.Close
        ref={ref}
        {...props}
        className={cn(className)}
        render={children as React.ReactElement<Record<string, unknown>>}
      />
    );
  }
  return (
    <BaseAlertDialog.Close ref={ref} className={cn(buttonVariants(), className)} {...props}>
      {children}
    </BaseAlertDialog.Close>
  );
});
AlertDialogAction.displayName = "AlertDialogAction";

// Base UI's <Close> acts exactly like a Cancel when mapped as a trigger.
const AlertDialogCancel = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Close> & { asChild?: boolean }
>(({ className, asChild, children, ...props }, ref) => {
  if (asChild && React.isValidElement(children)) {
    return (
      <BaseAlertDialog.Close
        ref={ref}
        {...props}
        className={cn(className)}
        render={children as React.ReactElement<Record<string, unknown>>}
      />
    );
  }
  return (
    <BaseAlertDialog.Close
      ref={ref}
      className={cn(buttonVariants({ variant: "outline" }), "mt-2 sm:mt-0", className)}
      {...props}
    >
      {children}
    </BaseAlertDialog.Close>
  );
});
AlertDialogCancel.displayName = "AlertDialogCancel";

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
};
