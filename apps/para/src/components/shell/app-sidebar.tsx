"use client";

// @primitive-exempt: nav rows and the collapse toggle are rail items, not controls; Button's control recipe (height, padding, weight) does not match LibTV's rail.

import {
  Agent,
  Command,
  FolderOpen,
  Home,
  Layers,
  Plus,
  SidebarLeft,
  StarFill,
} from "@nebutra/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ComponentType, type SVGProps, useEffect, useState } from "react";
import { useCreateCanvas } from "@/lib/create-canvas";
import { useUiStore } from "@/stores/ui-store";
import { Wordmark } from "./wordmark";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

const NAV: readonly {
  href: string;
  label: string;
  icon: Icon;
  match: (path: string) => boolean;
}[] = [
  { href: "/", label: "首页", icon: Home, match: (p) => p === "/" },
  {
    href: "/projects",
    label: "项目",
    icon: Layers,
    match: (p) => p === "/projects" || /^\/p\/[^/]+\/?$/.test(p),
  },
  { href: "/assets", label: "资产", icon: FolderOpen, match: (p) => p.startsWith("/assets") },
];

const COLLAPSE_KEY = "para.sidebar.collapsed";

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeCollapsed(value: boolean) {
  try {
    window.localStorage.setItem(COLLAPSE_KEY, value ? "1" : "0");
  } catch {
    // Private mode or blocked storage: the rail still toggles, it just is not remembered.
  }
}

/**
 * The persistent rail, in LibTV's order: the logo with a collapse toggle, a bright 新建项目, the
 * places your work lives (首页 / 项目 / 资产) and PARA Agent, then membership and the version at
 * the foot. LibTV's community entries (TV Show, 创作者挑战赛) have no PARA equivalent and are left
 * out rather than faked.
 */
export function AppSidebar({ version }: { version: string }) {
  const pathname = usePathname();
  const { create, pending, failed } = useCreateCanvas();
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => setCollapsed(readCollapsed()), []);

  const toggle = () => {
    setCollapsed((c) => {
      writeCollapsed(!c);
      return !c;
    });
  };

  const row = `flex h-[var(--para-h-control)] w-full items-center gap-2.5 rounded-lg text-body transition-colors ${
    collapsed ? "justify-center px-0" : "px-3"
  }`;

  return (
    <aside
      className={`hidden h-full shrink-0 flex-col border-border border-r px-3 pb-4 transition-[width] duration-200 md:flex ${
        collapsed ? "w-16" : "w-[var(--para-sidebar-w)]"
      }`}
    >
      <div
        className={`flex h-[var(--para-topbar-h)] shrink-0 items-center ${
          collapsed ? "justify-center" : "justify-between pl-2"
        }`}
      >
        {collapsed ? null : <Wordmark />}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
          aria-expanded={!collapsed}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <SidebarLeft className="size-4" />
        </button>
      </div>

      <button
        type="button"
        aria-busy={pending === "blank" || undefined}
        aria-label={collapsed ? "新建项目" : undefined}
        disabled={pending !== null}
        onClick={() => void create("blank")}
        className={`mt-3 flex h-[var(--para-h-control)] w-full items-center gap-2 rounded-lg bg-cyan-9 font-medium text-[color:var(--cyan-contrast)] text-body transition-colors hover:bg-cyan-10 disabled:cursor-wait ${
          collapsed ? "justify-center" : "px-3"
        }`}
      >
        <Plus className="size-4" />
        {collapsed ? null : "新建项目"}
      </button>

      {failed ? (
        <p role="status" className="mt-2 px-3 text-label text-muted-foreground">
          项目没有建好。请先登录，再试一次。
        </p>
      ) : null}

      <nav aria-label="主导航" className="mt-4 flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              aria-label={collapsed ? label : undefined}
              title={collapsed ? label : undefined}
              className={`${row} ${
                active
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              {collapsed ? null : label}
            </Link>
          );
        })}
        <button
          type="button"
          aria-busy={pending === "agent" || undefined}
          aria-label={collapsed ? "PARA Agent" : undefined}
          title={collapsed ? "PARA Agent" : undefined}
          disabled={pending !== null}
          onClick={() => void create("agent")}
          className={`${row} text-muted-foreground hover:bg-accent hover:text-foreground disabled:cursor-wait`}
        >
          <Agent className="size-4" />
          {collapsed ? null : "PARA Agent"}
        </button>
      </nav>

      <div className="flex-1" />

      {collapsed ? null : (
        <Link
          href="/pro"
          className="group flex items-center gap-3 rounded-xl bg-card p-3.5 transition-colors hover:bg-neutral-4"
        >
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-body text-foreground">PARA Pro 会员</span>
            <span className="mt-0.5 block text-label text-muted-foreground">每月发放积分</span>
          </span>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cyan-9/15 text-brand-accent">
            <StarFill className="size-4" />
          </span>
        </Link>
      )}

      <div
        className={`mt-3 flex items-center ${collapsed ? "flex-col gap-2" : "justify-between px-1"}`}
      >
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          aria-label="搜索与命令"
          className="flex h-8 items-center gap-2 rounded-md px-2 text-body text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Command className="size-4" />
          {collapsed ? null : "搜索与命令"}
        </button>
        <span className="px-1.5 text-meta text-muted-foreground tabular-nums">v{version}</span>
      </div>
    </aside>
  );
}
