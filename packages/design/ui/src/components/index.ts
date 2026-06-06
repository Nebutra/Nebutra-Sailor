/**
 * @nebutra/ui/components
 *
 * Nebutra component entrypoint.
 * Includes curated compatibility exports from @lobehub/ui (v5) for AI-focused
 * features and chat interfaces. Treat @lobehub/ui as an implementation detail.
 *
 * Components removed in v5 that we previously re-exported:
 *   - ModelIcon, ModelTag, PluginTag — removed upstream (lobe-chat specific)
 *   - Breadcrumb, TabsNav, Slider, Switch — use Radix/HeroUI primitives instead
 *   - useTheme, useThemeMode — use @nebutra/tokens ThemeProvider instead
 */

export type { FlexboxProps } from "@lobehub/ui";
// AI components
// Layout
// Data Display
// Feedback
// Input
// Navigation
// Form
// Theme
export {
  ActionIcon,
  ActionIconGroup,
  Alert,
  Avatar,
  Button,
  Checkbox,
  DraggablePanel,
  DraggablePanelBody,
  DraggablePanelContainer,
  DraggablePanelFooter,
  DraggablePanelHeader,
  Flexbox,
  Form,
  FormGroup,
  FormItem,
  Highlighter,
  Image,
  Input,
  List,
  Markdown,
  Menu,
  Modal,
  SearchBar,
  Segmented,
  Select,
  SideNav,
  Tag,
  TextArea,
  Tooltip,
} from "@lobehub/ui";
// Chat types (moved to @lobehub/ui/chat in v5)
export type {
  ChatItemProps,
  ChatListProps,
  ChatMessage,
} from "@lobehub/ui/chat";
// Chat components (moved to @lobehub/ui/chat in v5)
export {
  ChatInputArea,
  ChatItem,
  ChatList,
  MessageInput,
  MessageModal,
} from "@lobehub/ui/chat";
// Import Spotlight directly. The @lobehub/ui/awesome barrel also imports Spline,
// whose runtime uses Function() and violates the app's production CSP.
// @ts-expect-error Upstream .d.mts declares a named export, but the runtime .mjs only ships default.
export { default as Spotlight } from "@lobehub/ui/es/awesome/Spotlight/Spotlight";
export * from "../shared/animation/motion";
export * from "./ai-prompt-box";
// Animation
export {
  AnimateIn,
  AnimateInGroup,
  type AnimateInGroupProps,
  type AnimateInProps,
} from "./animate-in";
export * from "./ascii-text";
export * from "./changelog-widget";
// Generic node-graph editor (domain-free; consumes @nebutra/graph-model).
// The reel binding lives in @nebutra/reel/canvas.
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
// Phase 10: Missing root exports
export * from "./onboarding-checklist";
export * from "./team-chat";
