"use client";

import { ChevronDown } from "@nebutra/icons";
import * as React from "react";

import { overlayClassNames, overlayZIndex } from "../tokens/components/overlay";
import { cn } from "../utils/cn";
import { navigationMenuTriggerStyle } from "./navigation-menu-variants";

const NavigationMenuContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
}>({ value: "", onValueChange: () => {} });

const NavigationMenu = ({
  className,
  children,
  value: controlledValue,
  onValueChange,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  value?: string;
  onValueChange?: (value: string) => void;
} & { ref?: React.Ref<HTMLDivElement> | undefined }) => {
  const [uncontrolledValue, setUncontrolledValue] = React.useState("");
  const value = controlledValue !== undefined ? controlledValue : uncontrolledValue;
  const setValue = onValueChange || setUncontrolledValue;
  const contextValue = { value, onValueChange: setValue };

  return (
    <NavigationMenuContext.Provider value={contextValue}>
      <div
        ref={ref}
        className={cn("relative z-10 flex max-w-max flex-1 items-center justify-center", className)}
        {...props}
      >
        {children}
        <NavigationMenuViewport />
      </div>
    </NavigationMenuContext.Provider>
  );
};
NavigationMenu.displayName = "NavigationMenu";

const NavigationMenuList = ({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLUListElement> & { ref?: React.Ref<HTMLUListElement> | undefined }) => (
  <ul
    ref={ref}
    className={cn("group flex flex-1 list-none items-center justify-center space-x-1", className)}
    {...props}
  />
);
NavigationMenuList.displayName = "NavigationMenuList";

const NavigationMenuItemContext = React.createContext<{ value: string }>({ value: "" });

const NavigationMenuItem = ({
  className,
  value,
  children,
  ref,
  ...props
}: React.HTMLAttributes<HTMLLIElement> & { value?: string } & {
  ref?: React.Ref<HTMLLIElement> | undefined;
}) => {
  const defaultId = React.useId();
  const itemValue = value || defaultId;
  const contextValue = { value: itemValue };

  return (
    <NavigationMenuItemContext.Provider value={contextValue}>
      <li ref={ref} className={cn("relative", className)} {...props}>
        {children}
      </li>
    </NavigationMenuItemContext.Provider>
  );
};
NavigationMenuItem.displayName = "NavigationMenuItem";

const NavigationMenuTrigger = ({
  className,
  children,
  ref,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  ref?: React.Ref<HTMLButtonElement> | undefined;
}) => {
  const { value: contextValue, onValueChange } = React.use(NavigationMenuContext);
  const { value: itemValue } = React.use(NavigationMenuItemContext);

  const isOpen = contextValue === itemValue;

  return (
    <button
      type="button"
      ref={ref}
      data-state={isOpen ? "open" : "closed"}
      onClick={() => onValueChange(isOpen ? "" : itemValue)}
      onMouseEnter={() => onValueChange(itemValue)}
      className={cn(navigationMenuTriggerStyle(), "group", className)}
      {...props}
    >
      {children}{" "}
      <ChevronDown
        className="relative top-[1px] ml-1 h-3 w-3 transition-transform duration-[var(--motion-duration-flow)] ease-[var(--ease-out)] group-data-[state=open]:rotate-180 motion-reduce:transition-none"
        aria-hidden="true"
      />
    </button>
  );
};
NavigationMenuTrigger.displayName = "NavigationMenuTrigger";

const NavigationMenuContent = ({
  className,
  children,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> | undefined }) => {
  const { value: contextValue } = React.use(NavigationMenuContext);
  const { value: itemValue } = React.use(NavigationMenuItemContext);
  const isOpen = contextValue === itemValue;

  if (!isOpen) return null;

  return (
    <div
      ref={ref}
      className={cn("absolute left-0 top-full w-full pt-1.5 md:w-auto", className)}
      {...props}
    >
      <div
        className={overlayClassNames.navigationMenuSurface}
        style={{ zIndex: overlayZIndex.popover }}
      >
        {children}
      </div>
    </div>
  );
};
NavigationMenuContent.displayName = "NavigationMenuContent";

const NavigationMenuLink = ({
  asChild,
  active,
  className,
  children,
  href,
  onClick,
  ref,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { asChild?: boolean; active?: boolean } & {
  ref?: React.Ref<HTMLAnchorElement> | undefined;
}) => {
  const { onValueChange } = React.use(NavigationMenuContext);

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<React.ComponentProps<"a">>;
    return React.cloneElement(child, {
      ref,
      "data-active": active ? "" : undefined,
      onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
        onValueChange("");
        onClick?.(e);
        if (child.props.onClick) child.props.onClick(e);
      },
      className: cn(className, child.props.className),
      ...props,
    } as React.ComponentProps<"a"> & React.RefAttributes<HTMLAnchorElement>);
  }

  return (
    <a
      ref={ref}
      href={href}
      data-active={active ? "" : undefined}
      onClick={(event) => {
        onValueChange("");
        onClick?.(event);
      }}
      className={className}
      {...props}
    >
      {children}
    </a>
  );
};
NavigationMenuLink.displayName = "NavigationMenuLink";

const NavigationMenuViewport = ({
  ref: _ref,
}: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> | undefined }) => {
  return null; // Viewport is handled implicitly by absolute positioning in the Content component for this lightweight implementation
};
NavigationMenuViewport.displayName = "NavigationMenuViewport";

const NavigationMenuIndicator = ({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> | undefined }) => (
  <div
    ref={ref}
    className={cn("top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden", className)}
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
