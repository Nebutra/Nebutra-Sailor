"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { Cross as X } from "@nebutra/icons";
import { usePortalContainer } from "@nebutra/ui/utils/portal-container";
import * as React from "react";
import { overlayClassNames, overlayZIndex } from "../tokens/components/overlay";
import { cn } from "../utils/cn";
import { resolveLazyChild } from "../utils/lazy-child";
import { rendersNativeButton } from "../utils/native-button";
import { overlayPrimitiveClassNames } from "./overlay";
import { UiLabelText } from "./ui-labels";

// We keep these standard export names so the rest of the application using Nebutra UI doesn't break.
/** Coordinates dialog open state, modality, dismissal, and focus restoration through Base UI. */
const Dialog = BaseDialog.Root;
/** Portals dialog content into the nearest scoped overlay container. */
const DialogPortal = ({
  container,
  ...props
}: React.ComponentProps<typeof BaseDialog.Portal> & {
  /** Portal target; defaults to the nearest portal scope or document.body. */
  container?: React.ComponentProps<typeof BaseDialog.Portal>["container"];
}) => <BaseDialog.Portal container={usePortalContainer(container)} {...props} />;

/** Opens the dialog, optionally applying trigger behavior to a single child element. */
const DialogTrigger = ({
  asChild,
  children: rawChildren,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseDialog.Trigger> & {
  /** Uses a single valid child element as the trigger instead of creating a button. */
  asChild?: boolean;
} & {
  ref?: React.Ref<HTMLButtonElement> | undefined;
}) => {
  const children = resolveLazyChild(rawChildren);
  if (asChild && React.isValidElement(children)) {
    return (
      <BaseDialog.Trigger
        ref={ref}
        {...props}
        render={children as React.ReactElement<Record<string, unknown>>}
        nativeButton={rendersNativeButton(children)}
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

/** Closes the dialog, optionally applying close behavior to a single child element. */
const DialogClose = ({
  asChild,
  children: rawChildren,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseDialog.Close> & {
  /** Uses a single valid child element as the close control instead of creating a button. */
  asChild?: boolean;
} & {
  ref?: React.Ref<HTMLButtonElement> | undefined;
}) => {
  const children = resolveLazyChild(rawChildren);
  if (asChild && React.isValidElement(children)) {
    return (
      <BaseDialog.Close
        ref={ref}
        {...props}
        render={children as React.ReactElement<Record<string, unknown>>}
        nativeButton={rendersNativeButton(children)}
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

/** Backdrop that visually separates the dialog from the page beneath it. */
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

/** Portals the styled dialog popup with a backdrop and a labeled close button. */
const DialogContent = ({
  className,
  children,
  style,
  container,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseDialog.Popup> & {
  /** Portal target; defaults to the nearest portal scope or document.body. */
  container?: React.ComponentProps<typeof BaseDialog.Portal>["container"];
  ref?: React.Ref<HTMLDivElement> | undefined;
}) => (
  <DialogPortal container={container}>
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
        <span className="sr-only">
          <UiLabelText section="common" name="close" />
        </span>
      </DialogClose>
    </BaseDialog.Popup>
  </DialogPortal>
);
DialogContent.displayName = "DialogContent";

/** Groups a dialog's heading and supporting text, centered on small screens. */
const DialogHeader = ({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> | undefined }) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 text-center sm:text-start", className)}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

/** Groups dialog actions in a reversed column on small screens and an end-aligned row above them. */
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

/** Heading registered with Base UI as the dialog's accessible name. */
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

/** Supporting text registered with Base UI as the dialog's accessible description. */
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
