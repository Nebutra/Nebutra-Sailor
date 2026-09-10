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
// The adapter is the reusable half: framework-free graph <-> React Flow mapping with the
// @nebutra/graph-model cycle guard. NodeGraphCanvas is one opinionated composition of it;
// a caller that needs different chrome composes ReactFlow itself over these.
export {
  type AddEdgeResult,
  applyNodePositions,
  type EdgeIdentity,
  type FlowConnection,
  type FlowEdge,
  type FlowNode,
  GRAPH_NODE_FLOW_TYPE,
  graphToFlow,
  type MakeEdge,
  removeFlowEdge,
  removeNode,
  tryAddEdge,
} from "./node-graph-canvas-adapter";
export * from "./onboarding-checklist";
export * from "./team-chat";
