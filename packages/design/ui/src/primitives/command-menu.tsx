"use client";

import {
  CommandMenuEmpty,
  CommandMenuGroup,
  CommandMenuInput,
  CommandMenuItem,
  CommandMenuList,
  CommandMenuResults,
  CommandMenuRoot,
  CommandMenuSeparator,
  CommandMenuShortcut,
} from "./command-menu-parts";

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
