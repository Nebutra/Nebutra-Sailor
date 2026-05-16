"use client";

import { MagnifyingGlass as Search } from "@nebutra/icons";
import { Command as CommandPrimitive } from "cmdk";
import * as React from "react";

import { cn } from "../utils/cn";
import { Dialog, DialogContent } from "./dialog";
import { Kbd } from "./kbd";

export type CommandProps = React.ComponentPropsWithoutRef<typeof CommandPrimitive>;

export type CommandDialogProps = React.ComponentPropsWithoutRef<typeof Dialog> & {
  children?: React.ReactNode;
};

export type CommandInputProps = React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>;

export type CommandListProps = React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>;

export type CommandEmptyProps = React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>;

export type CommandGroupProps = React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>;

export type CommandSeparatorProps = React.ComponentPropsWithoutRef<
  typeof CommandPrimitive.Separator
>;

export type CommandItemProps = React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>;

export interface CommandShortcutProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Render each shortcut token as a separate Kbd key. */
  keys?: ReadonlyArray<React.ReactNode>;
  /** Accessible label for compact shortcut glyphs. */
  label?: string;
}

export interface CommandResultsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Current visible result count. Pass from product state when known. */
  count?: number;
  /** Current search query, used only for the default screen-reader message. */
  search?: string;
  /** Custom screen-reader announcement. */
  label?: (count: number | undefined, search: string) => React.ReactNode;
}

const commandFrameClassName = cn(
  "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium",
  "[&_[cmdk-group-heading]]:text-muted-foreground",
  "[&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0",
  "[&_[cmdk-group]]:px-2",
  "[&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5",
  "[&_[cmdk-input]]:h-12",
  "[&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2.5",
  "[&_[cmdk-item]_svg]:h-4 [&_[cmdk-item]_svg]:w-4",
);

/**
 * Command - A command palette / autocomplete component
 *
 * @description
 * Based on cmdk, provides a fast, composable command palette interface.
 * Can be used standalone or inside a dialog.
 *
 * @example Basic usage
 * ```tsx
 * <Command>
 *   <CommandInput placeholder="Search..." />
 *   <CommandList>
 *     <CommandEmpty>No results found.</CommandEmpty>
 *     <CommandGroup heading="Suggestions">
 *       <CommandItem>Calendar</CommandItem>
 *       <CommandItem>Search</CommandItem>
 *     </CommandGroup>
 *   </CommandList>
 * </Command>
 * ```
 *
 * @example In dialog
 * ```tsx
 * <CommandDialog open={open} onOpenChange={setOpen}>
 *   <CommandInput placeholder="Type a command..." />
 *   <CommandList>
 *     <CommandGroup heading="Actions">
 *       <CommandItem>New File</CommandItem>
 *       <CommandItem>Settings</CommandItem>
 *     </CommandGroup>
 *   </CommandList>
 * </CommandDialog>
 * ```
 */
const Command = React.forwardRef<React.ElementRef<typeof CommandPrimitive>, CommandProps>(
  ({ className, ...props }, ref) => (
    <CommandPrimitive
      ref={ref}
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-[var(--radius-md)] bg-popover text-popover-foreground",
        className,
      )}
      {...props}
    />
  ),
);
Command.displayName = CommandPrimitive.displayName;

const CommandDialog = ({ children, ...props }: CommandDialogProps) => {
  return (
    <Dialog {...props}>
      <DialogContent className="overflow-hidden p-0 shadow-lg">
        <Command className={commandFrameClassName}>{children}</Command>
      </DialogContent>
    </Dialog>
  );
};

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  CommandInputProps
>(({ className, ...props }, ref) => (
  <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-[var(--radius-md)] bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  </div>
));
CommandInput.displayName = CommandPrimitive.Input.displayName;

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  CommandListProps
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
    {...props}
  />
));
CommandList.displayName = CommandPrimitive.List.displayName;

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  CommandEmptyProps
>((props, ref) => (
  <CommandPrimitive.Empty ref={ref} className="py-6 text-center text-sm" {...props} />
));
CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  CommandGroupProps
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
      className,
    )}
    {...props}
  />
));
CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  CommandSeparatorProps
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 h-px bg-border", className)}
    {...props}
  />
));
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  CommandItemProps
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-[var(--radius-sm)] px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected='true']:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50",
      className,
    )}
    {...props}
  />
));
CommandItem.displayName = CommandPrimitive.Item.displayName;

const defaultResultsLabel = (count: number | undefined, search: string) => {
  if (typeof count !== "number") return "Command results updated.";
  if (search.trim().length === 0) return `${count} command results available.`;
  return `${count} command results available for ${search}.`;
};

const CommandResults = React.forwardRef<HTMLDivElement, CommandResultsProps>(
  ({ className, count, search = "", label = defaultResultsLabel, children, ...props }, ref) => (
    <div
      ref={ref}
      aria-atomic="true"
      aria-live="polite"
      className={cn("sr-only", className)}
      {...props}
    >
      {children ?? label(count, search)}
    </div>
  ),
);
CommandResults.displayName = "CommandResults";

const CommandShortcut = ({ className, keys, label, children, ...props }: CommandShortcutProps) => {
  const shortcutKeys = keys ?? (children != null ? [children] : []);

  return (
    <span
      className={cn("ml-auto flex shrink-0 items-center gap-1 text-muted-foreground", className)}
      {...props}
    >
      {label ? <span className="sr-only">{label}</span> : null}
      {shortcutKeys.map((key, index) => (
        <Kbd key={`${String(key)}-${index}`} aria-hidden={label ? true : undefined} small>
          {key}
        </Kbd>
      ))}
    </span>
  );
};
CommandShortcut.displayName = "CommandShortcut";

export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandResults,
  CommandSeparator,
  CommandShortcut,
  commandFrameClassName,
};
