"use client";

import {
  CreditCard,
  Question as HelpCircle,
  Command as Keyboard,
  Logout as LogOut,
  SettingsGear as Settings,
  User,
  Users,
} from "@nebutra/icons";
import type { Meta, StoryObj } from "@storybook/react";
import { UserMenu } from "./user-menu";

const meta: Meta<typeof UserMenu> = {
  title: "Patterns/UserMenu",
  component: UserMenu,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Avatar dropdown menu for app headers — shows user identity, optional workspace switcher slot, and grouped settings actions. Modeled after MiniMax, Linear, and Vercel.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof UserMenu>;

const baseUser = {
  id: "user_01",
  name: "Ada Lovelace",
  email: "ada@nebutra.com",
  avatarUrl:
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face",
};

const onSelect = (id: string) => () => {
  console.warn(`[UserMenu] selected: ${id}`);
};

// =============================================================================
// Default — single group, no workspace slot
// =============================================================================

export const Default: Story = {
  args: {
    user: baseUser,
    groups: [
      {
        id: "main",
        items: [
          { id: "profile", label: "Profile", icon: User, onSelect: onSelect("profile") },
          { id: "settings", label: "Settings", icon: Settings, onSelect: onSelect("settings") },
          { id: "billing", label: "Billing", icon: CreditCard, onSelect: onSelect("billing") },
          {
            id: "signout",
            label: "Sign out",
            icon: LogOut,
            onSelect: onSelect("signout"),
          },
        ],
      },
    ],
  },
};

// =============================================================================
// WithWorkspaceSlot — embedded workspace switcher placeholder
// =============================================================================

export const WithWorkspaceSlot: Story = {
  args: {
    user: baseUser,
    workspaceSlot: (
      <div className="rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        Workspace switcher placeholder
      </div>
    ),
    groups: [
      {
        id: "main",
        items: [
          { id: "profile", label: "Profile", icon: User, onSelect: onSelect("profile") },
          { id: "settings", label: "Settings", icon: Settings, onSelect: onSelect("settings") },
          { id: "signout", label: "Sign out", icon: LogOut, onSelect: onSelect("signout") },
        ],
      },
    ],
  },
};

// =============================================================================
// WithShortcuts — keyboard shortcut hints
// =============================================================================

export const WithShortcuts: Story = {
  args: {
    user: baseUser,
    groups: [
      {
        id: "main",
        items: [
          {
            id: "profile",
            label: "Profile",
            icon: User,
            shortcut: "⌘P",
            onSelect: onSelect("profile"),
          },
          {
            id: "settings",
            label: "Settings",
            icon: Settings,
            shortcut: "⌘,",
            onSelect: onSelect("settings"),
          },
          {
            id: "shortcuts",
            label: "Keyboard shortcuts",
            icon: Keyboard,
            shortcut: "⌘K",
            onSelect: onSelect("shortcuts"),
          },
          {
            id: "signout",
            label: "Sign out",
            icon: LogOut,
            shortcut: "⇧⌘Q",
            onSelect: onSelect("signout"),
          },
        ],
      },
    ],
  },
};

// =============================================================================
// Destructive — sign out in red
// =============================================================================

export const Destructive: Story = {
  args: {
    user: baseUser,
    groups: [
      {
        id: "actions",
        items: [
          { id: "profile", label: "Profile", icon: User, onSelect: onSelect("profile") },
          { id: "settings", label: "Settings", icon: Settings, onSelect: onSelect("settings") },
        ],
      },
      {
        id: "danger",
        items: [
          {
            id: "signout",
            label: "Sign out",
            icon: LogOut,
            destructive: true,
            shortcut: "⇧⌘Q",
            onSelect: onSelect("signout"),
          },
        ],
      },
    ],
  },
};

// =============================================================================
// Grouped — multiple labeled groups
// =============================================================================

export const Grouped: Story = {
  args: {
    user: {
      ...baseUser,
      name: "Grace Hopper",
      email: "grace@nebutra.com",
      avatarUrl: undefined,
    },
    groups: [
      {
        id: "account",
        label: "Account",
        items: [
          {
            id: "profile",
            label: "Profile",
            icon: User,
            shortcut: "⌘P",
            onSelect: onSelect("profile"),
          },
          { id: "team", label: "Team", icon: Users, onSelect: onSelect("team") },
          { id: "billing", label: "Billing", icon: CreditCard, onSelect: onSelect("billing") },
        ],
      },
      {
        id: "preferences",
        label: "Preferences",
        items: [
          {
            id: "settings",
            label: "Settings",
            icon: Settings,
            shortcut: "⌘,",
            onSelect: onSelect("settings"),
          },
          {
            id: "shortcuts",
            label: "Keyboard shortcuts",
            icon: Keyboard,
            shortcut: "⌘K",
            onSelect: onSelect("shortcuts"),
          },
        ],
      },
      {
        id: "support",
        label: "Support",
        items: [{ id: "help", label: "Help & docs", icon: HelpCircle, href: "/docs" }],
      },
      {
        id: "session",
        items: [
          {
            id: "signout",
            label: "Sign out",
            icon: LogOut,
            destructive: true,
            shortcut: "⇧⌘Q",
            onSelect: onSelect("signout"),
          },
        ],
      },
    ],
  },
};
