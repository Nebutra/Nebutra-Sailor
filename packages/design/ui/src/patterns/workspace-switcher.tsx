"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../primitives/avatar";
import { Badge } from "../primitives/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../primitives/dropdown-menu";
import { cn } from "../utils/cn";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkspaceRole = "owner" | "admin" | "member" | "guest";

export interface Workspace {
  id: string;
  name: string;
  slug?: string;
  /** Avatar URL — fallback to gradient initials if absent */
  avatarUrl?: string;
  /** Initials/abbreviation — defaults to first 2 chars of name */
  initials?: string;
  /** User's role in this workspace */
  role?: WorkspaceRole;
  /** Plan tier — rendered as a subtle subline ("Pro", "Free") */
  plan?: string;
}

export interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  onSwitch: (workspaceId: string) => void | Promise<void>;
  /** Compact = avatar + chevron only; Expanded = avatar + name + role */
  variant?: "compact" | "expanded";
  /** Bottom of dropdown — e.g. <Link href="/workspaces/new">Create workspace</Link> */
  footerSlot?: React.ReactNode;
  /** Optional header in dropdown above the workspace list */
  headerSlot?: React.ReactNode;
  className?: string;
  /** Show "Owner" badge next to active workspace name in trigger */
  showRoleBadge?: boolean;
  /** Disable trigger (e.g. only one workspace) */
  disabled?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(workspace: Workspace): string {
  if (workspace.initials) return workspace.initials.slice(0, 2).toUpperCase();
  const trimmed = workspace.name.trim();
  if (!trimmed) return "??";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

function roleLabel(role: WorkspaceRole): string {
  switch (role) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    case "member":
      return "Member";
    case "guest":
      return "Guest";
  }
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

interface WorkspaceAvatarProps {
  workspace: Workspace;
  size?: "sm" | "md";
  className?: string;
}

function WorkspaceAvatar({ workspace, size = "sm", className }: WorkspaceAvatarProps) {
  const initials = getInitials(workspace);
  return (
    <Avatar size={size} className={cn("rounded-md", className)}>
      {workspace.avatarUrl && (
        <AvatarImage src={workspace.avatarUrl} alt={workspace.name} className="rounded-md" />
      )}
      <AvatarFallback
        size={size}
        className="rounded-md bg-[image:var(--brand-gradient)] text-white font-semibold"
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

// ─── Trigger ──────────────────────────────────────────────────────────────────

interface TriggerProps {
  activeWorkspace: Workspace;
  variant: "compact" | "expanded";
  showRoleBadge: boolean;
  disabled: boolean;
  className?: string;
}

const TriggerButton = React.forwardRef<HTMLButtonElement, TriggerProps>(
  ({ activeWorkspace, variant, showRoleBadge, disabled, className }, ref) => {
    const isOwner = activeWorkspace.role === "owner";

    if (variant === "compact") {
      return (
        <button
          ref={ref}
          type="button"
          aria-label="Switch workspace"
          disabled={disabled}
          className={cn(
            "inline-flex items-center gap-1 rounded-md p-1 outline-none transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          <WorkspaceAvatar workspace={activeWorkspace} size="sm" />
          <ChevronsUpDown aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      );
    }

    return (
      <button
        ref={ref}
        type="button"
        aria-label="Switch workspace"
        disabled={disabled}
        className={cn(
          "inline-flex w-full items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-left outline-none transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      >
        <WorkspaceAvatar workspace={activeWorkspace} size="sm" />
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {activeWorkspace.name}
          </span>
          {showRoleBadge && isOwner && (
            <Badge variant="owner" size="sm">
              Owner
            </Badge>
          )}
        </div>
        <ChevronsUpDown aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
    );
  },
);
TriggerButton.displayName = "WorkspaceSwitcherTrigger";

// ─── Workspace List Item ──────────────────────────────────────────────────────

interface WorkspaceItemProps {
  workspace: Workspace;
  isActive: boolean;
  onSelect: () => void;
}

function WorkspaceItem({ workspace, isActive, onSelect }: WorkspaceItemProps) {
  return (
    <DropdownMenuItem
      onClick={onSelect}
      aria-current={isActive ? "true" : undefined}
      className="flex items-center gap-2 py-1.5"
    >
      <WorkspaceAvatar workspace={workspace} size="sm" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span
          className={cn(
            "truncate text-sm text-foreground",
            isActive ? "font-semibold" : "font-medium",
          )}
        >
          {workspace.name}
        </span>
        {workspace.plan && (
          <span className="truncate text-xs text-muted-foreground">
            {workspace.plan}
            {workspace.role && workspace.role !== "owner" ? ` · ${roleLabel(workspace.role)}` : ""}
          </span>
        )}
        {!workspace.plan && workspace.role && (
          <span className="truncate text-xs text-muted-foreground">
            {roleLabel(workspace.role)}
          </span>
        )}
      </div>
      {isActive && (
        <Check aria-hidden="true" className="ml-auto h-4 w-4 shrink-0 text-foreground" />
      )}
    </DropdownMenuItem>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId,
  onSwitch,
  variant = "expanded",
  footerSlot,
  headerSlot,
  className,
  showRoleBadge = true,
  disabled = false,
}: WorkspaceSwitcherProps): React.ReactElement {
  const activeWorkspace = workspaces.find((ws) => ws.id === activeWorkspaceId) ?? workspaces[0];

  const handleSelect = (id: string) => {
    // Fire and forget — callers may return a Promise.
    const result = onSwitch(id);
    if (result instanceof Promise) {
      result.catch((err) => {
        // Surface to console.error (allowed by Biome) — UI layer should handle errors.
        console.error("WorkspaceSwitcher.onSwitch failed:", err);
      });
    }
  };

  if (!activeWorkspace) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-md border border-dashed border-border px-2 py-1.5 text-sm text-muted-foreground",
          className,
        )}
      >
        No workspaces
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <TriggerButton
          activeWorkspace={activeWorkspace}
          variant={variant}
          showRoleBadge={showRoleBadge}
          disabled={disabled}
          className={className}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="w-[min(20rem,calc(100vw-2rem))] p-1"
      >
        {headerSlot && (
          <>
            <div className="px-2 py-1.5">{headerSlot}</div>
            <DropdownMenuSeparator />
          </>
        )}

        <div className="px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Workspaces
        </div>

        <div className="max-h-72 overflow-y-auto">
          {workspaces.map((ws) => (
            <WorkspaceItem
              key={ws.id}
              workspace={ws}
              isActive={ws.id === activeWorkspaceId}
              onSelect={() => handleSelect(ws.id)}
            />
          ))}
        </div>

        {footerSlot && (
          <>
            <DropdownMenuSeparator />
            <div className="px-1 py-0.5">{footerSlot}</div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
