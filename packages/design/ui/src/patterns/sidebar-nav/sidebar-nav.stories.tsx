import type { Meta, StoryObj } from "@storybook/react";
import {
  Bot,
  Folder,
  Home,
  Inbox,
  LayoutGrid,
  LifeBuoy,
  LogOut,
  Moon,
  Search,
  Settings,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { SidebarNav, type SidebarNavSection } from "./sidebar-nav";

const meta: Meta<typeof SidebarNav> = {
  title: "Patterns/SidebarNav",
  component: SidebarNav,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Grouped sidebar navigation pattern modeled after MiniMax / Vercel / Linear. Supports sections with labels, items with icons + badges, 1-level nested children, collapsed icon-only mode with tooltips, header/footer slots, and pluggable link renderer.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[260px] h-[640px] bg-background border border-border rounded-lg overflow-hidden">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SidebarNav>;

// ─── Section fixtures ─────────────────────────────────────────────────────────

const basicSections: SidebarNavSection[] = [
  {
    id: "main",
    label: "Workspace",
    items: [
      { id: "home", label: "Home", icon: Home, href: "/", isActive: true },
      { id: "inbox", label: "Inbox", icon: Inbox, href: "/inbox" },
      { id: "search", label: "Search", icon: Search, href: "/search" },
      { id: "projects", label: "Projects", icon: Folder, href: "/projects" },
    ],
  },
  {
    id: "team",
    label: "Team",
    items: [
      { id: "members", label: "Members", icon: Users, href: "/members" },
      { id: "settings", label: "Settings", icon: Settings, href: "/settings" },
    ],
  },
];

const badgedSections: SidebarNavSection[] = [
  {
    id: "lab",
    label: "MiniMax 实验室",
    items: [
      { id: "home", label: "Home", icon: Home, href: "/", isActive: true },
      {
        id: "agents",
        label: "Agents",
        icon: Bot,
        href: "/agents",
        badge: { label: "Beta", tone: "beta" },
      },
      {
        id: "studio",
        label: "Studio",
        icon: Sparkles,
        href: "/studio",
        badge: { label: "New", tone: "new" },
      },
      {
        id: "automations",
        label: "Automations",
        icon: Zap,
        href: "/automations",
        badge: { label: "Featured", tone: "featured" },
      },
    ],
  },
  {
    id: "admin",
    label: "Admin",
    items: [
      {
        id: "members",
        label: "Members",
        icon: Users,
        href: "/members",
        badge: { label: "Owner", tone: "owner" },
      },
      {
        id: "billing",
        label: "Billing",
        icon: LayoutGrid,
        href: "/billing",
        badge: { label: "Coming Soon", tone: "coming-soon" },
        disabled: true,
      },
    ],
  },
];

const nestedSections: SidebarNavSection[] = [
  {
    id: "build",
    label: "Build",
    items: [
      { id: "home", label: "Home", icon: Home, href: "/" },
      {
        id: "projects",
        label: "Projects",
        icon: Folder,
        children: [
          { id: "p-web", label: "Web App", href: "/projects/web", isActive: true },
          { id: "p-api", label: "API Gateway", href: "/projects/api" },
          {
            id: "p-mobile",
            label: "Mobile",
            href: "/projects/mobile",
            badge: { label: "Beta", tone: "beta" },
          },
        ],
      },
      {
        id: "agents",
        label: "Agents",
        icon: Bot,
        children: [
          { id: "a-chat", label: "Chat Bot", href: "/agents/chat" },
          { id: "a-research", label: "Research", href: "/agents/research" },
        ],
      },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [{ id: "settings", label: "Settings", icon: Settings, href: "/settings" }],
  },
];

// ─── Header / Footer fixtures ─────────────────────────────────────────────────

function StoryHeader() {
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <div
        className="h-7 w-7 rounded-md"
        style={{ background: "var(--brand-gradient)" }}
        aria-hidden="true"
      />
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-semibold text-foreground">Nebutra</span>
        <span className="text-[11px] text-muted-foreground">acme-corp</span>
      </div>
    </div>
  );
}

function StoryFooter() {
  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Moon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="flex-1 text-left">Theme</span>
      </button>
      <button
        type="button"
        className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <LifeBuoy className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="flex-1 text-left">Help & Support</span>
      </button>
      <button
        type="button"
        className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="flex-1 text-left">Sign out</span>
      </button>
    </div>
  );
}

// ─── Stories ──────────────────────────────────────────────────────────────────

export const Default: Story = {
  args: {
    sections: basicSections,
  },
};

export const WithBadges: Story = {
  args: {
    sections: badgedSections,
  },
};

export const Nested: Story = {
  args: {
    sections: nestedSections,
  },
};

export const Collapsed: Story = {
  args: {
    sections: badgedSections,
    collapsed: true,
  },
  decorators: [
    (Story) => (
      <div className="w-[64px] h-[640px] bg-background border border-border rounded-lg overflow-hidden">
        <Story />
      </div>
    ),
  ],
};

export const WithHeaderAndFooter: Story = {
  args: {
    sections: basicSections,
    header: <StoryHeader />,
    footer: <StoryFooter />,
  },
};
