"use client";

import type { LucideIcon } from "lucide-react";
import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../primitives/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../primitives/dropdown-menu";
import { Kbd } from "../primitives/kbd";
import { cn } from "../utils/cn";

// =============================================================================
// Types
// =============================================================================

export interface UserMenuUser {
  id?: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  /** Initials fallback — defaults to first 2 chars of name */
  initials?: string;
}

export interface UserMenuItem {
  id: string;
  label: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  /** Keyboard shortcut hint, e.g. "⌘," — rendered with <Kbd> */
  shortcut?: string;
  onSelect?: () => void;
  /** If present, item renders as a link */
  href?: string;
  /** Destructive items render in red (e.g. "Sign out") */
  destructive?: boolean;
  disabled?: boolean;
}

export interface UserMenuGroup {
  id: string;
  label?: string;
  items: UserMenuItem[];
}

export interface UserMenuProps {
  user: UserMenuUser;
  /** Groups of action items (e.g. [{ items: [Profile, Settings] }, { items: [Signout] }]) */
  groups: UserMenuGroup[];
  /** Slot rendered above groups — typically a <WorkspaceSwitcher /> or "Workspaces" section */
  workspaceSlot?: React.ReactNode;
  /** Optional render override for the trigger — default is Avatar */
  renderTrigger?: (user: UserMenuUser) => React.ReactNode;
  /** Optional render override for links (e.g. Next.js Link) */
  renderLink?: (props: { href: string; children: React.ReactNode }) => React.ReactElement;
  className?: string;
  /** Dropdown align (default "end") */
  align?: "start" | "center" | "end";
}

// =============================================================================
// Helpers
// =============================================================================

function computeInitials(user: UserMenuUser): string {
  if (user.initials && user.initials.trim().length > 0) {
    return user.initials.toUpperCase().slice(0, 2);
  }
  const source = (user.name ?? "").trim() || (user.email ?? "").trim();
  if (!source) return "?";
  const tokens = source.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) {
    const first = tokens[0]?.[0] ?? "";
    const second = tokens[1]?.[0] ?? "";
    return (first + second).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function DefaultTrigger({ user }: { user: UserMenuUser }) {
  const initials = computeInitials(user);
  return (
    <button
      type="button"
      aria-label="Open user menu"
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full",
        "outline-none transition-all hover:opacity-90",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "hover:ring-1 hover:ring-border",
      )}
    >
      <Avatar size="sm">
        {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.name} /> : null}
        <AvatarFallback size="sm" className="bg-[image:var(--brand-gradient)] text-white">
          {initials}
        </AvatarFallback>
      </Avatar>
    </button>
  );
}

interface UserMenuItemContentProps {
  item: UserMenuItem;
}

function UserMenuItemContent({ item }: UserMenuItemContentProps) {
  const Icon = item.icon;
  return (
    <>
      {Icon ? <Icon className="mr-2 h-4 w-4 shrink-0" aria-hidden /> : null}
      <span className="flex-1 truncate">{item.label}</span>
      {item.shortcut ? (
        <Kbd className="ml-2" small>
          {item.shortcut}
        </Kbd>
      ) : null}
    </>
  );
}

// =============================================================================
// Component
// =============================================================================

export function UserMenu(props: UserMenuProps): React.ReactElement {
  const {
    user,
    groups,
    workspaceSlot,
    renderTrigger,
    renderLink,
    className,
    align = "end",
  } = props;

  const initials = computeInitials(user);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {renderTrigger ? renderTrigger(user) : <DefaultTrigger user={user} />}
      </DropdownMenuTrigger>

      <DropdownMenuContent align={align} sideOffset={8} className={cn("w-[280px] p-1", className)}>
        {/* ─── User info header ───────────────────────────────────────── */}
        <div className="flex items-center gap-3 p-3">
          <Avatar size="md">
            {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.name} /> : null}
            <AvatarFallback size="md" className="bg-[image:var(--brand-gradient)] text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium text-foreground">{user.name}</span>
            {user.email ? (
              <span className="truncate text-xs text-muted-foreground">{user.email}</span>
            ) : null}
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* ─── Workspace slot ─────────────────────────────────────────── */}
        {workspaceSlot ? (
          <>
            <div className="px-1 py-1">{workspaceSlot}</div>
            <DropdownMenuSeparator />
          </>
        ) : null}

        {/* ─── Action groups ──────────────────────────────────────────── */}
        {groups.map((group, groupIndex) => {
          const isLastGroup = groupIndex === groups.length - 1;
          return (
            <React.Fragment key={group.id}>
              {group.label ? (
                <div className="px-2 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </div>
              ) : null}

              {group.items.map((item) => {
                const itemClassName = cn(
                  "flex w-full cursor-pointer items-center",
                  item.destructive &&
                    "text-destructive focus:bg-destructive focus:text-destructive-foreground data-[highlighted]:bg-destructive data-[highlighted]:text-destructive-foreground",
                );

                // Link variant
                if (item.href && !item.disabled) {
                  const linkContent = <UserMenuItemContent item={item} />;
                  const linkElement = renderLink ? (
                    renderLink({ href: item.href, children: linkContent })
                  ) : (
                    <a href={item.href}>{linkContent}</a>
                  );
                  return (
                    <DropdownMenuItem
                      key={item.id}
                      className={itemClassName}
                      onClick={item.onSelect}
                      render={linkElement}
                    />
                  );
                }

                // Action variant
                return (
                  <DropdownMenuItem
                    key={item.id}
                    className={itemClassName}
                    disabled={item.disabled}
                    onClick={() => {
                      if (!item.disabled) item.onSelect?.();
                    }}
                  >
                    <UserMenuItemContent item={item} />
                  </DropdownMenuItem>
                );
              })}

              {!isLastGroup ? <DropdownMenuSeparator /> : null}
            </React.Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

UserMenu.displayName = "UserMenu";
