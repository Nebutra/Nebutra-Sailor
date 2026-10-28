"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { Cross as XIcon } from "@nebutra/icons";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { overlayClassNames, overlayTokens, overlayZIndex } from "../tokens/components/overlay";
import { sheetTokens } from "../tokens/components/sheet";
import { cn } from "../utils/cn";
import { resolveLazyChild } from "../utils/lazy-child";
import { rendersNativeButton } from "../utils/native-button";
import { asPlainStyle } from "../utils/primitive-props";

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

function getSheetStyle(style: unknown): SheetCssVars {
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
    "--sheet-duration": `${overlayTokens.motion.duration}ms`,
    "--sheet-easing": overlayTokens.motion.easing,
    ...asPlainStyle(style),
  };
}

export type SheetProps = React.ComponentPropsWithoutRef<typeof BaseDialog.Root>;

/**
 * Sheet - Edge-anchored modal panel
 *
 * @description
 * Groups the parts of a panel that slides in from a screen edge for a secondary task while the
 * page stays in view behind a backdrop. Built on Base UI Dialog. Unlike Dialog it defaults to
 * `modal="trap-focus"` (focus is trapped, page scroll is not locked) and to
 * `disablePointerDismissal`, so a click on the backdrop does not close it. Accepts `open`,
 * `defaultOpen` and `onOpenChange` from Base UI for controlled use.
 */
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
  /**
   * Render the trigger onto the single child element instead of a native button.
   * @default false
   */
  asChild?: boolean;
};

/** Control that opens the sheet. Pass `asChild` to put the behaviour on your own button. */
const SheetTrigger = ({
  asChild,
  children: rawChildren,
  ref,
  ...props
}: SheetTriggerProps & { ref?: React.Ref<HTMLButtonElement> | undefined }) => {
  const children = resolveLazyChild(rawChildren);
  if (asChild && React.isValidElement(children)) {
    return (
      <BaseDialog.Trigger
        ref={ref}
        data-slot="sheet-trigger"
        {...props}
        render={children as React.ReactElement<Record<string, unknown>>}
        nativeButton={rendersNativeButton(children)}
      />
    );
  }
  return (
    <BaseDialog.Trigger ref={ref} data-slot="sheet-trigger" {...props}>
      {children}
    </BaseDialog.Trigger>
  );
};
SheetTrigger.displayName = "SheetTrigger";

export type SheetCloseProps = React.ComponentPropsWithoutRef<typeof BaseDialog.Close> & {
  /**
   * Render the close control onto the single child element instead of a native button.
   * @default false
   */
  asChild?: boolean;
};

/** Control that closes the sheet. Use `asChild` to turn a footer `Button` into one. */
const SheetClose = ({
  asChild,
  children: rawChildren,
  ref,
  ...props
}: SheetCloseProps & { ref?: React.Ref<HTMLButtonElement> | undefined }) => {
  const children = resolveLazyChild(rawChildren);
  if (asChild && React.isValidElement(children)) {
    return (
      <BaseDialog.Close
        ref={ref}
        data-slot="sheet-close"
        {...props}
        render={children as React.ReactElement<Record<string, unknown>>}
        nativeButton={rendersNativeButton(children)}
      />
    );
  }
  return (
    <BaseDialog.Close ref={ref} data-slot="sheet-close" {...props}>
      {children}
    </BaseDialog.Close>
  );
};
SheetClose.displayName = "SheetClose";

export type SheetPortalProps = React.ComponentPropsWithoutRef<typeof BaseDialog.Portal>;

/** Portals its children to the document body. `SheetContent` already includes one. */
function SheetPortal(props: SheetPortalProps) {
  return <BaseDialog.Portal data-slot="sheet-portal" {...props} />;
}
SheetPortal.displayName = "SheetPortal";

export type SheetOverlayProps = React.ComponentPropsWithoutRef<typeof BaseDialog.Backdrop>;

/** Dimmed, blurred backdrop behind the sheet. Rendered by `SheetContent` unless `noOverlay` is set. */
const SheetOverlay = ({
  className,
  style,
  ref,
  ...props
}: SheetOverlayProps & { ref?: React.Ref<HTMLDivElement> | undefined }) => (
  <BaseDialog.Backdrop
    ref={ref}
    data-slot="sheet-overlay"
    className={cn(overlayClassNames.sheetBackdrop, className)}
    style={{ zIndex: overlayZIndex.backdrop, ...getSheetStyle(style) }}
    {...props}
  />
);
SheetOverlay.displayName = "SheetOverlay";

