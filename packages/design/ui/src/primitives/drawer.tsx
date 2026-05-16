"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "../utils";

// =============================================================================
// Types
// =============================================================================

export type DrawerDirection = "top" | "bottom" | "left" | "right";

export type DrawerHeight = number | string;

export type DrawerProps = React.ComponentProps<typeof DrawerPrimitive.Root> & {
  /** Controlled open state alias used by Geist-compatible examples. Prefer `open` for new Radix-style code. */
  show?: boolean;
  /** Called when the drawer is dismissed by escape, outside press, swipe, or close control. */
  onDismiss?: () => void;
  /** Bottom sheet height. Numbers resolve to px. */
  height?: DrawerHeight;
  /** Alias for `height` when the content needs a capped frame. */
  customHeight?: DrawerHeight;
  /** Direction the drawer slides from. Use bottom for Drawer; use Sheet for lateral desktop panels. */
  direction?: DrawerDirection;
};

export type DrawerTriggerProps = React.ComponentProps<typeof DrawerPrimitive.Trigger>;

export type DrawerPortalProps = React.ComponentProps<typeof DrawerPrimitive.Portal>;

export type DrawerCloseProps = React.ComponentProps<typeof DrawerPrimitive.Close>;

export type DrawerOverlayProps = React.ComponentProps<typeof DrawerPrimitive.Overlay>;

export type DrawerContentProps = React.ComponentProps<typeof DrawerPrimitive.Content> & {
  /** Overrides root height for this content. Numbers resolve to px. */
  height?: DrawerHeight;
  /** Keep body scroll inside the drawer frame rather than the page behind it. */
  verticalScroll?: boolean;
  /** Show the drag handle on bottom drawers. */
  showHandle?: boolean;
};

export type DrawerHeaderProps = React.ComponentProps<"div">;

export type DrawerBodyProps = React.ComponentProps<"div">;

export type DrawerFooterProps = React.ComponentProps<"div">;

export type DrawerTitleProps = React.ComponentProps<typeof DrawerPrimitive.Title>;

export type DrawerDescriptionProps = React.ComponentProps<typeof DrawerPrimitive.Description>;

// =============================================================================
// Components
// =============================================================================

type DrawerRootContextValue = {
  height?: DrawerHeight;
};

type DrawerContentStyle = React.CSSProperties & {
  "--drawer-height"?: string;
};

const DrawerRootContext = React.createContext<DrawerRootContextValue>({});

function formatDrawerHeight(height: DrawerHeight | undefined): string | undefined {
  if (height == null) {
    return undefined;
  }

  return typeof height === "number" ? `${height}px` : height;
}

/**
 * Drawer - Mobile bottom sheet
 *
 * @description
 * A focused mobile bottom sheet built on Vaul. Use Modal for blocking desktop
 * flows and Sheet for lateral panels.
 *
 * @example Basic usage
 * ```tsx
 * <Drawer>
 *   <DrawerTrigger asChild>
 *     <Button>Open Drawer</Button>
 *   </DrawerTrigger>
 *   <DrawerContent>
 *     <DrawerHeader>
 *       <DrawerTitle>Title</DrawerTitle>
 *       <DrawerDescription>Description</DrawerDescription>
 *     </DrawerHeader>
 *     <DrawerBody>Content here</DrawerBody>
 *     <DrawerFooter>
 *       <DrawerClose asChild>
 *         <Button variant="outline">Cancel</Button>
 *       </DrawerClose>
 *       <Button>Save</Button>
 *     </DrawerFooter>
 *   </DrawerContent>
 * </Drawer>
 * ```
 *
 * @example Controlled
 * ```tsx
 * const [open, setOpen] = useState(false);
 * <Drawer open={open} onOpenChange={setOpen}>...</Drawer>
 * ```
 */
