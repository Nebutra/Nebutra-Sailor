/**
 * @nebutra/ui/components
 *
 * Composed Nebutra surfaces (motion, graphs, onboarding). Product chrome —
 * Button, Input, Dialog, Select, Tooltip — lives on `@nebutra/ui/primitives`.
 * Lobehub chat pieces live on `@nebutra/ui/chat` only.
 *
 * Components removed in v5 that we previously re-exported:
 *   - ModelIcon, ModelTag, PluginTag — removed upstream (lobe-chat specific)
 *   - Breadcrumb, TabsNav, Slider, Switch — use `@nebutra/ui/primitives`
 *   - useTheme, useThemeMode — use `@nebutra/tokens` ThemeProvider instead
 */

export type { FlexboxProps } from "@lobehub/ui";
export {
  ActionIcon,
  ActionIconGroup,
  Alert,
  DraggablePanel,
  DraggablePanelBody,
  DraggablePanelContainer,
  DraggablePanelFooter,
  DraggablePanelHeader,
  Flexbox,
  FormGroup,
  FormItem,
  Highlighter,
  Image,
  List,
  Markdown,
  SearchBar,
  Segmented,
  SideNav,
  Tag,
} from "@lobehub/ui";
// Import Spotlight directly. The @lobehub/ui/awesome barrel also imports Spline,
// whose runtime uses Function() and violates the app's production CSP.
// @ts-expect-error — lobehub Spotlight typings flip between default-only and named across
// versions; @ts-expect-error fails the unused case on standalone mirrors.
export { default as Spotlight } from "@lobehub/ui/es/awesome/Spotlight/Spotlight";
export * from "../shared/animation/motion";
export * from "./ai-prompt-box";
export {
  AnimateIn,
  AnimateInGroup,
  type AnimateInGroupProps,
  type AnimateInProps,
  AnimateSwap,
  type AnimateSwapProps,
} from "./animate-in";
export * from "./ascii-text";
export * from "./changelog-widget";
export {
  NodeGraphCanvas,
  type NodeGraphCanvasProps,
  type NodeView,
} from "./node-graph-canvas";
export type {
  EdgeIdentity,
  FlowConnection,
  MakeEdge,
} from "./node-graph-canvas-adapter";
export * from "./onboarding-checklist";
export * from "./team-chat";
