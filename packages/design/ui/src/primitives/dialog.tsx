"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { Cross as X } from "@nebutra/icons";
import * as React from "react";
import { overlayClassNames, overlayZIndex } from "../tokens/components/overlay";
import { cn } from "../utils/cn";
import { overlayPrimitiveClassNames } from "./overlay";

// We keep these standard export names so the rest of the application using Nebutra UI doesn't break.
const Dialog = BaseDialog.Root;
const DialogPortal = BaseDialog.Portal;

const DialogTrigger = ({
  asChild,
  children,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseDialog.Trigger> & { asChild?: boolean } & {
  ref?: React.Ref<HTMLButtonElement> | undefined;
}) => {
  if (asChild && React.isValidElement(children)) {
    return (
      <BaseDialog.Trigger
        ref={ref}
        {...props}
        render={children as React.ReactElement<Record<string, unknown>>}
      />
    );
  }
  return (
    <BaseDialog.Trigger ref={ref} {...props}>
      {children}
    </BaseDialog.Trigger>
  );
};
DialogTrigger.displayName = "DialogTrigger";

const DialogClose = ({
  asChild,
  children,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseDialog.Close> & { asChild?: boolean } & {
  ref?: React.Ref<HTMLButtonElement> | undefined;
}) => {
  if (asChild && React.isValidElement(children)) {
    return (
      <BaseDialog.Close
        ref={ref}
        {...props}
        render={children as React.ReactElement<Record<string, unknown>>}
      />
    );
  }
  return (
    <BaseDialog.Close ref={ref} {...props}>
      {children}
    </BaseDialog.Close>
  );
};
DialogClose.displayName = "DialogClose";

const DialogOverlay = ({
  className,
  style,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseDialog.Backdrop> & {
  ref?: React.Ref<HTMLDivElement> | undefined;
}) => (
  <BaseDialog.Backdrop
    ref={ref}
    className={cn(overlayClassNames.backdrop, className)}
    style={{ zIndex: overlayZIndex.backdrop, ...style }}
    {...props}
  />
);
DialogOverlay.displayName = "DialogOverlay";

const DialogContent = ({
  className,
  children,
  style,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseDialog.Popup> & {
  ref?: React.Ref<HTMLDivElement> | undefined;
}) => (
  <DialogPortal>
    <DialogOverlay />
    <BaseDialog.Popup
      ref={ref}
      className={cn(
        overlayClassNames.modalSurface,
        overlayPrimitiveClassNames.modalSurface,
        className,
      )}
      style={{ zIndex: overlayZIndex.modal, ...style }}
      {...props}
    >
      {children}
      <DialogClose className={overlayClassNames.closeButton}>
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogClose>
    </BaseDialog.Popup>
  </DialogPortal>
);
DialogContent.displayName = "DialogContent";

const DialogHeader = ({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> | undefined }) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> | undefined }) => (
  <div
    ref={ref}
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseDialog.Title> & {
  ref?: React.Ref<HTMLHeadingElement> | undefined;
}) => (
  <BaseDialog.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
);
DialogTitle.displayName = "DialogTitle";

const DialogDescription = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseDialog.Description> & {
  ref?: React.Ref<HTMLParagraphElement> | undefined;
}) => (
  <BaseDialog.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
);
DialogDescription.displayName = "DialogDescription";

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
