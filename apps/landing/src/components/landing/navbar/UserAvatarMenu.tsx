"use client";

/**
 * UserAvatarMenu — signed-in indicator for marketing pages.
 *
 * The apex hint cookie only decides whether `/` bounces into the app.
 * Chrome hydrates from `${APP_URL}/api/me/public` with credentials so an
 * app-host session is enough — the hint is not a gate.
 *
 * That fetch is cross-origin. Landing CSP `connect-src` must list the app
 * host or the browser drops the request and this menu never appears.
 *
 * Renders nothing until that request succeeds. Anon visitors stay on
 * Sign In / Get Sailed with no loading circle.
 */

import {
  BookOpen,
  ChevronDown,
  CreditCard,
  Logout as LogOut,
  SettingsGear as Settings,
  User,
} from "@nebutra/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { env } from "@/lib/env";
import { usePublicMe } from "@/lib/use-public-me";

const SESSION_HINT_COOKIE = "nebutra_session_hint";
const APP_URL = env.NEXT_PUBLIC_APP_URL;

function initialsFor(name: string, email: string): string {
  const source = (name || email || "").trim();
  if (!source) return "?";
  const tokens = source.split(/\s+|@/).filter(Boolean);
  if (tokens.length >= 2) {
    return (tokens[0]?.charAt(0) + tokens[1]?.charAt(0)).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function AvatarFace({
  src,
  name,
  email,
}: {
  src: string | null;
  name: string;
  email: string;
}): React.ReactElement {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  if (!showImage) {
    return <>{initialsFor(name, email)}</>;
  }

  return (
    // biome-ignore lint/performance/noImgElement: external user avatars are not in next/image's remotePatterns allowlist; defaults to native <img> with no optimization.
    <img
      src={src ?? ""}
      alt=""
      className="h-full w-full object-cover"
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

export function UserAvatarMenu(): React.ReactElement | null {
  const t = useTranslations("nav.avatarMenu");
  const me = usePublicMe();

  async function handleSignOut() {
    try {
      await fetch(`${APP_URL}/api/auth/sign-out`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Wipe the local hint so `/` stops bouncing after a failed sign-out hop.
    }
    document.cookie = `${SESSION_HINT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
    window.location.assign(`${APP_URL}/sign-in`);
  }

  if (!me) return null;

  const displayName = me.name || me.email || t("loadingName");
  const subtitle = me.activeOrganization?.name ?? me.email ?? "";

  // The DS menu, not a hand-rolled absolute panel: the navbar is a blurred,
  // stacking-context surface, and an in-place z-50 panel is only as high as
  // the navbar itself. The DS menu portals, and owns outside-click, Escape,
  // focus and arrow-key navigation.
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("ariaLabel")}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-1.5 py-1 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <span
            aria-hidden
            className="relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-primary text-[10px] font-semibold text-primary-foreground shadow-inner"
          >
            <AvatarFace
              key={me.avatarUrl ?? "none"}
              src={me.avatarUrl}
              name={me.name}
              email={me.email}
            />
            <span
              aria-hidden
              className="absolute right-0 bottom-0 h-2 w-2 rounded-full bg-success ring-2 ring-background"
            />
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-72 p-1.5">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <span
            aria-hidden
            className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-inner"
          >
            <AvatarFace
              key={me.avatarUrl ?? "none"}
              src={me.avatarUrl}
              name={me.name}
              email={me.email}
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
            {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>

        <DropdownMenuSeparator />

        <MenuLink href={`${APP_URL}/workspace`} icon={User} label={t("dashboard")} />
        <MenuLink href={`${APP_URL}/settings/account`} icon={Settings} label={t("account")} />
        <MenuLink href={`${APP_URL}/billing`} icon={CreditCard} label={t("billing")} />
        <MenuLink href="/docs" icon={BookOpen} label={t("docs")} external={false} />

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => {
            void handleSignOut();
          }}
          className="gap-3 px-3 py-2 text-destructive-strong"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          <span>{t("signOut")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface MenuLinkProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  external?: boolean;
}

function MenuLink({ href, icon: Icon, label, external = true }: MenuLinkProps) {
  const isExternal = external && href.startsWith("http");
  return (
    <DropdownMenuItem
      render={
        <a
          href={href}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noreferrer" : undefined}
        />
      }
      className="gap-3 px-3 py-2"
    >
      <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
      <span>{label}</span>
    </DropdownMenuItem>
  );
}

UserAvatarMenu.displayName = "UserAvatarMenu";
