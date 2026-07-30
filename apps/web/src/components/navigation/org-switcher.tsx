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
 *
 * The surface is the DS `DropdownMenu` (Base UI menu): arrow keys, Home/End,
 * type-ahead, focus trap, focus return to the trigger, Escape and outside-press
 * all come from the primitive. Rows are real `menuitem`s so they participate in
 * that rotation — including the "create organization" row.
 */

import { useOrganization } from "@nebutra/auth/client";
import { Buildings as Building2, Check, ChevronDown, Plus } from "@nebutra/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@nebutra/ui/primitives";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

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

  // Lazily fetch the org list the first time the menu opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      try {
        const { fetchWithTimeout } = await import("@nebutra/browser-utils");
        const response = await fetchWithTimeout("/api/organizations", { timeoutMs: 12_000 });
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
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        aria-label={t("ariaLabel")}
        className="inline-flex h-8 items-center gap-2 rounded-[var(--radius-md)] border border-neutral-7 bg-neutral-2 px-3 text-sm font-medium text-neutral-12 transition-colors hover:bg-neutral-3"
      >
        <Building2 className="h-4 w-4 text-neutral-11" aria-hidden />
        <span className="max-w-[12rem] truncate">{triggerLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 text-neutral-11" aria-hidden />
      </DropdownMenuTrigger>

      <DropdownMenuContent aria-label={t("ariaLabel")} align="end" className="w-72">
        {orgs.length === 0 ? (
          <div className="px-3 py-3 text-sm">
            <p className="mb-2 text-muted-foreground">{t("empty")}</p>
            <DropdownMenuItem
              render={
                <Link href="/onboarding">
                  <Plus className="mr-2 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>{t("create")}</span>
                </Link>
              }
            />
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto">
            {orgs.map((entry) => {
              const isActive = entry.id === organization?.id;
              const isPending = pendingId === entry.id;
              return (
                <DropdownMenuItem
                  key={entry.id}
                  aria-current={isActive ? "true" : undefined}
                  aria-label={entry.name}
                  disabled={isPending || isActive}
                  // Stay open until the POST resolves — the row shows its own
                  // pending label, and a failure has to land on the alert below.
                  closeOnClick={false}
                  onClick={() => {
                    void handleSelect(entry.id);
                  }}
                  className="justify-between gap-2 py-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{entry.name}</span>
                    {entry.slug && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {entry.slug}
                      </span>
                    )}
                  </span>
                  {isPending ? (
                    <span className="text-xs text-muted-foreground">{t("switching")}</span>
                  ) : isActive ? (
                    <Check className="h-4 w-4 text-primary" aria-hidden />
                  ) : null}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              render={
                <Link href="/onboarding">
                  <Plus className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                  <span>{t("create")}</span>
                </Link>
              }
            />
          </div>
        )}

        {errorMessage && (
          <p
            role="alert"
            className="mt-1 rounded-[var(--radius-sm)] bg-[color:var(--status-danger)]/10 px-3 py-2 text-xs text-[color:var(--status-danger)]"
          >
            {errorMessage}
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
