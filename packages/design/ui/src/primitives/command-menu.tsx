"use client";

import { Dialog } from "@base-ui/react/dialog";
import * as React from "react";
import { cn } from "../utils/cn";
import type {
  CommandEmptyProps,
  CommandGroupProps,
  CommandInputProps,
  CommandItemProps,
  CommandListProps,
  CommandSeparatorProps,
  CommandShortcutProps,
} from "./command";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "./command";
import { DialogOverlay, DialogPortal } from "./dialog";

// =============================================================================
// Types
// =============================================================================

export interface CommandMenuRootProps {
  /** Whether the command menu is open */
  open: boolean;
  /** Setter to control the open state */
  setOpen: (open: boolean) => void;
  /** Accessible label announced by screen readers (defaults to "Command Menu") */
  label?: string;
  children?: React.ReactNode;
}

export interface CommandMenuItemProps extends Omit<CommandItemProps, "onSelect"> {
  /** Callback invoked when the item is selected (click or Enter) */
  callback?: () => void;
}

// =============================================================================
// CommandMenuRoot
// =============================================================================

export function CommandMenuRoot({
  open,
  setOpen,
  label = "Command Menu",
  children,
}: CommandMenuRootProps) {
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <DialogPortal>
        <DialogOverlay />
        <Dialog.Popup
          className={cn(
            "fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%]",
            "overflow-hidden rounded-[var(--radius-lg)] border bg-background shadow-lg",
            "duration-200",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
        >
          {/* Visually-hidden title for screen reader accessibility (WCAG 4.1.2) */}
          <Dialog.Title className="sr-only">{label}</Dialog.Title>
          <Command
            className={cn(
              "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium",
              "[&_[cmdk-group-heading]]:text-muted-foreground",
              "[&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0",
              "[&_[cmdk-group]]:px-2",
              "[&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5",
              "[&_[cmdk-input]]:h-12",
              "[&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3",
              "[&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5",
            )}
          >
            {children}
          </Command>
        </Dialog.Popup>
      </DialogPortal>
    </Dialog.Root>
  );
}
CommandMenuRoot.displayName = "CommandMenu.Root";

// =============================================================================
// CommandMenuItem
// =============================================================================

export const CommandMenuItem = React.forwardRef<
  React.ElementRef<typeof CommandItem>,
  CommandMenuItemProps
>(({ callback, className, ...props }, ref) => (
  <CommandItem ref={ref} onSelect={() => callback?.()} className={className} {...props} />
));
CommandMenuItem.displayName = "CommandMenu.Item";

// =============================================================================
// Pass-through sub-components (typed aliases)
// =============================================================================

export const CommandMenuInput = React.forwardRef<
  React.ElementRef<typeof CommandInput>,
  CommandInputProps
>((props, ref) => <CommandInput ref={ref} {...props} />);
CommandMenuInput.displayName = "CommandMenu.Input";

export const CommandMenuList = React.forwardRef<
  React.ElementRef<typeof CommandList>,
  CommandListProps
>((props, ref) => <CommandList ref={ref} {...props} />);
CommandMenuList.displayName = "CommandMenu.List";

export const CommandMenuEmpty = React.forwardRef<
  React.ElementRef<typeof CommandEmpty>,
  CommandEmptyProps
>((props, ref) => <CommandEmpty ref={ref} {...props} />);
CommandMenuEmpty.displayName = "CommandMenu.Empty";

export const CommandMenuGroup = React.forwardRef<
  React.ElementRef<typeof CommandGroup>,
  CommandGroupProps
>((props, ref) => <CommandGroup ref={ref} {...props} />);
CommandMenuGroup.displayName = "CommandMenu.Group";

export const CommandMenuSeparator = React.forwardRef<
  React.ElementRef<typeof CommandSeparator>,
  CommandSeparatorProps
>((props, ref) => <CommandSeparator ref={ref} {...props} />);
CommandMenuSeparator.displayName = "CommandMenu.Separator";

export const CommandMenuShortcut = ({ ...props }: CommandShortcutProps) => (
  <CommandShortcut {...props} />
);
CommandMenuShortcut.displayName = "CommandMenu.Shortcut";

// =============================================================================
// Compound Export — plain object namespace (matches Geist .Root API)
// =============================================================================

/**
 * CommandMenu — Geist-style full-screen command palette overlay.
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 *
 * <Button onClick={() => setOpen(true)}>Open Command Menu</Button>
 * <CommandMenu.Root open={open} setOpen={setOpen}>
 *   <CommandMenu.Input placeholder="What do you need?" />
 *   <CommandMenu.List>
 *     <CommandMenu.Group heading="Suggestions">
 *       <CommandMenu.Item callback={() => doSomething()}>
 *         Figma Import
 *       </CommandMenu.Item>
 *     </CommandMenu.Group>
 *   </CommandMenu.List>
 * </CommandMenu.Root>
 * ```
 */
export const CommandMenu = {
  Root: CommandMenuRoot,
  Input: CommandMenuInput,
  List: CommandMenuList,
  Empty: CommandMenuEmpty,
  Group: CommandMenuGroup,
  Item: CommandMenuItem,
  Shortcut: CommandMenuShortcut,
  Separator: CommandMenuSeparator,
} as const;
