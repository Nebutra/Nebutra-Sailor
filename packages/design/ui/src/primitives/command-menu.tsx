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
  CommandResultsProps,
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
  CommandResults,
  CommandSeparator,
  CommandShortcut,
  commandFrameClassName,
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
  /** Optional hidden description for assistive technology */
  description?: string;
  /** Additional classes for the overlay panel */
  className?: string;
  /** Additional classes for the cmdk frame */
  commandClassName?: string;
  children?: React.ReactNode;
}

export interface CommandMenuItemProps extends CommandItemProps {
  /** Callback invoked when the item is selected. Prefer `onSelect` for new code. */
  callback?: () => void;
}

const commandMenuSurfaceClassName = cn(
  "fixed left-[50%] top-[18vh] z-50 w-[calc(100vw-2rem)] max-w-xl translate-x-[-50%]",
  "overflow-hidden rounded-[var(--radius-lg)] border border-border/70 bg-popover text-popover-foreground shadow-2xl",
  "transition-[opacity,transform,display] duration-[var(--motion-duration-flow)] ease-[var(--ease-out)]",
  "data-starting-style:translate-y-[-0.5rem] data-starting-style:scale-95 data-starting-style:opacity-0",
  "data-ending-style:translate-y-[-0.5rem] data-ending-style:scale-95 data-ending-style:opacity-0",
  "motion-reduce:transition-none motion-reduce:data-starting-style:transform-none motion-reduce:data-ending-style:transform-none",
);

// =============================================================================
// CommandMenuRoot
// =============================================================================

export function CommandMenuRoot({
  open,
  setOpen,
  label = "Command Menu",
  description,
  className,
  commandClassName,
  children,
}: CommandMenuRootProps) {
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <DialogPortal>
        <DialogOverlay />
        <Dialog.Popup className={cn(commandMenuSurfaceClassName, className)}>
          {/* Visually-hidden title for screen reader accessibility (WCAG 4.1.2) */}
          <Dialog.Title className="sr-only">{label}</Dialog.Title>
          {description ? (
            <Dialog.Description className="sr-only">{description}</Dialog.Description>
          ) : null}
          <Command className={cn(commandFrameClassName, commandClassName)}>{children}</Command>
        </Dialog.Popup>
      </DialogPortal>
    </Dialog.Root>
  );
}
CommandMenuRoot.displayName = "CommandMenu.Root";

// =============================================================================
// CommandMenuItem
// =============================================================================

export const CommandMenuItem = ({
  callback,
  className,
  onSelect,
  ref,
  ...props
}: CommandMenuItemProps & {
  ref?: React.Ref<React.ElementRef<typeof CommandItem>> | undefined;
}) => {
  const handleSelect = React.useCallback(
    (value: string) => {
      onSelect?.(value);
      callback?.();
    },
    [callback, onSelect],
  );

  return <CommandItem ref={ref} onSelect={handleSelect} className={className} {...props} />;
};
CommandMenuItem.displayName = "CommandMenu.Item";

// =============================================================================
// Pass-through sub-components (typed aliases)
// =============================================================================

export const CommandMenuInput = ({
  ref,
  ...props
}: CommandInputProps & { ref?: React.Ref<React.ElementRef<typeof CommandInput>> | undefined }) => (
  <CommandInput ref={ref} {...props} />
);
CommandMenuInput.displayName = "CommandMenu.Input";

export const CommandMenuList = ({
  ref,
  ...props
}: CommandListProps & { ref?: React.Ref<React.ElementRef<typeof CommandList>> | undefined }) => (
  <CommandList ref={ref} {...props} />
);
CommandMenuList.displayName = "CommandMenu.List";

export const CommandMenuEmpty = ({
  ref,
  ...props
}: CommandEmptyProps & { ref?: React.Ref<React.ElementRef<typeof CommandEmpty>> | undefined }) => (
  <CommandEmpty ref={ref} {...props} />
);
CommandMenuEmpty.displayName = "CommandMenu.Empty";

export const CommandMenuResults = ({
  ref,
  ...props
}: CommandResultsProps & {
  ref?: React.Ref<React.ElementRef<typeof CommandResults>> | undefined;
}) => <CommandResults ref={ref} {...props} />;
CommandMenuResults.displayName = "CommandMenu.Results";

export const CommandMenuGroup = ({
  ref,
  ...props
}: CommandGroupProps & { ref?: React.Ref<React.ElementRef<typeof CommandGroup>> | undefined }) => (
  <CommandGroup ref={ref} {...props} />
);
CommandMenuGroup.displayName = "CommandMenu.Group";

export const CommandMenuSeparator = ({
  ref,
  ...props
}: CommandSeparatorProps & {
  ref?: React.Ref<React.ElementRef<typeof CommandSeparator>> | undefined;
}) => <CommandSeparator ref={ref} {...props} />;
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
  Results: CommandMenuResults,
  Group: CommandMenuGroup,
  Item: CommandMenuItem,
  Shortcut: CommandMenuShortcut,
  Separator: CommandMenuSeparator,
} as const;
