"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { XIcon } from "lucide-react";
import * as React from "react";

import { cn } from "../utils/cn";

const Sheet = BaseDialog.Root;
const SheetTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseDialog.Trigger> & { asChild?: boolean }
>(({ asChild, children, ...props }, ref) => {
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
});
SheetTrigger.displayName = "SheetTrigger";

const SheetClose = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseDialog.Close> & { asChild?: boolean }
>(({ asChild, children, ...props }, ref) => {
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
});
SheetClose.displayName = "SheetClose";

const SheetPortal = BaseDialog.Portal;

const SheetOverlay = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseDialog.Backdrop>
>(({ className, ...props }, ref) => (
  <BaseDialog.Backdrop
    className={cn(
      "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-ending-style:animate-out data-starting-style:animate-in data-ending-style:fade-out-0 data-starting-style:fade-in-0 duration-300 transition-[opacity,display]",
      className,
    )}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = "SheetOverlay";

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background/90 backdrop-blur-xl p-6 shadow-2xl transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-ending-style:slide-out-to-top data-starting-style:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t data-ending-style:slide-out-to-bottom data-starting-style:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-ending-style:slide-out-to-left data-starting-style:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4 border-l data-ending-style:slide-out-to-right data-starting-style:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
);

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof BaseDialog.Popup>,
    VariantProps<typeof sheetVariants> {
  showClose?: boolean;
}

const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ side = "right", className, children, showClose = true, ...props }, ref) => (
    <SheetPortal>
      <SheetOverlay />
      <BaseDialog.Popup ref={ref} className={cn(sheetVariants({ side }), className)} {...props}>
        {children}
        {showClose && (
          <SheetClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[open]:bg-primary/20">
            <XIcon className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </SheetClose>
        )}
      </BaseDialog.Popup>
    </SheetPortal>
  ),
);
SheetContent.displayName = "SheetContent";

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props}
  />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentPropsWithoutRef<typeof BaseDialog.Title>
>(({ className, ...props }, ref) => (
  <BaseDialog.Title
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
));
SheetTitle.displayName = "SheetTitle";

const SheetDescription = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithoutRef<typeof BaseDialog.Description>
>(({ className, ...props }, ref) => (
  <BaseDialog.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
SheetDescription.displayName = "SheetDescription";

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
