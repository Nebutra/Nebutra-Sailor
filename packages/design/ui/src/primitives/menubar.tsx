"use client";

import { Check, ChevronRight, Status as Circle } from "@nebutra/icons";
import * as React from "react";

import { overlayClassNames, overlayZIndex } from "../tokens/components/overlay";
import { cn } from "../utils/cn";
import { overlayPrimitiveClassNames } from "./overlay";

function assignRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") {
    ref(value);
    return;
  }

  if (ref) {
    ref.current = value;
  }
}

const MenubarContext = React.createContext<{
  activeMenu: string | null;
  setActiveMenu: (menu: string | null) => void;
}>({ activeMenu: null, setActiveMenu: () => {} });

const Menubar = ({
  className,
  children,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> | undefined }) => {
  const [activeMenu, setActiveMenu] = React.useState<string | null>(null);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const contextValue = { activeMenu, setActiveMenu };

  React.useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && rootRef.current?.contains(event.target)) return;
      setActiveMenu(null);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function setRootRef(node: HTMLDivElement | null) {
    rootRef.current = node;
    assignRef(ref, node);
  }

  return (
    <MenubarContext.Provider value={contextValue}>
      <div
        ref={setRootRef}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.stopPropagation();
          }
        }}
        tabIndex={-1}
        role="menubar"
        className={cn(overlayPrimitiveClassNames.menubarRoot, className)}
        {...props}
      >
        {children}
      </div>
    </MenubarContext.Provider>
  );
};
Menubar.displayName = "Menubar";

const MenubarMenuContext = React.createContext<{
  value: string;
  isOpen: boolean;
}>({ value: "", isOpen: false });

const MenubarMenu = ({ children }: { children: React.ReactNode }) => {
  const { activeMenu } = React.use(MenubarContext);
  const value = React.useId();
  const isOpen = activeMenu === value;
  const contextValue = { value, isOpen };

  return (
    <MenubarMenuContext.Provider value={contextValue}>
      <div className="relative inline-block text-left">{children}</div>
    </MenubarMenuContext.Provider>
  );
};

const MenubarPortal = ({ children }: { children: React.ReactNode }) => <>{children}</>;

const MenubarGroup = ({ children }: { children: React.ReactNode }) => <>{children}</>;

const MenubarTrigger = ({
  className,
  type = "button",
  ref,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  ref?: React.Ref<HTMLButtonElement> | undefined;
}) => {
  const { activeMenu, setActiveMenu } = React.use(MenubarContext);
  const { value, isOpen } = React.use(MenubarMenuContext);

  return (
    <button
      ref={ref}
      type={type}
      role="menuitem"
      tabIndex={0}
      aria-haspopup="menu"
      aria-expanded={isOpen}
      data-state={isOpen ? "open" : "closed"}
      onClick={() => setActiveMenu(isOpen ? null : value)}
      onMouseEnter={() => {
        // Open on hover only if another menu is already active
        if (activeMenu && activeMenu !== value) {
          setActiveMenu(value);
        }
      }}
      className={cn(overlayPrimitiveClassNames.menubarTrigger, className)}
      {...props}
    />
  );
};
MenubarTrigger.displayName = "MenubarTrigger";

const MenubarSubContext = React.createContext<{
  isOpen: boolean;
  setIsOpen: (o: boolean) => void;
}>({ isOpen: false, setIsOpen: () => {} });

const MenubarSub = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const contextValue = { isOpen, setIsOpen };

  return (
    <MenubarSubContext.Provider value={contextValue}>
      <div
        className="relative"
        onPointerEnter={() => setIsOpen(true)}
        onPointerLeave={() => setIsOpen(false)}
      >
        {children}
      </div>
    </MenubarSubContext.Provider>
  );
};

