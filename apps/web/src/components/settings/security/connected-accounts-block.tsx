"use client";

import { Button } from "@nebutra/ui/components";
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
  const t = useTranslations("auth.security.connectedAccounts");
  const tErrors = useTranslations("auth.errors");
  const [pendingProvider, setPendingProvider] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<AuthErrorKey | null>(null);

  if (!capability.available) {
    return (
      <section className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-sm font-medium text-[var(--neutral-12)]">{t("title")}</h3>
            <p className="mt-1 text-sm text-[var(--neutral-11)]">{t("description")}</p>
          </div>
          <span className="w-fit rounded-full border border-[var(--neutral-7)] px-2.5 py-1 text-xs font-medium text-[var(--neutral-11)]">
            Provider managed
          </span>
        </div>
        <p className="text-sm text-[var(--neutral-11)]">{capability.reason}</p>
      </section>
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
    <section className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-sm font-medium text-[var(--neutral-12)]">{t("title")}</h3>
          <p className="mt-1 text-sm text-[var(--neutral-11)]">{t("description")}</p>
        </div>
      </div>

      {errorMessage && (
        <p
          className="mb-4 text-sm text-[hsl(var(--destructive))]"
          id="connected-accounts-error"
          role="alert"
        >
          {errorMessage}
        </p>
      )}

      {loading ? (
        <div className="space-y-3">
          {PROVIDERS.map((providerId) => (
            <div
              key={providerId}
              className="h-14 animate-pulse rounded-lg border border-[var(--neutral-6)] bg-[var(--neutral-2)]"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {PROVIDERS.map((providerId) => {
            const isLinked = linkedSet.has(providerId);
            const isPending = pendingProvider === providerId;
            return (
              <div
                key={providerId}
                className="flex flex-col gap-3 rounded-lg border border-[var(--neutral-7)] p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--neutral-12)]">
                    {PROVIDER_LABELS[providerId]}
                  </p>
                  <p className="mt-1 text-xs text-[var(--neutral-10)]">
                    {isLinked ? t("connected") : t("notLinked")}
                  </p>
                </div>
                {isLinked ? (
                  <Button
                    disabled={isPending}
                    htmlType="button"
                    onClick={() => handleUnlink(providerId)}
                    variant="outlined"
                  >
                    {t("unlink")}
                  </Button>
                ) : (
                  <Button
                    disabled={isPending}
                    htmlType="button"
                    onClick={() => handleLink(providerId)}
                    type="primary"
                  >
                    {t("connect")}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-xs leading-5 text-[var(--neutral-10)]">{capability.reason}</p>
    </section>
  );
}
