"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { Cross as XIcon } from "@nebutra/icons";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { sheetTokens } from "../tokens/components/sheet";
import { cn } from "../utils/cn";

type SheetCssVar =
  | "--sheet-inset"
  | "--sheet-side-width"
  | "--sheet-edge-height"
  | "--sheet-padding-x"
  | "--sheet-padding-y"
  | "--sheet-body-padding-y"
  | "--sheet-gap"
  | "--sheet-header-gap"
  | "--sheet-footer-gap"
  | "--sheet-radius"
  | "--sheet-close-size"
  | "--sheet-close-icon-size"
  | "--sheet-close-offset"
  | "--sheet-close-radius"
  | "--sheet-overlay-background"
  | "--sheet-overlay-blur"
  | "--sheet-background"
  | "--sheet-shadow"
  | "--sheet-duration"
  | "--sheet-easing";

type SheetCssVars = React.CSSProperties & Record<SheetCssVar, string>;

function getSheetStyle(style: React.CSSProperties | undefined): SheetCssVars {
  return {
    "--sheet-inset": `${sheetTokens.inset}px`,
    "--sheet-side-width": `${sheetTokens.sideWidth}px`,
    "--sheet-edge-height": `${sheetTokens.edgeHeight}px`,
    "--sheet-padding-x": `${sheetTokens.paddingX}px`,
    "--sheet-padding-y": `${sheetTokens.paddingY}px`,
    "--sheet-body-padding-y": `${sheetTokens.bodyPaddingY}px`,
    "--sheet-gap": `${sheetTokens.gap}px`,
    "--sheet-header-gap": `${sheetTokens.headerGap}px`,
    "--sheet-footer-gap": `${sheetTokens.footerGap}px`,
    "--sheet-radius": `${sheetTokens.radius}px`,
    "--sheet-close-size": `${sheetTokens.close.size}px`,
    "--sheet-close-icon-size": `${sheetTokens.close.iconSize}px`,
    "--sheet-close-offset": `${sheetTokens.close.offset}px`,
    "--sheet-close-radius": `${sheetTokens.close.radius}px`,
    "--sheet-overlay-background": sheetTokens.overlay.background,
    "--sheet-overlay-blur": sheetTokens.overlay.blur,
    "--sheet-background": sheetTokens.surface.background,
    "--sheet-shadow": sheetTokens.surface.shadow,
    "--sheet-duration": `${sheetTokens.motion.duration}ms`,
    "--sheet-easing": sheetTokens.motion.easing,
    ...style,
  };
}

export type SheetProps = React.ComponentPropsWithoutRef<typeof BaseDialog.Root>;

function Sheet({ modal = "trap-focus", disablePointerDismissal = true, ...props }: SheetProps) {
  return (
    <BaseDialog.Root
      data-slot="sheet"
      modal={modal}
      disablePointerDismissal={disablePointerDismissal}
      {...props}
    />
  );
}
Sheet.displayName = "Sheet";

export type SheetTriggerProps = React.ComponentPropsWithoutRef<typeof BaseDialog.Trigger> & {
  asChild?: boolean;
};

const SheetTrigger = React.forwardRef<HTMLButtonElement, SheetTriggerProps>(
  ({ asChild, children, ...props }, ref) => {
    if (asChild && React.isValidElement(children)) {
      return (
        <BaseDialog.Trigger
          ref={ref}
          data-slot="sheet-trigger"
          {...props}
          render={children as React.ReactElement<Record<string, unknown>>}
        />
      );
    }
    return (
      <BaseDialog.Trigger ref={ref} data-slot="sheet-trigger" {...props}>
        {children}
      </BaseDialog.Trigger>
    );
  },
);
SheetTrigger.displayName = "SheetTrigger";

export type SheetCloseProps = React.ComponentPropsWithoutRef<typeof BaseDialog.Close> & {
  asChild?: boolean;
};

