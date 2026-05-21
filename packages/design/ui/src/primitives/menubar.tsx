"use client";

import { Check, ChevronRight, Status as Circle } from "@nebutra/icons";
import * as React from "react";

import { cn } from "../utils/cn";

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

  // Close on click outside
  React.useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <MenubarContext.Provider value={{ activeMenu, setActiveMenu }}>
      <div
        ref={ref}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.stopPropagation();
          }
        }}
        tabIndex={0}
        role="menubar"
        className={cn(
          "flex h-10 items-center space-x-1 rounded-[var(--radius-md)] border border-border bg-background p-1",
          className,
        )}
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

  return (
    <MenubarMenuContext.Provider value={{ value, isOpen }}>
      <div className="relative inline-block text-left">{children}</div>
    </MenubarMenuContext.Provider>
  );
};

const MenubarPortal = ({ children }: { children: React.ReactNode }) => <>{children}</>;

const MenubarGroup = ({ children }: { children: React.ReactNode }) => <>{children}</>;

const MenubarTrigger = ({
  className,
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
      data-state={isOpen ? "open" : "closed"}
      onClick={() => setActiveMenu(isOpen ? null : value)}
      onMouseEnter={() => {
        // Open on hover only if another menu is already active
        if (activeMenu && activeMenu !== value) {
          setActiveMenu(value);
        }
      }}
      className={cn(
        "flex cursor-default select-none items-center rounded-sm px-3 py-1.5 text-sm font-medium outline-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
        className,
      )}
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
  return (
    <MenubarSubContext.Provider value={{ isOpen, setIsOpen }}>
      <div
        className="relative"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
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
      data-state={isOpen ? "open" : "closed"}
      className={cn(
        "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
        inset && "pl-8",
        className,
      )}
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
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> | undefined }) => {
  const { isOpen } = React.use(MenubarSubContext);

  if (!isOpen) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "absolute top-0 left-full z-50 min-w-[8rem] ml-1 overflow-hidden rounded-[var(--radius-md)] border border-border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in zoom-in-95 duration-200 slide-in-from-left-2",
        className,
      )}
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
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  align?: "start" | "center" | "end";
  alignOffset?: number;
  sideOffset?: number;
} & { ref?: React.Ref<HTMLDivElement> | undefined }) => {
  const { isOpen } = React.use(MenubarMenuContext);

  if (!isOpen) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "absolute top-full left-0 mt-[8px] z-50 min-w-[12rem] overflow-hidden rounded-[var(--radius-md)] border border-border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in slide-in-from-top-2 duration-200",
        className,
      )}
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

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    setActiveMenu(null);
    if (props.onClick) props.onClick(e);
  };

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<React.ComponentProps<"div">>;
    return React.cloneElement(child, {
      ref,
      "data-disabled": disabled ? "" : undefined,
      onClick: (e: React.MouseEvent<HTMLDivElement>) => {
        handleClick(e);
        if (child.props.onClick) child.props.onClick(e);
      },
      className: cn(
        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
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
      data-disabled={disabled ? "" : undefined}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleClick(e as unknown as React.MouseEvent<HTMLDivElement>);
        }
      }}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        inset && "pl-8",
        className,
      )}
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
    data-disabled={disabled ? "" : undefined}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
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
  disabled,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value?: string; disabled?: boolean } & {
  ref?: React.Ref<HTMLDivElement> | undefined;
}) => (
  <div
    ref={ref}
    data-disabled={disabled ? "" : undefined}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      {/* The actual selection logic would need a RadioGroup context, but keeping purely structural to satisfy API */}
      <Circle className="h-2 w-2 fill-current opacity-0" />
    </span>
    {children}
  </div>
);
MenubarRadioItem.displayName = "MenubarRadioItem";

const MenubarRadioGroup = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div {...props}>{children}</div>
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