const sheetVariants = cva(overlayClassNames.sheetSurface, {
  variants: {
    /**
     * Edge the sheet is anchored to and slides in from. `left` and `right` are physical screen
     * edges and never flip; `start` and `end` are the inline edges and mirror under `dir="rtl"`
     * (`start` is the left edge in LTR and the right edge in RTL). Use `start`/`end` for
     * navigation and detail panels that should follow the reading direction.
     * @default "right"
     */
    side: {
      top: "inset-x-[var(--sheet-inset)] top-[var(--sheet-inset)] max-h-[min(var(--sheet-edge-height),calc(100dvh_-_var(--sheet-inset)_-_var(--sheet-inset)))] rounded-[var(--sheet-radius)] data-ending-style:-translate-y-full data-starting-style:-translate-y-full",
      bottom:
        "inset-x-[var(--sheet-inset)] bottom-[var(--sheet-inset)] max-h-[min(var(--sheet-edge-height),calc(100dvh_-_var(--sheet-inset)_-_var(--sheet-inset)))] rounded-[var(--sheet-radius)] data-ending-style:translate-y-full data-starting-style:translate-y-full",
      left: "inset-y-[var(--sheet-inset)] left-[var(--sheet-inset)] h-[calc(100dvh_-_var(--sheet-inset)_-_var(--sheet-inset))] w-[min(var(--sheet-side-width),calc(100vw_-_var(--sheet-inset)_-_var(--sheet-inset)))] rounded-[var(--sheet-radius)] data-ending-style:-translate-x-full data-starting-style:-translate-x-full",
      right:
        "inset-y-[var(--sheet-inset)] right-[var(--sheet-inset)] h-[calc(100dvh_-_var(--sheet-inset)_-_var(--sheet-inset))] w-[min(var(--sheet-side-width),calc(100vw_-_var(--sheet-inset)_-_var(--sheet-inset)))] rounded-[var(--sheet-radius)] data-ending-style:translate-x-full data-starting-style:translate-x-full",
      // Logical edges: `start-*`/`end-*` place the panel, and the slide direction is chosen per
      // direction so it always travels in from (and back out to) its own edge. The ltr:/rtl:
      // variants are mutually exclusive, so they never compete on specificity.
      start:
        "inset-y-[var(--sheet-inset)] start-[var(--sheet-inset)] h-[calc(100dvh_-_var(--sheet-inset)_-_var(--sheet-inset))] w-[min(var(--sheet-side-width),calc(100vw_-_var(--sheet-inset)_-_var(--sheet-inset)))] rounded-[var(--sheet-radius)] ltr:data-ending-style:-translate-x-full ltr:data-starting-style:-translate-x-full rtl:data-ending-style:translate-x-full rtl:data-starting-style:translate-x-full",
      end: "inset-y-[var(--sheet-inset)] end-[var(--sheet-inset)] h-[calc(100dvh_-_var(--sheet-inset)_-_var(--sheet-inset))] w-[min(var(--sheet-side-width),calc(100vw_-_var(--sheet-inset)_-_var(--sheet-inset)))] rounded-[var(--sheet-radius)] ltr:data-ending-style:translate-x-full ltr:data-starting-style:translate-x-full rtl:data-ending-style:-translate-x-full rtl:data-starting-style:-translate-x-full",
    },
  },
  defaultVariants: {
    side: "right",
  },
});

export interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof BaseDialog.Popup>,
    VariantProps<typeof sheetVariants> {
  /**
   * Render the backdrop. Prefer `noOverlay` in docs because it names the visual
   * removal directly; `overlay` remains available for boolean composition.
   * @default true
   */
  overlay?: boolean;
  /**
   * Hide the backdrop while keeping the sheet surface and focus behavior.
   * @default false
   */
  noOverlay?: boolean;
  /**
   * Render the built-in close icon button.
   * @default true
   */
  showClose?: boolean;
  /** Alias for `showClose`, matching newer generated examples; wins over `showClose` when both are set. */
  close?: boolean;
  /**
   * Accessible name for the built-in close button. Pass a translated string.
   * @default "Close"
   */
  closeLabel?: string;
}

/**
 * Portalled panel anchored to a screen edge, with its own overlay and an optional close button.
 * The close button sits on the inline end (top-right in LTR, top-left in RTL). The panel is
 * portalled to `<body>`, so `start`/`end` follow the direction in effect there (normally
 * `<html dir>`); pass `dir="rtl"` to this component to force it for one sheet.
 */
