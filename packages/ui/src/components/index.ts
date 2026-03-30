/**
 * @nebutra/ui/components
 *
 * Re-exported components from @lobehub/ui (v5)
 * Use these for AI-focused features and chat interfaces.
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
// Spotlight (moved to @lobehub/ui/awesome in v5)
export { Spotlight } from "@lobehub/ui/awesome";
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
// Phase 10: Missing root exports
export * from "./onboarding-checklist";
export * from "./team-chat";
