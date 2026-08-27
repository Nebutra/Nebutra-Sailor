"use client";

import { MagnifyingGlass as Search } from "@nebutra/icons";
import { Command as CommandPrimitive } from "cmdk";
import * as React from "react";
import { cn } from "../utils/cn";
import {
  commandFrameClassName,
  commandInputClassName,
  commandInputWrapperClassName,
} from "./command-styles";
import { Dialog, DialogContent } from "./dialog";
import { Kbd } from "./kbd";
import { overlayPrimitiveClassNames } from "./overlay";

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
const Command = ({
  className,
  ref,
  ...props
}: CommandProps & { ref?: React.Ref<React.ElementRef<typeof CommandPrimitive>> | undefined }) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden",
      overlayPrimitiveClassNames.commandFrame,
      className,
    )}
    {...props}
  />
);
Command.displayName = CommandPrimitive.displayName;

const CommandDialog = ({ children, ...props }: CommandDialogProps) => {
  return (
    <Dialog {...props}>
      <DialogContent
        className={cn(
          overlayPrimitiveClassNames.modalSurface,
          overlayPrimitiveClassNames.commandDialogSurface,
        )}
      >
        <Command className={commandFrameClassName}>{children}</Command>
      </DialogContent>
    </Dialog>
  );
};

const CommandInput = ({
  className,
  ref,
  ...props
}: CommandInputProps & {
  ref?: React.Ref<React.ElementRef<typeof CommandPrimitive.Input>> | undefined;
}) => (
  <div className={commandInputWrapperClassName} data-cmdk-input-wrapper="">
    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
    <CommandPrimitive.Input ref={ref} className={cn(commandInputClassName, className)} {...props} />
  </div>
);
CommandInput.displayName = CommandPrimitive.Input.displayName;

const CommandList = ({
  className,
  ref,
  ...props
}: CommandListProps & {
  ref?: React.Ref<React.ElementRef<typeof CommandPrimitive.List>> | undefined;
}) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
    {...props}
  />
);
CommandList.displayName = CommandPrimitive.List.displayName;

const CommandEmpty = ({
  ref,
  ...props
}: CommandEmptyProps & {
  ref?: React.Ref<React.ElementRef<typeof CommandPrimitive.Empty>> | undefined;
}) => <CommandPrimitive.Empty ref={ref} className="py-6 text-center text-sm" {...props} />;
CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const CommandGroup = ({
  className,
  ref,
  ...props
}: CommandGroupProps & {
  ref?: React.Ref<React.ElementRef<typeof CommandPrimitive.Group>> | undefined;
}) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
      className,
    )}
    {...props}
  />
);
CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandSeparator = ({
  className,
  ref,
  ...props
}: CommandSeparatorProps & {
  ref?: React.Ref<React.ElementRef<typeof CommandPrimitive.Separator>> | undefined;
}) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 h-px bg-border", className)}
    {...props}
  />
);
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

const CommandItem = ({
  className,
  ref,
  ...props
}: CommandItemProps & {
  ref?: React.Ref<React.ElementRef<typeof CommandPrimitive.Item>> | undefined;
}) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(overlayPrimitiveClassNames.commandItem, className)}
    {...props}
  />
);
CommandItem.displayName = CommandPrimitive.Item.displayName;

const defaultResultsLabel = (count: number | undefined, search: string) => {
  if (typeof count !== "number") return "Command results updated.";
  if (search.trim().length === 0) return `${count} command results available.`;
  return `${count} command results available for ${search}.`;
};

const CommandResults = ({
  className,
  count,
  search = "",
  label = defaultResultsLabel,
  children,
  ref,
  ...props
}: CommandResultsProps & { ref?: React.Ref<HTMLDivElement> | undefined }) => (
  <div
    ref={ref}
    aria-atomic="true"
    aria-live="polite"
    className={cn("sr-only", className)}
    {...props}
  >
    {children ?? label(count, search)}
  </div>
);
CommandResults.displayName = "CommandResults";

const shortcutKeyId = (key: React.ReactNode) => {
  if (typeof key === "string" || typeof key === "number") return String(key);
  if (React.isValidElement(key) && key.key != null) return String(key.key);
  return String(key);
};

const CommandShortcut = ({ className, keys, label, children, ...props }: CommandShortcutProps) => {
  const shortcutKeys = keys ?? (children != null ? [children] : []);

  return (
    <span
      className={cn("ml-auto flex shrink-0 items-center gap-1 text-muted-foreground", className)}
      {...props}
    >
      {label ? <span className="sr-only">{label}</span> : null}
      {shortcutKeys.map((key) => (
        <Kbd key={shortcutKeyId(key)} aria-hidden={label ? true : undefined} small>
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
};