const SheetContent = ({
  side = "right",
  className,
  children,
  overlay = true,
  noOverlay = false,
  showClose,
  close,
  closeLabel = "Close",
  style,
  ref,
  ...props
}: SheetContentProps & { ref?: React.Ref<HTMLDivElement> | undefined }) => {
  const shouldRenderClose = close ?? showClose ?? true;
  const shouldRenderOverlay = overlay && !noOverlay;

  return (
    <SheetPortal>
      {shouldRenderOverlay ? <SheetOverlay /> : null}
      <BaseDialog.Popup
        ref={ref}
        data-slot="sheet-content"
        data-side={side}
        className={cn(sheetVariants({ side }), className)}
        style={{ zIndex: overlayZIndex.modal, ...getSheetStyle(style) }}
        {...props}
      >
        {children}
        {shouldRenderClose ? (
          <SheetClose
            aria-label={closeLabel}
            className={cn(
              "absolute end-[var(--sheet-close-offset)] top-[var(--sheet-close-offset)] inline-flex size-[var(--sheet-close-size)] items-center justify-center rounded-[var(--sheet-close-radius)] text-muted-foreground",
              "transition-[background-color,color,box-shadow] duration-[var(--motion-duration-micro)] ease-[var(--ease-out)] hover:bg-muted hover:text-foreground",
              overlayClassNames.focusRing,
              "disabled:pointer-events-none motion-reduce:transition-none",
            )}
          >
            <XIcon aria-hidden="true" className="size-[var(--sheet-close-icon-size)]" />
            <span className="sr-only">{closeLabel}</span>
          </SheetClose>
        ) : null}
      </BaseDialog.Popup>
    </SheetPortal>
  );
};
SheetContent.displayName = "SheetContent";

export type SheetHeaderProps = React.ComponentPropsWithoutRef<"div">;

/** Top section holding the title and description, separated from the body by a hairline. */
const SheetHeader = ({
  className,
  ref,
  ...props
}: SheetHeaderProps & { ref?: React.Ref<HTMLDivElement> | undefined }) => (
  <div
    ref={ref}
    data-slot="sheet-header"
    className={cn(
      "grid gap-[var(--sheet-header-gap)] border-b border-border px-[var(--sheet-padding-x)] py-[var(--sheet-padding-y)] pe-[calc(var(--sheet-padding-x)_+_var(--sheet-close-size))] text-start",
      className,
    )}
    {...props}
  />
);
SheetHeader.displayName = "SheetHeader";

export type SheetBodyProps = React.ComponentPropsWithoutRef<"div">;

/** Scrollable middle section; the only part that scrolls when content is taller than the sheet. */
const SheetBody = ({
  className,
  ref,
  ...props
}: SheetBodyProps & { ref?: React.Ref<HTMLDivElement> | undefined }) => (
  <div
    ref={ref}
    data-slot="sheet-body"
    className={cn(
      "min-h-0 flex-1 overflow-y-auto overscroll-contain px-[var(--sheet-padding-x)] py-[var(--sheet-body-padding-y)]",
      className,
    )}
    {...props}
  />
);
SheetBody.displayName = "SheetBody";

export type SheetFooterProps = React.ComponentPropsWithoutRef<"div">;

/** Bottom action row, pinned below the body; stacked on small screens, end-aligned from `sm`. */
const SheetFooter = ({
  className,
  ref,
  ...props
}: SheetFooterProps & { ref?: React.Ref<HTMLDivElement> | undefined }) => (
  <div
    ref={ref}
    data-slot="sheet-footer"
    className={cn(
      "mt-auto flex flex-col-reverse gap-[var(--sheet-footer-gap)] border-t border-border px-[var(--sheet-padding-x)] py-[var(--sheet-padding-y)] sm:flex-row sm:justify-end",
      className,
    )}
    {...props}
  />
);
SheetFooter.displayName = "SheetFooter";

export type SheetTitleProps = React.ComponentPropsWithoutRef<typeof BaseDialog.Title>;

/** Accessible name of the sheet. Always render one. */
const SheetTitle = ({
  className,
  ref,
  ...props
}: SheetTitleProps & { ref?: React.Ref<HTMLHeadingElement> | undefined }) => (
  <BaseDialog.Title
    ref={ref}
    data-slot="sheet-title"
    className={cn("font-semibold text-base leading-6 text-foreground", className)}
    {...props}
  />
);
SheetTitle.displayName = "SheetTitle";

export type SheetDescriptionProps = React.ComponentPropsWithoutRef<typeof BaseDialog.Description>;

/** Accessible description of the sheet: what it is for or what saving will do. */
const SheetDescription = ({
  className,
  ref,
  ...props
}: SheetDescriptionProps & { ref?: React.Ref<HTMLParagraphElement> | undefined }) => (
  <BaseDialog.Description
    ref={ref}
    data-slot="sheet-description"
    className={cn("text-muted-foreground text-sm leading-5", className)}
    {...props}
  />
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
