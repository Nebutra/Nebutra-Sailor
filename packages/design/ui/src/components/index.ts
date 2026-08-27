/**
 * @nebutra/ui/components
 *
 * Composed Nebutra surfaces (motion, graphs, onboarding). Product chrome —
 * Button, Input, Dialog, Select, Tooltip — lives on `@nebutra/ui/primitives`.
 * Lobehub chat pieces live on `@nebutra/ui/chat` only. This barrel does not
 * re-export `@lobehub/ui`.
 *
 * Components removed in v5 that we previously re-exported:
 *   - ModelIcon, ModelTag, PluginTag — removed upstream (lobe-chat specific)
 *   - Breadcrumb, TabsNav, Slider, Switch — use `@nebutra/ui/primitives`
 *   - useTheme, useThemeMode — use `@nebutra/tokens` ThemeProvider instead
 */

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
