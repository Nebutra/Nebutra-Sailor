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
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
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

export function UserAvatarMenu(): React.ReactElement | null {
  const t = useTranslations("nav.avatarMenu");
  const me = usePublicMe();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDocumentClick(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocumentClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocumentClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

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

  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        aria-label={t("ariaLabel")}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-full border border-neutral-7/60 bg-neutral-2/60 px-1.5 py-1 text-sm font-medium text-neutral-12 transition-colors hover:bg-neutral-3/80"
      >
        <span
          aria-hidden
          className="relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-primary text-[10px] font-semibold text-white shadow-inner"
        >
          {me.avatarUrl ? (
            // biome-ignore lint/performance/noImgElement: external user avatars are not in next/image's remotePatterns allowlist; defaults to native <img> with no optimization.
            <img
              src={me.avatarUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            initialsFor(me.name, me.email)
          )}
          <span
            aria-hidden
            className="absolute right-0 bottom-0 h-2 w-2 rounded-full bg-green-500 ring-2 ring-white dark:ring-black"
          />
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-neutral-11" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t("ariaLabel")}
          className="absolute right-0 top-full z-50 mt-2 w-72 origin-top-right rounded-[var(--radius-xl)] border border-neutral-7/70 bg-white p-1.5 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18)] backdrop-blur-xl dark:bg-black/95"
        >
          <div className="flex items-center gap-3 rounded-[var(--radius-lg)] px-3 py-2.5">
            <span
              aria-hidden
              className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-semibold text-white shadow-inner"
            >
              {me.avatarUrl ? (
                // biome-ignore lint/performance/noImgElement: external user avatar; see comment on trigger img.
                <img
                  src={me.avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                initialsFor(me.name, me.email)
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-neutral-12">{displayName}</p>
              {subtitle && <p className="truncate text-xs text-neutral-11">{subtitle}</p>}
            </div>
          </div>

          <div className="my-1 h-px bg-neutral-6" aria-hidden />

          <MenuLink href={`${APP_URL}/workspace`} icon={User} label={t("dashboard")} />
          <MenuLink href={`${APP_URL}/settings/account`} icon={Settings} label={t("account")} />
          <MenuLink href={`${APP_URL}/settings/billing`} icon={CreditCard} label={t("billing")} />
          <MenuLink href="/docs" icon={BookOpen} label={t("docs")} external={false} />

          <div className="my-1 h-px bg-neutral-6" aria-hidden />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              void handleSignOut();
            }}
            className="flex w-full items-center gap-3 rounded-[var(--radius-lg)] px-3 py-2 text-sm font-medium text-[color:var(--status-danger)] transition-colors hover:bg-[color:var(--status-danger)]/10"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            <span>{t("signOut")}</span>
          </button>
        </div>
      )}
    </div>
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
  const className =
    "flex w-full items-center gap-3 rounded-[var(--radius-lg)] px-3 py-2 text-sm font-medium text-neutral-12 transition-colors hover:bg-neutral-2";
  return (
    <a
      role="menuitem"
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noreferrer" : undefined}
      className={className}
    >
      <Icon className="h-4 w-4 text-neutral-11" aria-hidden />
      <span>{label}</span>
    </a>
  );
}

UserAvatarMenu.displayName = "UserAvatarMenu";