const MenubarSubTrigger = ({
  className,
  inset,
  children,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { inset?: boolean } & {
  ref?: React.Ref<HTMLDivElement> | undefined;
}) => {
  const { isOpen } = React.use(MenubarSubContext);
  return (
    <div
      ref={ref}
      role="menuitem"
      tabIndex={0}
      aria-haspopup="menu"
      aria-expanded={isOpen}
      data-state={isOpen ? "open" : "closed"}
      className={cn(overlayPrimitiveClassNames.menubarSubTrigger, inset && "pl-8", className)}
      {...props}
    >
      {children}
      <ChevronRight className="ml-auto h-4 w-4" />
    </div>
  );
};
MenubarSubTrigger.displayName = "MenubarSubTrigger";

const MenubarSubContent = ({
  className,
  style,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> | undefined }) => {
  const { isOpen } = React.use(MenubarSubContext);

  if (!isOpen) return null;

  return (
    <div
      ref={ref}
      role="menu"
      className={cn(
        overlayClassNames.menuSurface,
        overlayPrimitiveClassNames.menuSurface,
        "absolute top-0 left-full ml-1 min-w-[8rem]",
        className,
      )}
      style={{ zIndex: overlayZIndex.popover, ...style }}
      {...props}
    />
  );
};
MenubarSubContent.displayName = "MenubarSubContent";

const MenubarContent = ({
  className,
  align: _align = "start",
  alignOffset: _alignOffset = -4,
  sideOffset: _sideOffset = 8,
  style,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  align?: "start" | "center" | "end";
  alignOffset?: number;
  sideOffset?: number;
} & { ref?: React.Ref<HTMLDivElement> | undefined }) => {
  const { isOpen } = React.use(MenubarMenuContext);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const [side, setSide] = React.useState<"top" | "bottom">("bottom");

  React.useLayoutEffect(() => {
    if (!isOpen) {
      setSide("bottom");
      return;
    }

    const content = contentRef.current;
    if (!content) return;

    const viewportPadding = 8;
    const rect = content.getBoundingClientRect();
    const availableAbove = rect.top - content.offsetHeight - viewportPadding;
    const isBottomClipped = rect.bottom > window.innerHeight - viewportPadding;

    setSide(isBottomClipped && availableAbove >= viewportPadding ? "top" : "bottom");
  }, [isOpen]);

  function setContentRef(node: HTMLDivElement | null) {
    contentRef.current = node;
    assignRef(ref, node);
  }

  if (!isOpen) return null;

  return (
    <div
      ref={setContentRef}
      role="menu"
      data-side={side}
      className={cn(
        overlayClassNames.menuSurface,
        overlayPrimitiveClassNames.menuSurface,
        "absolute left-0 min-w-[12rem]",
        side === "top" ? "bottom-full mb-[8px]" : "top-full mt-[8px]",
        className,
      )}
      style={{ zIndex: overlayZIndex.popover, ...style }}
      {...props}
    />
  );
};
MenubarContent.displayName = "MenubarContent";

const MenubarItem = ({
  className,
  inset,
  disabled,
  asChild,
  children,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  inset?: boolean;
  disabled?: boolean;
  asChild?: boolean;
} & { ref?: React.Ref<HTMLDivElement> | undefined }) => {
  const { setActiveMenu } = React.use(MenubarContext);

  const activateMenuItem = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    setActiveMenu(null);
    if (props.onClick) props.onClick(e);
  };

  const closeMenuItem = () => {
    if (!disabled) {
      setActiveMenu(null);
    }
  };

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<React.ComponentProps<"div">>;
    return React.cloneElement(child, {
      ref,
      role: child.props.role ?? "menuitem",
      tabIndex: disabled ? -1 : (child.props.tabIndex ?? 0),
      "aria-disabled": disabled || undefined,
      "data-disabled": disabled ? "" : undefined,
      onClick: (e: React.MouseEvent<HTMLDivElement>) => {
        activateMenuItem(e);
        if (child.props.onClick) child.props.onClick(e);
      },
      className: cn(
        overlayPrimitiveClassNames.menubarItem,
        inset && "pl-8",
        className,
        child.props.className,
      ),
      ...props,
    } as React.ComponentProps<"div"> & React.RefAttributes<HTMLDivElement>);
  }

  return (
    <div
      ref={ref}
      role="menuitem"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      data-disabled={disabled ? "" : undefined}
      onClick={activateMenuItem}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          closeMenuItem();
        }
      }}
      className={cn(overlayPrimitiveClassNames.menubarItem, inset && "pl-8", className)}
      {...props}
    >
      {children}
    </div>
  );
};
MenubarItem.displayName = "MenubarItem";

const MenubarCheckboxItem = ({
  className,
  children,
  checked,
  disabled,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { checked?: boolean; disabled?: boolean } & {
  ref?: React.Ref<HTMLDivElement> | undefined;
}) => (
  <div
    ref={ref}
    role="menuitemcheckbox"
    tabIndex={disabled ? -1 : 0}
    aria-checked={checked || false}
    aria-disabled={disabled || undefined}
    data-disabled={disabled ? "" : undefined}
    className={cn(overlayPrimitiveClassNames.menubarCheckboxItem, className)}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      {checked && <Check className="h-4 w-4" />}
    </span>
    {children}
  </div>
);
MenubarCheckboxItem.displayName = "MenubarCheckboxItem";

const MenubarRadioItem = ({
  className,
  children,
  checked,
  disabled,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  checked?: boolean;
  value?: string;
  disabled?: boolean;
} & {
  ref?: React.Ref<HTMLDivElement> | undefined;
}) => (
  <div
    ref={ref}
    role="menuitemradio"
    tabIndex={disabled ? -1 : 0}
    aria-checked={checked || false}
    aria-disabled={disabled || undefined}
    data-disabled={disabled ? "" : undefined}
    className={cn(overlayPrimitiveClassNames.menubarCheckboxItem, className)}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <Circle className={cn("h-2 w-2 fill-current", checked ? "opacity-100" : "opacity-0")} />
    </span>
    {children}
  </div>
);
MenubarRadioItem.displayName = "MenubarRadioItem";

const MenubarRadioGroup = ({
  children,
  className,
  ...props
}: React.FieldsetHTMLAttributes<HTMLFieldSetElement>) => (
  <fieldset className={cn("m-0 min-w-0 border-0 p-0", className)} {...props}>
    {children}
  </fieldset>
);

const MenubarLabel = ({
  className,
  inset,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { inset?: boolean } & {
  ref?: React.Ref<HTMLDivElement> | undefined;
}) => (
  <div
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)}
    {...props}
  />
);
MenubarLabel.displayName = "MenubarLabel";

const MenubarSeparator = ({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> | undefined }) => (
  <div ref={ref} className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
);
MenubarSeparator.displayName = "MenubarSeparator";

const MenubarShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)}
      {...props}
    />
  );
};
MenubarShortcut.displayName = "MenubarShortcut";

export {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarPortal,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
};
