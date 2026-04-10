/**
 * @nebutra/ui
 *
 * Unified UI package built on Lobe UI + Lucide Icons + Nebutra design tokens.
 *
 * Token architecture:
 *   @nebutra/brand    → brand primitives (source data)
 *   @nebutra/tokens   → runtime CSS variables (@import styles.css)
 *   @nebutra/theme    → multi-theme presets (oklch, 6 variants)
 *   @nebutra/ui/theme → Lobe UI Ant Design bridge (internal)
 *
 * @example
 * ```tsx
 * import { NebutraThemeProvider } from "@nebutra/ui";
 * import { Button, ChatList } from "@nebutra/ui/components";
 * import { OpenAI, Settings } from "@nebutra/ui/icons";
 *
 * function App() {
 *   return (
 *     <NebutraThemeProvider>
 *       <Button>Click me</Button>
 *       <OpenAI size={24} />
 *     </NebutraThemeProvider>
 *   );
 * }
 * ```
 */

export type { NebutraThemeProviderProps, NebutraTokens, ThemeMode } from "./theme";
// Theme — Lobe UI integration
export { NebutraThemeProvider } from "./theme";

// Re-export everything from subpaths for convenience
// (Users can also import directly from subpaths for smaller bundles)

// Components
// Components (Removed infinite barrel export - Use @nebutra/ui/components instead)
// Icons (selective re-export to avoid bundle bloat)
export {
  Anthropic,
  Bot,
  Check,
  Claude,
  Gemini,
  Google,
  Loader2,
  // Most common UI icons
  Menu,
  Moon,
  // Most common AI icons
  OpenAI,
  Plus,
  Search,
  Settings,
  Sparkles,
  Sun,
  X,
} from "./icons";
// Layout (migrated from @nebutra/design-system)
// Layout (Removed infinite barrel export - Use @nebutra/ui/layout instead)
