"use client";

import { Agent, ArrowUpRight, Home, Image, Layers, Plus } from "@nebutra/icons";
import { Button } from "@nebutra/ui/primitives";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { useCreateCanvas } from "@/lib/create-canvas";
import { Wordmark } from "./wordmark";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

const NAV: readonly {
  href: string;
  label: string;
  icon: Icon;
  match: (path: string) => boolean;
}[] = [
  { href: "/", label: "Home", icon: Home, match: (p) => p === "/" },
  {
    href: "/projects",
    label: "Projects",
    icon: Layers,
    match: (p) => p === "/projects" || /^\/p\/[^/]+\/?$/.test(p),
  },
  { href: "/assets", label: "Assets", icon: Image, match: (p) => p.startsWith("/assets") },
];

const row =
  "flex h-[var(--para-h-control)] w-full items-center gap-2.5 rounded-lg px-3 text-body transition-colors";

/**
 * The persistent rail of the app shell — LibTV's information architecture in PARA's language:
 * create first, then the agent, then the three places your work lives. Community surfaces LibTV
 * has (feed, TV Show, challenges) have no PARA equivalent and are left out rather than faked.
 */
export function AppSidebar({ version }: { version: string }) {
  const pathname = usePathname();
  const { create, pending, failed } = useCreateCanvas();

  return (
    <aside className="sticky top-0 hidden h-dvh w-[var(--para-sidebar-w)] shrink-0 flex-col px-3 pb-4 md:flex">
      <div className="flex h-[var(--para-topbar-h)] shrink-0 items-center px-3">
        <Wordmark />
      </div>

      <Button
        type="button"
        variant="ink"
        className="mt-2 w-full"
        prefix={<Plus className="size-4" />}
        aria-busy={pending === "blank" || undefined}
        disabled={pending !== null}
        onClick={() => void create("blank")}
      >
        New project
      </Button>

      <Button
        type="button"
        variant="ghost"
        className="mt-3 w-full justify-start px-3 text-muted-foreground"
        prefix={<Agent className="size-4" />}
        aria-busy={pending === "agent" || undefined}
        disabled={pending !== null}
        onClick={() => void create("agent")}
      >
        Agent
      </Button>

      {failed ? (
        <p role="status" className="mt-2 px-3 text-label text-muted-foreground">
          The project could not be created. Sign in and try again.
        </p>
      ) : null}

      <nav aria-label="Main" className="mt-4 flex flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`${row} ${
                active
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      <Link
        href="/pro"
        className="group flex flex-col gap-1 rounded-xl bg-card p-4 transition-colors hover:bg-neutral-4"
      >
        <span className="flex items-center justify-between font-medium text-body text-foreground">
          PARA Pro
          <ArrowUpRight className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
        </span>
        <span className="text-label text-muted-foreground">
          Monthly credits for your whole organization.
        </span>
      </Link>

      <p className="mt-3 px-3 text-meta text-muted-foreground tabular-nums">PARA v{version}</p>
    </aside>
  );
}
