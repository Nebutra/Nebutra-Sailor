/**
 * Canonical primitive overlay classes.
 *
 * Keep overlay surface, focus, and menu item decisions here so Dialog, Popover,
 * Command, and menu-family primitives do not drift back to shadcn-style inline
 * shadow/radius/ring classes.
 */

const menuItemBaseClassName = [
  "relative flex cursor-default select-none items-center rounded-[var(--radius-sm)] px-2 py-1.5 text-sm",
  "outline-none transition-colors duration-micro ease-out",
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-60",
].join(" ");

const menuHighlightedClassName =
  "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground";

const menubarFocusClassName =
  "hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground";

export const overlayPrimitiveClassNames = {
  modalSurface:
    "rounded-[var(--radius-md)] border-border/70 bg-popover/95 text-popover-foreground shadow-xl",
  popoverSurface: "rounded-[var(--radius-md)] border-border/70 bg-popover/95 shadow-md",
  menuSurface: "rounded-[var(--radius-md)] border-border/70 bg-popover/95 shadow-md",
  commandFrame: "rounded-[var(--radius-md)] bg-popover text-popover-foreground",
  commandDialogSurface: "overflow-hidden p-0",
  commandItem: [
    menuItemBaseClassName,
    "data-[selected='true']:bg-accent data-[selected=true]:text-accent-foreground",
    "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
  ].join(" "),
  contextMenuItem: [
    menuItemBaseClassName,
    "min-h-8 gap-2",
    menuHighlightedClassName,
    "data-[variant=destructive]:text-destructive",
    "data-[variant=destructive]:data-[highlighted]:bg-destructive/10",
    "data-[variant=destructive]:data-[highlighted]:text-destructive",
  ].join(" "),
  menuItem: [menuItemBaseClassName, menuHighlightedClassName].join(" "),
  menuSubTrigger: [
    menuItemBaseClassName,
    "data-[highlighted]:bg-accent data-[popup-open]:bg-accent",
  ].join(" "),
  menuCheckboxItem: [menuItemBaseClassName, menuHighlightedClassName, "pl-8"].join(" "),
  menuIndicator:
    "pointer-events-none absolute left-2 flex size-3.5 items-center justify-center text-muted-foreground",
  menubarRoot:
    "flex h-10 items-center space-x-1 rounded-[var(--radius-md)] border border-border bg-background p-1 outline-none",
  menubarTrigger: [
    "flex cursor-default select-none items-center rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium",
    "outline-none transition-colors duration-micro ease-out",
    menubarFocusClassName,
    "data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
  ].join(" "),
  menubarSubTrigger: [
    "flex cursor-default select-none items-center rounded-[var(--radius-sm)] px-2 py-1.5 text-sm",
    "outline-none transition-colors duration-micro ease-out",
    menubarFocusClassName,
    "data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
  ].join(" "),
  menubarItem: [
    "relative flex cursor-default select-none items-center rounded-[var(--radius-sm)] px-2 py-1.5 text-sm",
    "outline-none transition-colors duration-micro ease-out",
    menubarFocusClassName,
    "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  ].join(" "),
  menubarCheckboxItem: [
    "relative flex cursor-default select-none items-center rounded-[var(--radius-sm)] py-1.5 pl-8 pr-2 text-sm",
    "outline-none transition-colors duration-micro ease-out",
    menubarFocusClassName,
    "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  ].join(" "),
} as const;
