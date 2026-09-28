/**
 * The signed-in shell's product-specific parts: the nav, where the brand mark
 * leads, and the dev-only tools. Add your own pages to APP_NAV as you build
 * them. Exports the same names as the file it replaces.
 */

export const APP_NAV = [
  // The preview's start page, only while `pnpm dev` runs the local preview.
  ...(import.meta.env.VITE_SAILOR_PREVIEW ? [{ to: "/welcome", label: "Get started" }] : []),
  { to: "/settings", label: "Settings" },
  { to: "/billing", label: "Billing" },
] as const;

/** Where the brand mark in the header leads. */
export const APP_HOME = "/welcome" as const;

/** Rendered at the end of the signed-in shell. None in a fresh project. */
export function AppDevtools() {
  return null;
}
