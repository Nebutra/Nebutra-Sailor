"use client";

import { cva } from "class-variance-authority";
import { ChevronDown } from "lucide-react";
import * as React from "react";

import { cn } from "../utils/cn";

const NavigationMenuContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
}>({ value: "", onValueChange: () => {} });

const NavigationMenu = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value?: string; onValueChange?: (value: string) => void }
>(({ className, children, value: controlledValue, onValueChange, ...props }, ref) => {
  const [uncontrolledValue, setUncontrolledValue] = React.useState("");
  const value = controlledValue !== undefined ? controlledValue : uncontrolledValue;
  const setValue = onValueChange || setUncontrolledValue;

  return (
    <NavigationMenuContext.Provider value={{ value, onValueChange: setValue }}>
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
});
NavigationMenu.displayName = "NavigationMenu";

const NavigationMenuList = React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("group flex flex-1 list-none items-center justify-center space-x-1", className)}
    {...props}
  />
));
NavigationMenuList.displayName = "NavigationMenuList";

const NavigationMenuItemContext = React.createContext<{ value: string }>({ value: "" });

const NavigationMenuItem = React.forwardRef<
  HTMLLIElement,
  React.HTMLAttributes<HTMLLIElement> & { value?: string }
>(({ className, value, children, ...props }, ref) => {
  const defaultId = React.useId();
  const itemValue = value || defaultId;
  return (
    <NavigationMenuItemContext.Provider value={{ value: itemValue }}>
      <li ref={ref} className={cn("relative", className)} {...props}>
        {children}
      </li>
    </NavigationMenuItemContext.Provider>
  );
});
NavigationMenuItem.displayName = "NavigationMenuItem";

const navigationMenuTriggerStyle = cva(
  "group inline-flex h-10 w-max items-center justify-center rounded-md bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50",
);

const NavigationMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const { value: contextValue, onValueChange } = React.useContext(NavigationMenuContext);
  const { value: itemValue } = React.useContext(NavigationMenuItemContext);

  const isOpen = contextValue === itemValue;

  return (
    <button
      ref={ref}
      data-state={isOpen ? "open" : "closed"}
      onClick={() => onValueChange(isOpen ? "" : itemValue)}
      onMouseEnter={() => onValueChange(itemValue)}
      className={cn(navigationMenuTriggerStyle(), "group", className)}
      {...props}
    >
      {children}{" "}
      <ChevronDown
        className="relative top-[1px] ml-1 h-3 w-3 transition duration-200 group-data-[state=open]:rotate-180"
        aria-hidden="true"
      />
    </button>
  );
});
NavigationMenuTrigger.displayName = "NavigationMenuTrigger";

const NavigationMenuContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { value: contextValue } = React.useContext(NavigationMenuContext);
  const { value: itemValue } = React.useContext(NavigationMenuItemContext);
  const isOpen = contextValue === itemValue;

  if (!isOpen) return null;

  return (
    <div
      ref={ref}
      className={cn("left-0 top-full w-full absolute pt-1.5 md:w-auto", className)}
      {...props}
    >
      <div className="overflow-hidden rounded-xl border bg-background/90 backdrop-blur-md text-popover-foreground shadow-xl animate-in fade-in zoom-in-95 duration-200">
        {children}
      </div>
    </div>
  );
});
NavigationMenuContent.displayName = "NavigationMenuContent";

const NavigationMenuLink = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement> & { asChild?: boolean; active?: boolean }
>(({ asChild, active, className, children, ...props }, ref) => {
  const { onValueChange } = React.useContext(NavigationMenuContext);

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<React.ComponentProps<"a">>;
    return React.cloneElement(child, {
      ref,
      "data-active": active ? "" : undefined,
      onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
        onValueChange("");
        if (child.props.onClick) child.props.onClick(e);
      },
      className: cn(className, child.props.className),
      ...props,
    } as React.ComponentProps<"a"> & React.RefAttributes<HTMLAnchorElement>);
  }

  return (
    <a
      ref={ref}
      data-active={active ? "" : undefined}
      onClick={() => onValueChange("")}
      onKeyDown={(e) => {
        if (e.key === "Enter") onValueChange("");
      }}
      tabIndex={0}
      role="menuitem"
      className={className}
      {...props}
    >
      {children}
    </a>
  );
});
NavigationMenuLink.displayName = "NavigationMenuLink";

const NavigationMenuViewport = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>((_props, _ref) => {
  return null; // Viewport is handled implicitly by absolute positioning in the Content component for this lightweight implementation
});
NavigationMenuViewport.displayName = "NavigationMenuViewport";

const NavigationMenuIndicator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden", className)}
    {...props}
  >
    <div className="relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm bg-border shadow-md" />
  </div>
));
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
  navigationMenuTriggerStyle,
};
