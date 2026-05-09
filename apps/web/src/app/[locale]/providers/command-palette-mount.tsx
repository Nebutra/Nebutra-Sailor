"use client";

import type { ReactNode } from "react";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { CommandPaletteProvider } from "@/components/command-palette/command-palette-provider";

interface CommandPaletteMountProps {
  children: ReactNode;
}

/**
 * Single mount-point that wires the global command palette into the app.
 *
 * Usage — in `apps/web/src/app/[locale]/(app)/layout.tsx`, wrap the
 * authenticated page tree with this component (between the auth provider
 * and the page content):
 *
 *   <ClerkProvider>
 *     <CommandPaletteMount>
 *       {children}
 *     </CommandPaletteMount>
 *   </ClerkProvider>
 *
 * Once mounted, ⌘+K (mac) or Ctrl+K (Windows/Linux) opens the palette
 * from anywhere in the app. ESC closes it.
 */
export function CommandPaletteMount({ children }: CommandPaletteMountProps) {
  return (
    <CommandPaletteProvider>
      {children}
      <CommandPalette />
    </CommandPaletteProvider>
  );
}
