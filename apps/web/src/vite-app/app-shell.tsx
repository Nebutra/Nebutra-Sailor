import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

/**
 * The signed-in shell's product-specific parts: the nav, where the brand mark
 * leads, and the dev-only tools. `pnpm template:build` puts
 * `app-shell.for-template.tsx` in place of this file, so a fresh project's
 * shell carries none of Nebutra's own products. Both export the same names.
 */

export const APP_NAV = [
  // The preview's start page, only while `pnpm dev` runs the local preview.
  ...(import.meta.env.VITE_SAILOR_PREVIEW ? [{ to: "/welcome", label: "Get started" }] : []),
  { to: "/startup-os", label: "Startup OS" },
  { to: "/settings", label: "Settings" },
  { to: "/billing", label: "Billing" },
] as const;

/** Where the brand mark in the header leads. */
export const APP_HOME = "/startup-os" as const;

/** Rendered at the end of the signed-in shell. */
export function AppDevtools() {
  return import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null;
}
