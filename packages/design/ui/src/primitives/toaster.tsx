"use client";

/**
 * Toaster — single source-of-truth for transient notifications.
 *
 * Wraps `sonner` with Nebutra design-system defaults:
 *   - Tokens via `var(--neutral-*)` so it follows the active theme
 *   - Brand gradient on success accent
 *   - Geist font inherited from app `<html>`
 *
 * Mount ONCE at the app root (above all route segments):
 *
 *   import { Toaster } from "@nebutra/ui/primitives";
 *   <Toaster />
 *
 * Trigger from anywhere:
 *
 *   import { toast } from "@nebutra/ui/primitives";
 *   toast.success("Saved");
 *   toast.error("Failed to save", { description: "Try again" });
 *   toast.promise(savePromise, {
 *     loading: "Saving…",
 *     success: "Saved",
 *     error: "Failed",
 *   });
 *
 * Why a custom wrapper rather than re-exporting sonner directly:
 *   - Lock theme + position + duration defaults
 *   - One place to swap the underlying lib if we ever migrate
 *   - Re-export `toast` from this module so consumers never reach into sonner
 */

import type { ToasterProps } from "sonner";
import { Toaster as SonnerToaster } from "sonner";

export { toast } from "sonner";

const DEFAULT_RICH_COLORS = true;

export type { ToasterProps };

export function Toaster(props: ToasterProps = {}) {
  return (
    <SonnerToaster
      // Position bottom-right matches Linear/Vercel; less intrusive than top.
      position="bottom-right"
      richColors={DEFAULT_RICH_COLORS}
      closeButton
      // Inherit current theme via `class` strategy. Apps should mount this
      // inside a tree where `dark` class is set on <html>; sonner respects it.
      theme="system"
      toastOptions={{
        // Use our scale tokens so theme switch propagates without re-render.
        classNames: {
          toast:
            "group rounded-xl border bg-neutral-1 text-neutral-12 shadow-lg dark:bg-neutral-2 dark:text-white",
          title: "text-sm font-semibold",
          description: "text-xs text-neutral-10 dark:text-white/60",
          actionButton: "rounded-md bg-blue-9 px-2.5 py-1 text-xs font-medium text-white",
          cancelButton:
            "rounded-md bg-neutral-2 px-2.5 py-1 text-xs font-medium text-neutral-12 dark:bg-white/10 dark:text-white",
          closeButton:
            "border-neutral-6 bg-neutral-1 text-neutral-11 hover:bg-neutral-2 dark:border-white/10 dark:bg-black/40 dark:text-white/60",
          success: "border-green-6 dark:border-green-7/60",
          error: "border-red-6 dark:border-red-7/60",
          warning: "border-amber-6 dark:border-amber-7/60",
          info: "border-blue-6 dark:border-blue-7/60",
        },
      }}
      {...props}
    />
  );
}

