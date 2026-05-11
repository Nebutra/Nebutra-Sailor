"use client";

// Use the /client subpath for both — the root entrypoint transitively
// imports server-only middleware (Clerk's server SDK), which webpack
// rejects when reached from a "use client" boundary.
import { isAuthFeatureEnabledSync, useUser } from "@nebutra/auth/client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { type ActiveSession, ActiveSessionsBlock } from "./active-sessions-block";
import { ChangePasswordForm } from "./change-password-form";
import { ConnectedAccountsBlock } from "./connected-accounts-block";
import { DeleteAccountForm } from "./delete-account-form";
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
  const router = useRouter();
  const [accounts, setAccounts] = useState<SecurityAccountRecord[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

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
      const [accountsResponse, sessionsResponse, twoFactorResponse, currentSessionResponse] =
        await Promise.all([
          fetch("/api/auth/list-accounts", { credentials: "include" }),
          fetch("/api/auth/list-sessions", { credentials: "include" }),
          fetch("/api/auth/two-factor-status", { credentials: "include" }),
          fetch("/api/auth/current-session", { credentials: "include" }),
        ]);

      const accountsPayload = await accountsResponse.json().catch(() => null);
      const sessionsPayload = await sessionsResponse.json().catch(() => null);
      const twoFactorPayload = await twoFactorResponse.json().catch(() => null);
      const currentSessionPayload = await currentSessionResponse.json().catch(() => null);

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

      // 2FA + current session are non-blocking: if either endpoint errors, we
      // fall back to the safe defaults so the rest of the page still renders.
      if (twoFactorResponse.ok && twoFactorPayload && typeof twoFactorPayload === "object") {
        const enabled = (twoFactorPayload as { enabled?: unknown }).enabled;
        setTwoFactorEnabled(typeof enabled === "boolean" ? enabled : false);
      } else {
        setTwoFactorEnabled(false);
      }

      if (
        currentSessionResponse.ok &&
        currentSessionPayload &&
        typeof currentSessionPayload === "object"
      ) {
        const sessionId = (currentSessionPayload as { sessionId?: unknown }).sessionId;
        setCurrentSessionId(typeof sessionId === "string" ? sessionId : null);
      } else {
        setCurrentSessionId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load security settings.");
    } finally {
      setLoading(false);
    }
  }, [isBetterAuth]);

  useEffect(() => {
    void refreshSecurityState();
  }, [refreshSecurityState]);

  // Phase 2.4 dev rollout gates — read once at render via the sync flag layer.
  // Env-only resolution keeps this SSR/RSC-safe; prod rollout switches to
  // `@nebutra/feature-flags` via the async sibling, but the security area
  // renders top-down so the sync read is sufficient here.
  const passkeysFlag = isAuthFeatureEnabledSync("passkeys");
  const twoFactorFlag = isAuthFeatureEnabledSync("twoFactor");

  const capabilities = useMemo(
    () =>
      buildSecurityCapabilities({
        accounts,
        authProvider,
        featureFlags: { passkeys: passkeysFlag, twoFactor: twoFactorFlag },
      }),
    [accounts, authProvider, passkeysFlag, twoFactorFlag],
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

      <TwoFactorBlock
        capability={capabilities.twoFactor}
        enabled={twoFactorEnabled}
        onChanged={refreshSecurityState}
      />

      <ActiveSessionsBlock
        capability={capabilities.activeSessions}
        sessions={sessions}
        loading={loading}
        onRefresh={refreshSecurityState}
        currentSessionId={currentSessionId ?? undefined}
      />

      <DeleteAccountForm
        available={capabilities.password.hasPasswordAccount}
        onDeleted={() => router.push("/")}
      />
    </div>
  );
}
