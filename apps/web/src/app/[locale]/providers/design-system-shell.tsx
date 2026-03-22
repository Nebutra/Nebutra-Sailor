"use client";

import { SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import type React from "react";
import { useState } from "react";

function HeaderAuthControls() {
  const { isSignedIn } = useAuth();

  return (
    <div className="hidden items-center gap-2 sm:flex">
      {isSignedIn ? (
        <UserButton
          appearance={{
            elements: { avatarBox: "h-9 w-9" },
          }}
        />
      ) : (
        <div className="flex gap-2">
          <SignInButton mode="modal">
            <button
              type="button"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-neutral-11 transition-colors hover:bg-neutral-2 dark:text-white/70 dark:hover:bg-white/10"
            >
              Sign In
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button
              type="button"
              className="rounded-md bg-[image:var(--brand-gradient)] px-3 py-1.5 text-sm font-medium text-white"
            >
              Sign Up
            </button>
          </SignUpButton>
        </div>
      )}
    </div>
  );
}

import { ChevronRight, Menu, X } from "lucide-react";
import { ViewTransitionLink } from "@/components/navigation/view-transition-link";
import {
  buildBreadcrumbs,
  DASHBOARD_NAV_GROUPS,
  DASHBOARD_NAV_ITEMS,
  isActiveRoute,
  isWorkspaceId,
  WORKSPACES,
  type WorkspaceId,
} from "./dashboard-nav";

interface Props {
  children: React.ReactNode;
  hasClerkKey: boolean;
}

function SidebarNav({
  pathname,
  mobile = false,
  onNavigate,
}: {
  pathname: string;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="space-y-1">
      {DASHBOARD_NAV_GROUPS.map((group) => (
        <div key={group.title} className="mb-4 space-y-1.5">
          <p className="px-2 text-[11px] font-semibold tracking-[0.12em] text-neutral-10 uppercase dark:text-white/50">
            {group.title}
          </p>
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = isActiveRoute(pathname, item.href);
            return (
              <ViewTransitionLink
                key={item.label}
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  if (mobile) onNavigate?.();
                }}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-2 text-blue-11 dark:bg-white/10 dark:text-white"
                    : "text-neutral-11 hover:bg-neutral-2 hover:text-neutral-12 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </ViewTransitionLink>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function DesignSystemShell({ children, hasClerkKey }: Props) {
  const pathname = usePathname();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [workspace, setWorkspace] = useState<WorkspaceId>(WORKSPACES[0].id);
  const breadcrumbs = buildBreadcrumbs(pathname);
  const currentBreadcrumb = breadcrumbs[breadcrumbs.length - 1];

  return (
    <div className="min-h-screen bg-neutral-2 text-neutral-12 dark:bg-black dark:text-white">
      {isMobileNavOpen && (
        <>
          <button
            type="button"
            aria-label="Close mobile navigation backdrop"
            className="fixed inset-0 z-50 bg-black/45 md:hidden"
            onClick={() => setIsMobileNavOpen(false)}
          />
          <aside
            aria-label="Mobile Sidebar"
            className="fixed inset-y-0 left-0 z-60 w-[85vw] max-w-72 border-r border-neutral-7 bg-neutral-1 px-4 py-5 md:hidden dark:border-white/10 dark:bg-black"
          >
            <div className="mb-6 flex items-center justify-between px-2">
              <span className="text-sm font-semibold tracking-tight">Nebutra Sailor</span>
              <button
                type="button"
                aria-label="Close mobile navigation"
                className="rounded-lg p-2 text-neutral-11 hover:bg-neutral-2 hover:text-neutral-12 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
                onClick={() => setIsMobileNavOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-4 px-2">
              <label htmlFor="workspace-switcher-mobile" className="sr-only">
                Workspace switcher
              </label>
              <select
                id="workspace-switcher-mobile"
                aria-label="Workspace switcher"
                value={workspace}
                onChange={(event) => {
                  if (isWorkspaceId(event.target.value)) {
                    setWorkspace(event.target.value);
                  }
                }}
                className="w-full rounded-lg border border-neutral-7 bg-neutral-1 px-3 py-2 text-sm text-neutral-12 dark:border-white/15 dark:bg-black dark:text-white"
              >
                {WORKSPACES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <SidebarNav pathname={pathname} mobile onNavigate={() => setIsMobileNavOpen(false)} />
          </aside>
        </>
      )}

      <div className="flex min-h-screen">
        <aside
          aria-label="Sidebar"
          className="hidden w-72 shrink-0 border-r border-neutral-7 bg-neutral-1 px-4 py-5 md:flex md:flex-col dark:border-white/10 dark:bg-black/30"
        >
          <div className="mb-7 flex items-center px-2">
            <span className="text-lg font-semibold tracking-tight">Nebutra Sailor</span>
          </div>

          <div className="mb-5 px-2">
            <label htmlFor="workspace-switcher" className="sr-only">
              Workspace switcher
            </label>
            <select
              id="workspace-switcher"
              aria-label="Workspace switcher"
              value={workspace}
              onChange={(event) => {
                if (isWorkspaceId(event.target.value)) {
                  setWorkspace(event.target.value);
                }
              }}
              className="w-full rounded-lg border border-neutral-7 bg-neutral-1 px-3 py-2 text-sm text-neutral-12 dark:border-white/15 dark:bg-black/40 dark:text-white"
            >
              {WORKSPACES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <SidebarNav pathname={pathname} />

          <div className="mt-auto rounded-xl border border-neutral-7 bg-neutral-2 p-3 text-xs text-neutral-11 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
            Workspace mode:{" "}
            {WORKSPACES.find((item) => item.id === workspace)?.label ?? "Starter Workspace"}
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-neutral-7 bg-(--neutral-1)/90 px-3 py-3 backdrop-blur sm:px-4 md:px-8 dark:border-white/10 dark:bg-black/65">
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  aria-label="Open navigation"
                  className="rounded-lg p-2 text-neutral-11 hover:bg-neutral-2 hover:text-neutral-12 md:hidden dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
                  onClick={() => setIsMobileNavOpen(true)}
                >
                  <Menu className="h-4 w-4" />
                </button>
                <div className="min-w-0">
                  <p className="hidden text-xs text-neutral-10 min-[360px]:block dark:text-white/60">
                    Workspace
                  </p>
                  <p className="mt-0.5 truncate text-sm font-medium text-neutral-12 dark:text-white sm:hidden">
                    {currentBreadcrumb?.label ?? "Dashboard"}
                  </p>
                  <nav aria-label="Breadcrumb" className="mt-0.5 hidden sm:block">
                    <ol className="flex items-center gap-1 text-sm text-neutral-11 dark:text-white/70">
                      {breadcrumbs.map((crumb, index) => {
                        const isLast = index === breadcrumbs.length - 1;
                        return (
                          <li key={crumb.href} className="flex items-center gap-1">
                            {index > 0 && <ChevronRight className="h-3.5 w-3.5" />}
                            {isLast ? (
                              <span className="font-medium text-neutral-12 dark:text-white">
                                {crumb.label}
                              </span>
                            ) : (
                              <ViewTransitionLink
                                href={crumb.href}
                                className="transition-colors hover:text-neutral-12 dark:hover:text-white"
                              >
                                {crumb.label}
                              </ViewTransitionLink>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  </nav>
                </div>
              </div>

              <div className="hidden gap-2 md:flex">
                {DASHBOARD_NAV_ITEMS.slice(0, 3).map((item) => (
                  <ViewTransitionLink
                    key={item.label}
                    href={item.href}
                    className="rounded-lg px-3 py-1.5 text-sm text-neutral-11 hover:bg-neutral-2 hover:text-neutral-12 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    {item.label}
                  </ViewTransitionLink>
                ))}
              </div>

              {hasClerkKey && <HeaderAuthControls />}
            </div>
          </header>

          <main
            id="main-content"
            aria-label="Main content"
            className="content-area flex-1 px-3 py-5 sm:px-4 sm:py-6 md:px-8"
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