const SheetClose = React.forwardRef<HTMLButtonElement, SheetCloseProps>(
  ({ asChild, children, ...props }, ref) => {
    if (asChild && React.isValidElement(children)) {
      return (
        <BaseDialog.Close
          ref={ref}
          data-slot="sheet-close"
          {...props}
          render={children as React.ReactElement<Record<string, unknown>>}
        />
      );
    }
    return (
      <BaseDialog.Close ref={ref} data-slot="sheet-close" {...props}>
        {children}
      </BaseDialog.Close>
    );
  },
);
SheetClose.displayName = "SheetClose";

export type SheetPortalProps = React.ComponentPropsWithoutRef<typeof BaseDialog.Portal>;

function SheetPortal(props: SheetPortalProps) {
  return <BaseDialog.Portal data-slot="sheet-portal" {...props} />;
}
SheetPortal.displayName = "SheetPortal";

export type SheetOverlayProps = React.ComponentPropsWithoutRef<typeof BaseDialog.Backdrop>;

const SheetOverlay = React.forwardRef<HTMLDivElement, SheetOverlayProps>(
  ({ className, style, ...props }, ref) => (
    <BaseDialog.Backdrop
      ref={ref}
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-[var(--sheet-overlay-background)] backdrop-blur-[var(--sheet-overlay-blur)]",
        "transition-[opacity,backdrop-filter,display] duration-[var(--sheet-duration)] ease-[var(--sheet-easing)]",
        "data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none",
        className,
      )}
      style={getSheetStyle(style)}
      {...props}
    />
  ),
);
SheetOverlay.displayName = "SheetOverlay";

const sheetVariants = cva(
  [
    "fixed z-50 flex flex-col overflow-hidden border border-border bg-[var(--sheet-background)] text-foreground shadow-[var(--sheet-shadow)] outline-none",
    "transition-[opacity,transform,display] duration-[var(--sheet-duration)] ease-[var(--sheet-easing)]",
    "data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none",
  ].join(" "),
  {
    variants: {
      side: {
        top: "inset-x-[var(--sheet-inset)] top-[var(--sheet-inset)] max-h-[min(var(--sheet-edge-height),calc(100dvh_-_var(--sheet-inset)_-_var(--sheet-inset)))] rounded-[var(--sheet-radius)] data-ending-style:-translate-y-full data-starting-style:-translate-y-full",
        bottom:
          "inset-x-[var(--sheet-inset)] bottom-[var(--sheet-inset)] max-h-[min(var(--sheet-edge-height),calc(100dvh_-_var(--sheet-inset)_-_var(--sheet-inset)))] rounded-[var(--sheet-radius)] data-ending-style:translate-y-full data-starting-style:translate-y-full",
        left: "inset-y-[var(--sheet-inset)] left-[var(--sheet-inset)] h-[calc(100dvh_-_var(--sheet-inset)_-_var(--sheet-inset))] w-[min(var(--sheet-side-width),calc(100vw_-_var(--sheet-inset)_-_var(--sheet-inset)))] rounded-[var(--sheet-radius)] data-ending-style:-translate-x-full data-starting-style:-translate-x-full",
        right:
          "inset-y-[var(--sheet-inset)] right-[var(--sheet-inset)] h-[calc(100dvh_-_var(--sheet-inset)_-_var(--sheet-inset))] w-[min(var(--sheet-side-width),calc(100vw_-_var(--sheet-inset)_-_var(--sheet-inset)))] rounded-[var(--sheet-radius)] data-ending-style:translate-x-full data-starting-style:translate-x-full",
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
);

export interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof BaseDialog.Popup>,
    VariantProps<typeof sheetVariants> {
  /**
   * Render the backdrop. Prefer `noOverlay` in docs because it names the visual
   * removal directly; `overlay` remains available for boolean composition.
   */
  overlay?: boolean;
  /** Hide the backdrop while keeping the sheet surface and focus behavior. */
  noOverlay?: boolean;
  /** Render the built-in close icon button. */
  showClose?: boolean;
  /** Alias for `showClose`, matching newer generated examples. */
  close?: boolean;
}

const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  (
    {
      side = "right",
      className,
      children,
      overlay = true,
      noOverlay = false,
      showClose,
      close,
      style,
      ...props
    },
    ref,
  ) => {
    const shouldRenderClose = close ?? showClose ?? true;
    const shouldRenderOverlay = overlay && !noOverlay;

    return (
      <SheetPortal>
        {shouldRenderOverlay ? <SheetOverlay /> : null}
        <BaseDialog.Popup
          ref={ref}
          data-slot="sheet-content"
          className={cn(sheetVariants({ side }), className)}
          style={getSheetStyle(style)}
          {...props}
        >
          {children}
          {shouldRenderClose ? (
            <SheetClose
              aria-label="Close"
              className={cn(
                "absolute right-[var(--sheet-close-offset)] top-[var(--sheet-close-offset)] inline-flex size-[var(--sheet-close-size)] items-center justify-center rounded-[var(--sheet-close-radius)] text-muted-foreground",
                "transition-[background-color,color,box-shadow] duration-[var(--sheet-duration)] ease-[var(--sheet-easing)] hover:bg-muted hover:text-foreground",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none motion-reduce:transition-none",
              )}
            >
              <XIcon aria-hidden="true" className="size-[var(--sheet-close-icon-size)]" />
              <span className="sr-only">Close</span>
            </SheetClose>
          ) : null}
        </BaseDialog.Popup>
      </SheetPortal>
    );
  },
);
SheetContent.displayName = "SheetContent";

export type SheetHeaderProps = React.ComponentPropsWithoutRef<"div">;

const SheetHeader = React.forwardRef<HTMLDivElement, SheetHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="sheet-header"
      className={cn(
        "grid gap-[var(--sheet-header-gap)] border-b border-border px-[var(--sheet-padding-x)] py-[var(--sheet-padding-y)] pr-[calc(var(--sheet-padding-x)_+_var(--sheet-close-size))] text-left",
        className,
      )}
      {...props}
    />
  ),
);
SheetHeader.displayName = "SheetHeader";

