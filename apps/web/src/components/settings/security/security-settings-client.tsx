"use client";

import { useUser } from "@nebutra/auth/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { type ActiveSession, ActiveSessionsBlock } from "./active-sessions-block";
import { ChangePasswordForm } from "./change-password-form";
import { ConnectedAccountsBlock } from "./connected-accounts-block";
import { PasskeysBlock } from "./passkeys-block";
import { buildSecurityCapabilities, type SecurityAccountRecord } from "./security-capabilities";
import { TwoFactorBlock } from "./two-factor-block";

function readErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (typeof record.error === "string") return record.error;
    if (typeof record.message === "string") return record.message;
  }

  return fallback;
}

export function SecuritySettingsClient() {
  const { user, isLoaded } = useUser();
  const [accounts, setAccounts] = useState<SecurityAccountRecord[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const authProvider = process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? "better-auth";
  const isBetterAuth = authProvider === "better-auth";

  const refreshSecurityState = useCallback(async () => {
    if (!isBetterAuth) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [accountsResponse, sessionsResponse] = await Promise.all([
        fetch("/api/auth/list-accounts", { credentials: "include" }),
        fetch("/api/auth/list-sessions", { credentials: "include" }),
      ]);

      const accountsPayload = await accountsResponse.json().catch(() => null);
      const sessionsPayload = await sessionsResponse.json().catch(() => null);

      if (!accountsResponse.ok) {
        throw new Error(
          readErrorMessage(accountsPayload, "Failed to load linked sign-in methods."),
        );
      }

      if (!sessionsResponse.ok) {
        throw new Error(readErrorMessage(sessionsPayload, "Failed to load active sessions."));
      }

      setAccounts(
        Array.isArray(accountsPayload) ? (accountsPayload as SecurityAccountRecord[]) : [],
      );
      setSessions(Array.isArray(sessionsPayload) ? (sessionsPayload as ActiveSession[]) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load security settings.");
    } finally {
      setLoading(false);
    }
  }, [isBetterAuth]);

  useEffect(() => {
    void refreshSecurityState();
  }, [refreshSecurityState]);

  const capabilities = useMemo(
    () => buildSecurityCapabilities({ accounts, authProvider }),
    [accounts, authProvider],
  );

  if (!isLoaded) {
    return <div className="text-sm text-[var(--neutral-11)]">Loading security settings…</div>;
  }

  if (!isBetterAuth) {
    return (
      <div className="space-y-6">
        <section className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
          <h2 className="text-lg font-semibold text-[var(--neutral-12)]">Security</h2>
          <p className="mt-2 text-sm text-[var(--neutral-11)]">
            This workspace is using {authProvider}. Advanced security controls are still being
            migrated into the shared Nebutra auth layer.
          </p>
          <p className="mt-3 text-sm text-[var(--neutral-11)]">
            For now, manage password resets, MFA, and session policies from your auth provider
            dashboard.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
        <h2 className="text-lg font-semibold text-[var(--neutral-12)]">Security</h2>
        <p className="mt-1 text-sm text-[var(--neutral-11)]">
          Signed in as{" "}
          <span className="font-medium text-[var(--neutral-12)]">{user?.email || "—"}</span>
        </p>
        <p className="mt-2 text-sm text-[var(--neutral-11)]">
          Nebutra shows every security capability in one place, only enabling controls that the
          current auth layer can execute safely.
        </p>
      </section>

      {error && (
        <section className="rounded-lg border border-red-200 bg-red-50/60 p-4 text-sm text-red-700">
          {error}
        </section>
      )}

      <ChangePasswordForm capability={capabilities.password} loading={loading} />

      <ConnectedAccountsBlock capability={capabilities.connectedAccounts} loading={loading} />

      <PasskeysBlock capability={capabilities.passkeys} />

      <TwoFactorBlock capability={capabilities.twoFactor} />

      <ActiveSessionsBlock
        capability={capabilities.activeSessions}
        sessions={sessions}
        loading={loading}
        onRefresh={refreshSecurityState}
      />
    </div>
  );
}
