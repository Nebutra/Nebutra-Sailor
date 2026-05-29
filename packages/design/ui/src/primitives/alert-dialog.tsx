"use client";

import { AlertDialog as BaseAlertDialog } from "@base-ui/react/alert-dialog";
import * as React from "react";
import { overlayClassNames, overlayZIndex } from "../tokens/components/overlay";
import { cn } from "../utils/cn";
import { buttonVariants } from "./button-variants";

const AlertDialog = BaseAlertDialog.Root;
const AlertDialogPortal = BaseAlertDialog.Portal;

const AlertDialogTrigger = ({
  asChild,
  children,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Trigger> & { asChild?: boolean } & {
  ref?: React.Ref<HTMLButtonElement> | undefined;
}) => {
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
};
AlertDialogTrigger.displayName = "AlertDialogTrigger";

const AlertDialogOverlay = ({
  className,
  style,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Backdrop> & {
  ref?: React.Ref<HTMLDivElement> | undefined;
}) => (
  <BaseAlertDialog.Backdrop
    ref={ref}
    className={cn(overlayClassNames.backdrop, className)}
    style={{ zIndex: overlayZIndex.backdrop, ...style }}
    {...props}
  />
);
AlertDialogOverlay.displayName = "AlertDialogOverlay";

const AlertDialogContent = ({
  className,
  children,
  style,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Popup> & {
  ref?: React.Ref<HTMLDivElement> | undefined;
}) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <BaseAlertDialog.Popup
      ref={ref}
      className={cn(overlayClassNames.modalSurface, className)}
      style={{ zIndex: overlayZIndex.modal, ...style }}
      {...props}
    >
      {children}
    </BaseAlertDialog.Popup>
  </AlertDialogPortal>
);
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

const AlertDialogTitle = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Title> & {
  ref?: React.Ref<HTMLHeadingElement> | undefined;
}) => (
  <BaseAlertDialog.Title ref={ref} className={cn("text-lg font-semibold", className)} {...props} />
);
AlertDialogTitle.displayName = "AlertDialogTitle";

const AlertDialogDescription = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Description> & {
  ref?: React.Ref<HTMLParagraphElement> | undefined;
}) => (
  <BaseAlertDialog.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
);
AlertDialogDescription.displayName = "AlertDialogDescription";

// Base UI doesn't have an explicit 'Action' or 'Cancel' component. We render native Close triggers.
const AlertDialogAction = ({
  className,
  asChild,
  children,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Close> & { asChild?: boolean } & {
  ref?: React.Ref<HTMLButtonElement> | undefined;
}) => {
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
};
AlertDialogAction.displayName = "AlertDialogAction";

// Base UI's <Close> acts exactly like a Cancel when mapped as a trigger.
const AlertDialogCancel = ({
  className,
  asChild,
  children,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Close> & { asChild?: boolean } & {
  ref?: React.Ref<HTMLButtonElement> | undefined;
}) => {
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
};
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
