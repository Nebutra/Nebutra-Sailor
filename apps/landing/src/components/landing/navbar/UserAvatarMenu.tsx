"use client";

/**
 * UserAvatarMenu — closed-loop signed-in indicator for marketing pages.
 *
 * 2026 SaaS pattern (Vercel / Linear / Stripe Dashboard style):
 *   - Reads `session hint cookie` on brand apex by the web app's
 *     auth catchall (apps/web/src/lib/session-hint.ts) when sign-in succeeds.
 *   - When the hint is present, fetches `${APP_URL}/api/me/public` with
 *     credentials to hydrate avatar + name + active-org.
 *   - Dropdown actions are real: go-to-dashboard, switch theme, sign-out
 *     (clears server session + the hint cookie via the catchall).
 *
 * Graceful degradation:
 *   - No hint cookie → render nothing (Navbar shows Sign In + Get Sailed).
 *   - Hint present but fetch fails (CORS, network, server) → render nothing
 *     and let the Navbar fall back to Sign In + Get Sailed. Never display
 *     a broken half-loaded avatar.
 *   - Hint present, fetch in-flight → render a quiet placeholder circle
 *     (no skeleton shimmer; avoids layout shift for the common-case anon).
 *
 * Privacy: never displays the user's ID or any sensitive field. Only the
 * display name + email + avatar URL the server explicitly allow-listed in
 * apps/web/src/app/api/me/public/route.ts.
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
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { env } from "@/lib/env";

const SESSION_HINT_COOKIE = "nebutra_session_hint";
const APP_URL = env.NEXT_PUBLIC_APP_URL;

interface PublicMe {
  name: string;
  email: string;
  avatarUrl: string | null;
  activeOrganization: { name: string; slug: string } | null;
}

function readSessionHint(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .map((c) => c.trim())
    .some((c) => c.startsWith(`${SESSION_HINT_COOKIE}=1`));
}

function subscribeToSessionHint() {
  return () => {};
}

function getClientSessionHint() {
  return readSessionHint();
}

function getServerSessionHint() {
  return false;
}

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
  const hintPresent = useSyncExternalStore(
    subscribeToSessionHint,
    getClientSessionHint,
    getServerSessionHint,
  );
  const [me, setMe] = useState<PublicMe | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Hydrate user info once the hint is observed.
  useEffect(() => {
    if (!hintPresent || me || loadFailed) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`${APP_URL}/api/me/public`, {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (cancelled) return;
        if (!response.ok) {
          setLoadFailed(true);
          return;
        }
        const data = (await response.json()) as PublicMe;
        setMe(data);
      } catch {
        if (!cancelled) setLoadFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hintPresent, me, loadFailed]);

  // Close on outside click + Escape.
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
    // Drive sign-out through the canonical web-app route — that flow
    // also clears the brand apex session-hint cookie via session-hint.ts.
    try {
      await fetch(`${APP_URL}/api/auth/sign-out`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Even on a network failure, wipe the local hint so the UI reflects
      // the user's intent immediately.
    }
    // Optimistically clear in case the catchall didn't reach us.
    document.cookie = `${SESSION_HINT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
    window.location.assign(`${APP_URL}/sign-in`);
  }

  // Nothing renders until we know there's a session AND the fetch succeeded.
  if (!hintPresent || loadFailed) return null;

  const displayName = me?.name || me?.email || t("loadingName");
  const subtitle = me?.activeOrganization?.name ?? me?.email ?? "";

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
          {me?.avatarUrl ? (
            // biome-ignore lint/performance/noImgElement: external user avatars are not in next/image's remotePatterns allowlist; defaults to native <img> with no optimization.
            <img
              src={me.avatarUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            initialsFor(me?.name ?? "", me?.email ?? "")
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
              {me?.avatarUrl ? (
                // biome-ignore lint/performance/noImgElement: external user avatar; see comment on trigger img.
                <img
                  src={me.avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                initialsFor(me?.name ?? "", me?.email ?? "")
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
