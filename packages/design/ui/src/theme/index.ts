/**
 * @nebutra/ui/theme — Lobe UI theme integration
 *
 * Exports the NebutraThemeProvider (wraps Lobe UI with brand tokens).
 *
 * For runtime CSS tokens, import from @nebutra/tokens instead:
 *   import { ThemeProvider } from "@nebutra/tokens";
 *   @import "@nebutra/tokens/styles.css";
 */

export type { NebutraThemeProviderProps } from "./provider";
export { NebutraThemeProvider } from "./provider";
export type { NebutraTokens } from "./tokens";
/**
 * Theme mode type used by DesignSystemProvider / layout components.
 * Matches next-themes convention.
 */
export type ThemeMode = "light" | "dark" | "system";
