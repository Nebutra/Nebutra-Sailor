"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { Cross as X } from "@nebutra/icons";
import * as React from "react";
import { cn } from "../utils/cn";

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
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseDialog.Backdrop> & {
  ref?: React.Ref<HTMLDivElement> | undefined;
}) => (
  <BaseDialog.Backdrop
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-ending-style:animate-out data-starting-style:animate-in data-ending-style:fade-out-0 data-starting-style:fade-in-0 duration-300 transition-[opacity,display]",
      className,
    )}
    {...props}
  />
);
DialogOverlay.displayName = "DialogOverlay";

const DialogContent = ({
  className,
  children,
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
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-border/50 bg-background/90 p-6 shadow-2xl backdrop-blur-xl duration-300 transition-[opacity,transform,display] data-starting-style:animate-in data-ending-style:animate-out data-ending-style:fade-out-0 data-starting-style:fade-in-0 data-ending-style:zoom-out-95 data-starting-style:zoom-in-95 sm:rounded-2xl",
        className,
      )}
      {...props}
    >
      {children}
      <DialogClose className="absolute right-4 top-4 rounded-[var(--radius-sm)] opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none data-[open]:bg-accent data-[open]:text-muted-foreground">
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
