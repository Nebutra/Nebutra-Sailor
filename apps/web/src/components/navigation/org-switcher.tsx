"use client";

/**
 * Top-nav organization switcher — phase 2.5.
 *
 * Lists the user's organizations and posts to /api/organizations/active to
 * switch the active org. Gated by `isAuthFeatureEnabled("organizations")`
 * at the mount site — this component itself does not check the flag so it
 * remains a leaf primitive.
 *
 * Wiring notes:
 *   - Reads `useOrganization()` from `@nebutra/auth/client` for the current
 *     active org. When `isLoaded === false` the component renders nothing.
 *   - Fetches the user's org list from `/api/organizations` (existing route).
 *   - On row click, POSTs to `/api/organizations/active`. The route forwards
 *     Better Auth's `Set-Cookie` rotation so the next request sees the new
 *     active org (phase 2.3 / SetActiveResult).
 *   - Empty state links to /onboarding (the existing create-org flow).
 */

import { useOrganization } from "@nebutra/auth/client";
import { AnimateIn } from "@nebutra/ui/components";
import { Building2, Check, ChevronDown, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

interface OrgSummary {
  id: string;
  name: string;
  slug: string;
}

function truncate(value: string, max = 24): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function OrgSwitcher() {
  const t = useTranslations("navigation.orgSwitcher");
  const router = useRouter();
  const { organization, isLoaded } = useOrganization();

  const [open, setOpen] = useState(false);
  const [orgs, setOrgs] = useState<OrgSummary[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onDocumentClick(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, [open]);

  // Lazily fetch the org list the first time the menu opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/organizations");
        if (!response.ok) return;
        const data = (await response.json()) as { organizations?: OrgSummary[] };
        if (cancelled) return;
        setOrgs(
          (data.organizations ?? []).map((entry) => ({
            id: entry.id,
            name: entry.name,
            slug: entry.slug,
          })),
        );
      } catch {
        // Network failure — surface via the inline error region.
        if (!cancelled) setErrorMessage(t("error"));
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [open, t]);

  const handleSelect = useCallback(
    async (orgId: string) => {
      if (pendingId) return;
      setPendingId(orgId);
      setErrorMessage(null);
      try {
        const response = await fetch("/api/organizations/active", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ organizationId: orgId }),
        });
        if (!response.ok) {
          setErrorMessage(t("error"));
          return;
        }
        setOpen(false);
        router.refresh();
      } catch {
        setErrorMessage(t("error"));
      } finally {
        setPendingId(null);
      }
    },
    [pendingId, router, t],
  );

  if (!isLoaded) {
    return null;
  }

  const triggerLabel = organization?.name ? truncate(organization.name) : t("selectOrg");

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        aria-label={t("ariaLabel")}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-8 items-center gap-2 rounded-md border border-neutral-7 bg-neutral-2 px-3 text-sm font-medium text-neutral-12 transition-colors hover:bg-neutral-3 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
      >
        <Building2 className="h-4 w-4 text-neutral-11" aria-hidden />
        <span className="max-w-[12rem] truncate">{triggerLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 text-neutral-11" aria-hidden />
      </button>

      {open && (
        <AnimateIn preset="emerge">
          <div
            role="menu"
            aria-label={t("ariaLabel")}
            className="absolute right-0 z-50 mt-2 w-72 rounded-md border border-neutral-7 bg-neutral-1 p-1 shadow-lg dark:border-white/10 dark:bg-neutral-12"
          >
            {orgs.length === 0 ? (
              <div className="px-3 py-3 text-sm">
                <p className="mb-2 text-neutral-11 dark:text-white/60">{t("empty")}</p>
                <Link
                  href="/onboarding"
                  className="inline-flex items-center gap-2 rounded-sm bg-[var(--brand-primary)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                  onClick={() => setOpen(false)}
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  <span>{t("create")}</span>
                </Link>
              </div>
            ) : (
              <ul className="max-h-72 overflow-y-auto">
                {orgs.map((entry) => {
                  const isActive = entry.id === organization?.id;
                  const isPending = pendingId === entry.id;
                  return (
                    <li key={entry.id}>
                      <button
                        type="button"
                        role="menuitem"
                        aria-current={isActive ? "true" : undefined}
                        aria-label={entry.name}
                        disabled={isPending || isActive}
                        onClick={() => {
                          void handleSelect(entry.id);
                        }}
                        className="flex w-full items-center justify-between gap-2 rounded-sm px-3 py-2 text-left text-sm text-neutral-12 transition-colors hover:bg-neutral-2 disabled:cursor-not-allowed disabled:opacity-70 dark:text-white dark:hover:bg-white/10"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{entry.name}</span>
                          {entry.slug && (
                            <span className="block truncate text-xs text-neutral-11 dark:text-white/60">
                              {entry.slug}
                            </span>
                          )}
                        </span>
                        {isPending ? (
                          <span className="text-xs text-neutral-11">{t("switching")}</span>
                        ) : isActive ? (
                          <Check className="h-4 w-4 text-[var(--brand-primary)]" aria-hidden />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
                <li className="my-1 h-px bg-neutral-6 dark:bg-white/10" aria-hidden />
                <li>
                  <Link
                    href="/onboarding"
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-neutral-12 transition-colors hover:bg-neutral-2 dark:text-white dark:hover:bg-white/10"
                    onClick={() => setOpen(false)}
                  >
                    <Plus className="h-4 w-4 text-neutral-11" aria-hidden />
                    <span>{t("create")}</span>
                  </Link>
                </li>
              </ul>
            )}

            {errorMessage && (
              <p
                role="alert"
                className="mt-1 rounded-sm bg-[color:var(--status-danger)]/10 px-3 py-2 text-xs text-[color:var(--status-danger)]"
              >
                {errorMessage}
              </p>
            )}
          </div>
        </AnimateIn>
      )}
    </div>
  );
}
