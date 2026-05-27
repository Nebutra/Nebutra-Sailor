"use client";

import { Dialog } from "@base-ui/react/dialog";
import * as React from "react";
import { overlayClassNames, overlayZIndex } from "../tokens/components/overlay";
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
} from "./command";
import { commandFrameClassName } from "./command-styles";
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

const commandMenuSurfaceClassName = overlayClassNames.commandSurface;

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
        <Dialog.Popup
          className={cn(commandMenuSurfaceClassName, className)}
          style={{ zIndex: overlayZIndex.modal }}
        >
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
