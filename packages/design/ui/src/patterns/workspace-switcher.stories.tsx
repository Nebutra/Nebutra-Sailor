"use client";

import { Plus } from "@nebutra/icons";
import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { type Workspace, WorkspaceSwitcher } from "./workspace-switcher";

const meta: Meta<typeof WorkspaceSwitcher> = {
  title: "Patterns/WorkspaceSwitcher",
  component: WorkspaceSwitcher,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
};
export default meta;

type Story = StoryObj<typeof WorkspaceSwitcher>;

// ─── Sample data ──────────────────────────────────────────────────────────────

const sampleWorkspaces: Workspace[] = [
  {
    id: "ws_acme",
    name: "Acme Inc.",
    slug: "acme",
    initials: "AC",
    role: "owner",
    plan: "Pro",
  },
  {
    id: "ws_globex",
    name: "Globex Corporation",
    slug: "globex",
    initials: "GL",
    role: "admin",
    plan: "Enterprise",
  },
  {
    id: "ws_initech",
    name: "Initech",
    slug: "initech",
    initials: "IN",
    role: "member",
    plan: "Free",
  },
];

// ─── Wrapper to manage active state ───────────────────────────────────────────

interface InteractiveProps {
  workspaces: Workspace[];
  initialActiveId: string;
  variant?: "compact" | "expanded";
  showRoleBadge?: boolean;
  disabled?: boolean;
  headerSlot?: React.ReactNode;
  footerSlot?: React.ReactNode;
}

function Interactive({
  workspaces,
  initialActiveId,
  variant = "expanded",
  showRoleBadge = true,
  disabled = false,
  headerSlot,
  footerSlot,
}: InteractiveProps) {
  const [activeId, setActiveId] = React.useState(initialActiveId);

  return (
    <div className="w-72">
      <WorkspaceSwitcher
        workspaces={workspaces}
        activeWorkspaceId={activeId}
        onSwitch={(id) => setActiveId(id)}
        variant={variant}
        showRoleBadge={showRoleBadge}
        disabled={disabled}
        headerSlot={headerSlot}
        footerSlot={footerSlot}
      />
    </div>
  );
}

// ─── Stories ──────────────────────────────────────────────────────────────────

export const Expanded: Story = {
  render: () => (
    <Interactive workspaces={sampleWorkspaces} initialActiveId="ws_globex" variant="expanded" />
  ),
};

export const Compact: Story = {
  render: () => (
    <div className="w-12">
      <CompactInteractive />
    </div>
  ),
};

function CompactInteractive() {
  const [activeId, setActiveId] = React.useState("ws_acme");
  return (
    <WorkspaceSwitcher
      workspaces={sampleWorkspaces}
      activeWorkspaceId={activeId}
      onSwitch={(id) => setActiveId(id)}
      variant="compact"
    />
  );
}

export const Owner: Story = {
  render: () => (
    <Interactive
      workspaces={sampleWorkspaces}
      initialActiveId="ws_acme"
      variant="expanded"
      showRoleBadge
    />
  ),
};

export const SingleWorkspace: Story = {
  render: () => (
    <Interactive
      workspaces={[sampleWorkspaces[0]]}
      initialActiveId="ws_acme"
      variant="expanded"
      disabled
    />
  ),
};

export const WithCreateAction: Story = {
  render: () => (
    <Interactive
      workspaces={sampleWorkspaces}
      initialActiveId="ws_acme"
      variant="expanded"
      footerSlot={
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Plus aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
          Create workspace
        </button>
      }
      headerSlot={
        <div className="text-xs text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">peter@nebutra.io</span>
        </div>
      }
    />
  ),
};