export type SheetBodyProps = React.ComponentPropsWithoutRef<"div">;

const SheetBody = React.forwardRef<HTMLDivElement, SheetBodyProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="sheet-body"
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain px-[var(--sheet-padding-x)] py-[var(--sheet-body-padding-y)]",
        className,
      )}
      {...props}
    />
  ),
);
SheetBody.displayName = "SheetBody";

export type SheetFooterProps = React.ComponentPropsWithoutRef<"div">;

const SheetFooter = React.forwardRef<HTMLDivElement, SheetFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="sheet-footer"
      className={cn(
        "mt-auto flex flex-col-reverse gap-[var(--sheet-footer-gap)] border-t border-border px-[var(--sheet-padding-x)] py-[var(--sheet-padding-y)] sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  ),
);
SheetFooter.displayName = "SheetFooter";

export type SheetTitleProps = React.ComponentPropsWithoutRef<typeof BaseDialog.Title>;

const SheetTitle = React.forwardRef<HTMLHeadingElement, SheetTitleProps>(
  ({ className, ...props }, ref) => (
    <BaseDialog.Title
      ref={ref}
      data-slot="sheet-title"
      className={cn("font-semibold text-base leading-6 text-foreground", className)}
      {...props}
    />
  ),
);
SheetTitle.displayName = "SheetTitle";

export type SheetDescriptionProps = React.ComponentPropsWithoutRef<typeof BaseDialog.Description>;

const SheetDescription = React.forwardRef<HTMLParagraphElement, SheetDescriptionProps>(
  ({ className, ...props }, ref) => (
    <BaseDialog.Description
      ref={ref}
      data-slot="sheet-description"
      className={cn("text-muted-foreground text-sm leading-5", className)}
      {...props}
    />
  ),
);
SheetDescription.displayName = "SheetDescription";

export {
  Sheet,
  SheetBody,
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
