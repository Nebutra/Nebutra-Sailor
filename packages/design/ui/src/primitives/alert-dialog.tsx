"use client";

import { AlertDialog as BaseAlertDialog } from "@base-ui/react/alert-dialog";
import * as React from "react";
import { overlayClassNames, overlayZIndex } from "../tokens/components/overlay";
import { cn } from "../utils/cn";
import { resolveLazyChild } from "../utils/lazy-child";
import { rendersNativeButton } from "../utils/native-button";
import { buttonVariants } from "./button-variants";

/**
 * AlertDialog - Interrupting confirmation modal
 *
 * @description
 * Groups the parts of a modal that asks the user to confirm or cancel before anything else can
 * happen. Focus is trapped while it is open and a click on the backdrop never closes it; only
 * Cancel, the action or Escape does. Accepts `open`, `defaultOpen` and `onOpenChange` from Base UI.
 */
const AlertDialog = BaseAlertDialog.Root;
/** Portals its children to the document body. `AlertDialogContent` already includes one. */
const AlertDialogPortal = BaseAlertDialog.Portal;

/** Button that opens the dialog. Pass `asChild` to put the behaviour on your own control. */
const AlertDialogTrigger = ({
  asChild,
  children: rawChildren,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Trigger> & {
  /**
   * Render the trigger onto the single child element instead of a native button.
   * @default false
   */
  asChild?: boolean;
} & {
  ref?: React.Ref<HTMLButtonElement> | undefined;
}) => {
  const children = resolveLazyChild(rawChildren);
  if (asChild && React.isValidElement(children)) {
    return (
      <BaseAlertDialog.Trigger
        ref={ref}
        {...props}
        render={children as React.ReactElement<Record<string, unknown>>}
        nativeButton={rendersNativeButton(children)}
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

/** Dimmed backdrop behind the dialog. Clicking it does not close the dialog. */
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

/** Portalled modal surface with its own overlay. Holds the header, body and footer. */
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

/** Stacks the title and description; centred on small screens, start-aligned from `sm`. */
const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-start", className)} {...props} />
);
AlertDialogHeader.displayName = "AlertDialogHeader";

/** Row of actions; stacked with the primary action last on small screens, end-aligned from `sm`. */
const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props}
  />
);
AlertDialogFooter.displayName = "AlertDialogFooter";

/** Accessible name of the dialog. Always render one. */
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

/** Accessible description of the dialog: what will happen if the user confirms. */
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
/** Confirming button; closes the dialog and renders the default button style unless `asChild` is used. */
const AlertDialogAction = ({
  className,
  asChild,
  children: rawChildren,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Close> & {
  /**
   * Render the action onto the single child element, e.g. a destructive `Button`, instead of the default button.
   * @default false
   */
  asChild?: boolean;
} & {
  ref?: React.Ref<HTMLButtonElement> | undefined;
}) => {
  const children = resolveLazyChild(rawChildren);
  if (asChild && React.isValidElement(children)) {
    return (
      <BaseAlertDialog.Close
        ref={ref}
        {...props}
        className={cn(className)}
        render={children as React.ReactElement<Record<string, unknown>>}
        nativeButton={rendersNativeButton(children)}
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
/** Dismissing button; closes the dialog and renders the outline button style unless `asChild` is used. */
const AlertDialogCancel = ({
  className,
  asChild,
  children: rawChildren,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Close> & {
  /**
   * Render the cancel control onto the single child element instead of the outline button.
   * @default false
   */
  asChild?: boolean;
} & {
  ref?: React.Ref<HTMLButtonElement> | undefined;
}) => {
  const children = resolveLazyChild(rawChildren);
  if (asChild && React.isValidElement(children)) {
    return (
      <BaseAlertDialog.Close
        ref={ref}
        {...props}
        className={cn(className)}
        render={children as React.ReactElement<Record<string, unknown>>}
        nativeButton={rendersNativeButton(children)}
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
