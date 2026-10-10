"use client";

/**
 * NavigationMenu — site navigation with flyout panels, built on Base UI
 * NavigationMenu.
 *
 * https://base-ui.com/react/components/navigation-menu
 *
 * What Base UI gives every call site, and the hand-rolled version did not:
 *   - click opens and closes; hover opens only after an intent delay
 *     (`delay`, default 50ms) and closes after `closeDelay`, with a safe
 *     triangle so a diagonal move into the panel does not close it
 *   - `aria-expanded` / `aria-controls` on every trigger
 *   - Esc closes and returns focus to the trigger; outside click dismisses
 *   - ← / → move between triggers, ↓ / Enter move into the open panel
 *   - the panel is portalled and positioned by the shared overlay layer, one
 *     viewport morphs between panels instead of each panel stacking with `z-[1]`
 *
 * The public API is unchanged: `value` / `onValueChange` (empty string means
 * closed), `NavigationMenuItem value`, `NavigationMenuLink asChild | active`.
 * `NavigationMenuViewport` is rendered by the root and kept as an export for
 * source compatibility.
 */

import { NavigationMenu as BaseNavigationMenu } from "@base-ui/react/navigation-menu";
import { ChevronDown } from "@nebutra/icons";
import * as React from "react";

import { overlayClassNames, overlayZIndex } from "../tokens/components/overlay";
import { cn } from "../utils/cn";
import { navigationMenuTriggerStyle } from "./navigation-menu-variants";

type BaseRootProps = React.ComponentProps<typeof BaseNavigationMenu.Root>;

export interface NavigationMenuProps
  extends Omit<BaseRootProps, "value" | "defaultValue" | "onValueChange"> {
  /** The open item's value; `""` when every panel is closed. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Side offset of the flyout panel from the list, in px. */
  sideOffset?: number;
}

const NavigationMenu = ({
  className,
  children,
  value,
  defaultValue,
  onValueChange,
  sideOffset = 6,
  ref,
  ...props
}: NavigationMenuProps & { ref?: React.Ref<HTMLElement> | undefined }) => {
  const controlled = value !== undefined ? { value: value === "" ? null : value } : {};
  const uncontrolled =
    defaultValue !== undefined ? { defaultValue: defaultValue === "" ? null : defaultValue } : {};

  return (
    <BaseNavigationMenu.Root
      ref={ref}
      className={cn("relative z-10 flex max-w-max flex-1 items-center justify-center", className)}
      onValueChange={(next: unknown) => onValueChange?.(next == null ? "" : String(next))}
      {...controlled}
      {...uncontrolled}
      {...props}
    >
      {children}
      <BaseNavigationMenu.Portal>
        <BaseNavigationMenu.Positioner
          sideOffset={sideOffset}
          collisionPadding={8}
          style={{ zIndex: overlayZIndex.popover }}
          className="h-[var(--positioner-height)] w-[var(--positioner-width)] max-w-[var(--available-width)]"
        >
          <BaseNavigationMenu.Popup
            className={cn(
              overlayClassNames.navigationMenuSurface,
              "relative h-[var(--popup-height)] w-[var(--popup-width)]",
            )}
          >
            <BaseNavigationMenu.Viewport className="relative h-full w-full overflow-hidden" />
          </BaseNavigationMenu.Popup>
        </BaseNavigationMenu.Positioner>
      </BaseNavigationMenu.Portal>
    </BaseNavigationMenu.Root>
  );
};
NavigationMenu.displayName = "NavigationMenu";

const NavigationMenuList = ({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof BaseNavigationMenu.List> & {
  ref?: React.Ref<HTMLUListElement> | undefined;
}) => (
  <BaseNavigationMenu.List
    ref={ref}
    className={cn("group flex flex-1 list-none items-center justify-center space-x-1", className)}
    {...props}
  />
);
NavigationMenuList.displayName = "NavigationMenuList";

const NavigationMenuItem = ({
  className,
  value,
  ref,
  ...props
}: Omit<React.ComponentProps<typeof BaseNavigationMenu.Item>, "value"> & {
  /** Stable id for controlled `value`. Generated when omitted. */
  value?: string;
} & { ref?: React.Ref<HTMLLIElement> | undefined }) => (
  <BaseNavigationMenu.Item
    ref={ref}
    className={cn("relative", className)}
    {...(value !== undefined ? { value } : {})}
    {...props}
  />
);
NavigationMenuItem.displayName = "NavigationMenuItem";

const NavigationMenuTrigger = ({
  className,
  children,
  ref,
  ...props
}: React.ComponentProps<typeof BaseNavigationMenu.Trigger> & {
  ref?: React.Ref<HTMLButtonElement> | undefined;
}) => (
  <BaseNavigationMenu.Trigger
    ref={ref}
    className={cn(
      navigationMenuTriggerStyle(),
      "group data-[popup-open]:bg-accent/50",
      className as string | undefined,
    )}
    {...props}
  >
    {children}{" "}
    <BaseNavigationMenu.Icon
      aria-hidden="true"
      className="relative top-[1px] ml-1 transition-transform duration-[var(--motion-duration-flow)] ease-[var(--ease-out)] data-[popup-open]:rotate-180 motion-reduce:transition-none"
    >
      <ChevronDown className="h-3 w-3" />
    </BaseNavigationMenu.Icon>
  </BaseNavigationMenu.Trigger>
);
NavigationMenuTrigger.displayName = "NavigationMenuTrigger";

const NavigationMenuContent = ({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof BaseNavigationMenu.Content> & {
  ref?: React.Ref<HTMLDivElement> | undefined;
}) => (
  <BaseNavigationMenu.Content
    ref={ref}
    className={cn(
      "transition-opacity duration-[var(--motion-duration-micro)] ease-out",
      "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 motion-reduce:transition-none",
      className as string | undefined,
    )}
    {...props}
  />
);
NavigationMenuContent.displayName = "NavigationMenuContent";

const NavigationMenuLink = ({
  asChild,
  children,
  render,
  ref,
  ...props
}: React.ComponentProps<typeof BaseNavigationMenu.Link> & {
  /** Render the child element (e.g. a router Link) as the link. */
  asChild?: boolean;
} & { ref?: React.Ref<HTMLAnchorElement> | undefined }) => {
  const childElement =
    asChild && React.isValidElement(children) ? (children as React.ReactElement) : undefined;
  return (
    <BaseNavigationMenu.Link ref={ref} render={childElement ?? render} {...props}>
      {childElement ? undefined : children}
    </BaseNavigationMenu.Link>
  );
};
NavigationMenuLink.displayName = "NavigationMenuLink";

/**
 * @deprecated The root renders the viewport. Kept so existing imports compile;
 * renders nothing.
 */
const NavigationMenuViewport = (_props: React.HTMLAttributes<HTMLDivElement>) => null;
NavigationMenuViewport.displayName = "NavigationMenuViewport";

/** Decorative caret under the open trigger. */
const NavigationMenuIndicator = ({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> | undefined }) => (
  <div
    ref={ref}
    aria-hidden="true"
    className={cn("top-full flex h-1.5 items-end justify-center overflow-hidden", className)}
    {...props}
  >
    <div className="relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm bg-border shadow-md" />
  </div>
);
NavigationMenuIndicator.displayName = "NavigationMenuIndicator";

export {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
};