function Drawer({
  show,
  onDismiss,
  height,
  customHeight,
  direction = "bottom",
  open,
  onOpenChange,
  modal = true,
  shouldScaleBackground = false,
  ...props
}: DrawerProps) {
  const controlledOpen = open ?? show;
  const rootProps: React.ComponentProps<typeof DrawerPrimitive.Root> = {
    ...props,
    direction,
    modal,
    shouldScaleBackground,
  };

  if (controlledOpen !== undefined) {
    rootProps.open = controlledOpen;
  }

  if (onOpenChange !== undefined || onDismiss !== undefined) {
    rootProps.onOpenChange = (nextOpen) => {
      onOpenChange?.(nextOpen);

      if (!nextOpen) {
        onDismiss?.();
      }
    };
  }

  const contextValue = React.useMemo<DrawerRootContextValue>(() => {
    const resolvedHeight = customHeight ?? height;

    return resolvedHeight === undefined ? {} : { height: resolvedHeight };
  }, [customHeight, height]);

  return (
    <DrawerRootContext.Provider value={contextValue}>
      <DrawerPrimitive.Root data-slot="drawer" {...rootProps} />
    </DrawerRootContext.Provider>
  );
}

function DrawerTrigger({ ...props }: DrawerTriggerProps) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal({ ...props }: DrawerPortalProps) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerClose({ ...props }: DrawerCloseProps) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerOverlay({ className, ...props }: DrawerOverlayProps) {
  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-background/70 backdrop-blur-[2px]",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    />
  );
}

function DrawerContent({
  className,
  children,
  height,
  verticalScroll = true,
  showHandle = true,
  style,
  ...props
}: DrawerContentProps) {
  const rootContext = React.useContext(DrawerRootContext);
  const resolvedHeight = formatDrawerHeight(height ?? rootContext.height);
  const contentStyle =
    resolvedHeight === undefined
      ? style
      : ({
          "--drawer-height": resolvedHeight,
          ...style,
        } satisfies DrawerContentStyle);

  return (
    <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay />
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        className={cn(
          "group/drawer-content fixed z-50 flex bg-background text-foreground shadow-lg outline-none",
          verticalScroll && "overflow-hidden",
          "data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:h-[var(--drawer-height,auto)] data-[vaul-drawer-direction=bottom]:max-h-[min(var(--drawer-height,80vh),calc(100dvh-1rem))] data-[vaul-drawer-direction=bottom]:flex-col data-[vaul-drawer-direction=bottom]:rounded-t-[var(--radius-xl)] data-[vaul-drawer-direction=bottom]:border-t",
          "data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:h-[var(--drawer-height,auto)] data-[vaul-drawer-direction=top]:max-h-[min(var(--drawer-height,80vh),calc(100dvh-1rem))] data-[vaul-drawer-direction=top]:flex-col data-[vaul-drawer-direction=top]:rounded-b-[var(--radius-xl)] data-[vaul-drawer-direction=top]:border-b",
          "data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-[min(24rem,calc(100vw-2rem))] data-[vaul-drawer-direction=right]:flex-col data-[vaul-drawer-direction=right]:border-l",
          "data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-[min(24rem,calc(100vw-2rem))] data-[vaul-drawer-direction=left]:flex-col data-[vaul-drawer-direction=left]:border-r",
          className,
        )}
        style={contentStyle}
        {...props}
      >
        {showHandle ? (
          <DrawerPrimitive.Handle className="mx-auto mt-2 hidden h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30 group-data-[vaul-drawer-direction=bottom]/drawer-content:block" />
        ) : null}
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }: DrawerHeaderProps) {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        "grid w-full gap-1 border-b px-5 pb-4 pt-3 text-center md:mx-auto md:max-w-md",
        className,
      )}
      {...props}
    />
  );
}

function DrawerBody({ className, ...props }: DrawerBodyProps) {
  return (
    <div
      data-slot="drawer-body"
      className={cn(
        "min-h-0 w-full flex-1 overscroll-contain px-5 py-4 md:mx-auto md:max-w-md",
        "group-data-[vaul-drawer-direction=bottom]/drawer-content:overflow-y-auto group-data-[vaul-drawer-direction=top]/drawer-content:overflow-y-auto",
        className,
      )}
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }: DrawerFooterProps) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn(
        "mt-auto grid w-full gap-2 border-t bg-background/95 px-5 py-4 md:mx-auto md:max-w-md",
        className,
      )}
      {...props}
    />
  );
}

function DrawerTitle({ className, ...props }: DrawerTitleProps) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn("text-base font-semibold leading-6 text-foreground", className)}
      {...props}
    />
  );
}

function DrawerDescription({ className, ...props }: DrawerDescriptionProps) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-sm leading-5 text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
};
