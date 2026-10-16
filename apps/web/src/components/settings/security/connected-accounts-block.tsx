"use client";

import { SettingsSection } from "@nebutra/ui/layout";
import { Button } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { resolveAuthErrorKey } from "@/lib/auth/error-catalog";
import type { AuthErrorKey } from "@/lib/auth/error-keys";
import type { SecurityCapabilities } from "./security-capabilities";

const PROVIDERS = ["google", "github", "apple", "microsoft", "discord"] as const;
type ProviderId = (typeof PROVIDERS)[number];

const PROVIDER_LABELS: Record<ProviderId, string> = {
  apple: "Apple",
  discord: "Discord",
  github: "GitHub",
  google: "Google",
  microsoft: "Microsoft",
};

export interface ConnectedAccountsBlockProps {
  capability: SecurityCapabilities["connectedAccounts"];
  loading?: boolean;
  /** Called to link an OAuth provider. Defaults to POST /api/auth/oauth/{provider}/link. */
  onLink?: (providerId: string) => Promise<void>;
  /** Called to unlink an OAuth provider. Defaults to POST /api/auth/oauth/{provider}/unlink. */
  onUnlink?: (providerId: string) => Promise<void>;
  /** Notifies the parent that the linked provider list may have changed. */
  onChanged?: () => void;
}

async function defaultLink(providerId: string): Promise<void> {
  const response = await fetch(`/api/auth/oauth/${providerId}/link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ callbackURL: window.location.href }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    throw payload ?? { code: "UNKNOWN" };
  }
}

async function defaultUnlink(providerId: string): Promise<void> {
  const response = await fetch(`/api/auth/oauth/${providerId}/unlink`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    throw payload ?? { code: "UNKNOWN" };
  }
}

export function ConnectedAccountsBlock({
  capability,
  loading = false,
  onLink,
  onUnlink,
  onChanged,
}: ConnectedAccountsBlockProps) {
  const tReasons = useTranslations("copy.securityReasons");
  const tc = useTranslations("copy.securityConnectedAccountsBlock");
  const t = useTranslations("auth.security.connectedAccounts");
  const tErrors = useTranslations("auth.errors");
  const [pendingProvider, setPendingProvider] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<AuthErrorKey | null>(null);

  if (!capability.available) {
    return (
      <SettingsSection
        title={t("title")}
        description={t("description")}
        badge={
          <span className="w-fit rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {tc("providerManaged")}
          </span>
        }
      >
        <p className="text-sm text-muted-foreground">
          {tReasons(capability.reasonKey, capability.reasonValues)}
        </p>
      </SettingsSection>
    );
  }

  async function handleLink(providerId: string) {
    setErrorKey(null);
    setPendingProvider(providerId);
    try {
      const submit = onLink ?? defaultLink;
      await submit(providerId);
      onChanged?.();
    } catch (error) {
      setErrorKey(resolveAuthErrorKey(error));
    } finally {
      setPendingProvider(null);
    }
  }

  async function handleUnlink(providerId: string) {
    setErrorKey(null);
    setPendingProvider(providerId);
    try {
      const submit = onUnlink ?? defaultUnlink;
      await submit(providerId);
      onChanged?.();
    } catch (error) {
      setErrorKey(resolveAuthErrorKey(error));
    } finally {
      setPendingProvider(null);
    }
  }

  const errorMessage = errorKey ? tErrors(errorKey) : null;
  const linkedSet = new Set(capability.linkedProviders);

  return (
    <SettingsSection title={t("title")} description={`${t("description")} ${t("help")}`}>
      {errorMessage && (
        <p
          className="mb-4 text-sm text-destructive-strong"
          id="connected-accounts-error"
          role="alert"
        >
          {errorMessage}
        </p>
      )}

      {loading ? (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {PROVIDERS.map((providerId) => (
            <div key={providerId} className="flex items-center gap-3 px-4 py-3">
              <span className="size-8 animate-pulse rounded-[var(--radius-md)] bg-muted" />
              <span className="h-3 w-28 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          {PROVIDERS.map((providerId) => {
            const isLinked = linkedSet.has(providerId);
            const isPending = pendingProvider === providerId;
            return (
              <li key={providerId} className="flex items-center gap-3 px-4 py-3">
                <span
                  aria-hidden="true"
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-border bg-neutral-2 text-xs font-semibold text-neutral-11"
                >
                  {PROVIDER_LABELS[providerId].charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {PROVIDER_LABELS[providerId]}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span
                      aria-hidden="true"
                      className={`size-1.5 rounded-full ${isLinked ? "bg-success" : "bg-neutral-7"}`}
                    />
                    {isLinked ? t("connected") : t("notLinked")}
                  </p>
                </div>
                {isLinked ? (
                  <Button
                    disabled={isPending}
                    type="button"
                    size="sm"
                    onClick={() => handleUnlink(providerId)}
                    variant="ghost"
                  >
                    {t("unlink")}
                  </Button>
                ) : (
                  <Button
                    disabled={isPending}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleLink(providerId)}
                  >
                    {t("connect")}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        {tReasons(capability.reasonKey, capability.reasonValues)}
      </p>
    </SettingsSection>
  );
}
