// Card compound component

export type {
  CardBodyProps,
  CardDescriptionProps,
  CardFooterProps,
  CardHeaderProps,
  CardIconProps,
  CardProps,
  CardTitleProps,
} from "./Card";
export {
  Card,
  CardBody,
  CardDescription,
  CardFooter,
  CardHeader,
  CardIcon,
  CardRoot,
  CardTitle,
} from "./Card";
export type { CommandBoxProps } from "./CommandBox";
// CommandBox
export { CommandBox } from "./CommandBox";

// GalleryCard — content discovery cards (MiniMax / GPT Store style)
export {
  GalleryCard,
  type GalleryCardAction,
  type GalleryCardBadge,
  type GalleryCardBadgeTone,
  type GalleryCardIconTone,
  type GalleryCardMetadata,
  type GalleryCardProps,
  type GalleryCardRenderLinkProps,
} from "./gallery-card";

// SidebarNav — grouped app sidebar with badges, nested children, collapsed mode
export {
  SidebarNav,
  type SidebarNavBadge,
  type SidebarNavBadgeTone,
  type SidebarNavIcon,
  type SidebarNavItem,
  type SidebarNavProps,
  type SidebarNavRenderLinkProps,
  type SidebarNavSection,
} from "./sidebar-nav";
export type {
  TerminalBodyProps,
  TerminalHeaderProps,
  TerminalLineProps,
  TerminalProps,
} from "./Terminal";
// Terminal compound component
export {
  Terminal,
  TerminalBody,
  TerminalHeader,
  TerminalLine,
  TerminalRoot,
} from "./Terminal";
// UserMenu — avatar dropdown with workspace slot + grouped action items
export {
  UserMenu,
  type UserMenuGroup,
  type UserMenuItem,
  type UserMenuProps,
  type UserMenuUser,
} from "./user-menu";
// WorkspaceSwitcher — team/org switcher with Owner badge
export {
  type Workspace,
  type WorkspaceRole,
  WorkspaceSwitcher,
  type WorkspaceSwitcherProps,
} from "./workspace-switcher";
