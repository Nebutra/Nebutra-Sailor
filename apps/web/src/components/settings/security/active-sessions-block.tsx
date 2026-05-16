"use client";

import { Button } from "@nebutra/ui/components";
import { useEffect, useReducer } from "react";
import { resolveAuthErrorKey } from "@/lib/auth/error-catalog";
import type { AuthErrorKey } from "@/lib/auth/error-keys";
import type { SecurityCapabilities } from "./security-capabilities";

export interface ActiveSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

interface ActiveSessionsBlockProps {
  capability: SecurityCapabilities["activeSessions"];
  sessions: ActiveSession[];
  /** Optional — current session id, marked with "(current)" badge. */
  currentSessionId?: string;
  loading?: boolean;
  onRefresh: () => Promise<void>;
  /** Override for testing — default fetch POST /api/auth/revoke-session. */
  onRevoke?: (sessionId: string) => Promise<void>;
  /** Override for testing — default fetch POST /api/auth/revoke-other-sessions. */
  onRevokeAllOthers?: () => Promise<void>;
}

// Inline i18n strings — the web app does not bundle next-intl into this component
// today, so we keep English-only literals here and align keys with
// packages/platform/i18n/locales/en.json → auth.security.sessions.* and auth.errors.*.
const SESSION_STRINGS = {
  title: "Active sessions",
  description: "Review where your account is signed in and revoke sessions you no longer trust.",
  currentSession: "(current)",
  lastActiveLabel: "Last active",
  revoke: "Sign out",
  revokeAll: "Sign out of all other devices",
  empty: "No other active sessions.",
  successRevoked: "Session signed out.",
  successRevokedAll: "All other sessions signed out.",
  revokeEnabled: "Revoke enabled",
  providerManaged: "Provider managed",
  expiresLabel: "Expires",
  unknownIp: "Unknown IP",
  noSessionsReported: "No active sessions were reported.",
  confirmPrompt: "Are you sure?",
  confirmHelp: "This keeps your current session signed in and signs out every other device.",
  confirm: "Confirm",
  cancel: "Cancel",
  revoking: "Signing out…",
} as const;

// Error catalog mirrors packages/platform/i18n/locales/en.json → auth.errors.*.
// Inline-bundled because @nebutra/i18n is not a runtime dependency of @nebutra/web.
const ERROR_MESSAGES: Record<AuthErrorKey, string> = {
  invalidCredentials: "Email or password is incorrect.",
  userNotFound: "No account found with that email.",
  userAlreadyExists: "An account with that email already exists.",
  weakPassword: "Password is too weak. Use at least 8 characters with mixed case and numbers.",
  passwordsDontMatch: "Passwords don't match.",
  passwordTooShort: "Password must be at least 8 characters.",
  currentPasswordIncorrect: "Current password is incorrect.",
  samePassword: "New password must be different from your current password.",
  invalidEmail: "Email address is not valid.",
  emailNotVerified: "Please verify your email address first.",
  sessionExpired: "Your session has expired. Please sign in again.",
  twoFactorRequired: "Two-factor verification required.",
  invalidVerificationCode: "Verification code is incorrect or expired.",
  twoFactorAlreadyEnabled: "Two-factor authentication is already enabled.",
  twoFactorNotEnabled: "Two-factor authentication is not enabled.",
  tooManyAttempts: "Too many attempts. Please try again later.",
  rateLimited: "You're doing that too often. Slow down.",
  providerNotSupported: "This action is managed by your authentication provider.",
  networkError: "Network error. Check your connection and try again.",
  unknown: "Something went wrong. Please try again.",
};

function resolveErrorMessage(error: unknown): string {
  const key = resolveAuthErrorKey(error);
  return ERROR_MESSAGES[key] ?? ERROR_MESSAGES.unknown;
}

/**
 * Format a timestamp as a relative-time string with sensible thresholds.
 * - <60s          → "just now"
 * - <60min        → "X minutes ago"
 * - <24h          → "X hours ago"
 * - <7d           → "X days ago"
 * - otherwise     → "Mar 5, 14:32" (locale-aware short date)
 *
 * The unit words are intentionally English-only here. When this component is
 * lifted into a next-intl tree we should swap to the `auth.security.sessions.*`
 * keys for "minutes ago", "hours ago", etc.
 */
export function formatRelativeTime(value: string, nowMs: number = Date.now()): string {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "Unknown time";

  const deltaMs = Math.max(0, nowMs - then);
  const seconds = Math.floor(deltaMs / 1000);

  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} ${days === 1 ? "day" : "days"} ago`;
  }

  const date = new Date(then);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAbsolute(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleString();
}

const SUCCESS_DISMISS_MS = 3000;

interface ActiveSessionsState {
  pendingSessionId: string | null;
  revokingAll: boolean;
  confirmingAll: boolean;
  error: string;
  successMessage: string;
}

const INITIAL_ACTIVE_SESSIONS_STATE: ActiveSessionsState = {
  pendingSessionId: null,
  revokingAll: false,
  confirmingAll: false,
  error: "",
  successMessage: "",
};

type ActiveSessionsAction =
  | { type: "confirmAll.open" }
  | { type: "confirmAll.close" }
  | { type: "success.clear" }
  | { type: "revokeOne.start"; sessionId: string }
  | { type: "revokeOne.success"; message: string }
  | { type: "revokeOne.failure"; error: string }
  | { type: "revokeAll.start" }
  | { type: "revokeAll.success"; message: string }
  | { type: "revokeAll.failure"; error: string };

function activeSessionsReducer(
  state: ActiveSessionsState,
  action: ActiveSessionsAction,
): ActiveSessionsState {
  switch (action.type) {
    case "confirmAll.open":
      return { ...state, confirmingAll: true };
    case "confirmAll.close":
      return { ...state, confirmingAll: false };
    case "success.clear":
      return { ...state, successMessage: "" };
    case "revokeOne.start":
      return { ...state, pendingSessionId: action.sessionId, error: "", successMessage: "" };
    case "revokeOne.success":
      return { ...state, pendingSessionId: null, successMessage: action.message };
    case "revokeOne.failure":
      return { ...state, pendingSessionId: null, error: action.error };
    case "revokeAll.start":
      return { ...state, revokingAll: true, error: "", successMessage: "" };
    case "revokeAll.success":
      return {
        ...state,
        revokingAll: false,
        confirmingAll: false,
        successMessage: action.message,
      };
    case "revokeAll.failure":
      return { ...state, revokingAll: false, confirmingAll: false, error: action.error };
  }
}

export function ActiveSessionsBlock({
  capability,
  sessions,
  currentSessionId,
  loading = false,
  onRefresh,
  onRevoke,
  onRevokeAllOthers,
}: ActiveSessionsBlockProps) {
  const [state, dispatch] = useReducer(activeSessionsReducer, INITIAL_ACTIVE_SESSIONS_STATE);

  // Auto-clear success message after a few seconds.
  useEffect(() => {
    if (!state.successMessage) return;
    const timer = setTimeout(() => dispatch({ type: "success.clear" }), SUCCESS_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [state.successMessage]);

  async function defaultRevoke(sessionId: string) {
    const response = await fetch("/api/auth/revoke-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        message?: string;
        code?: string;
      } | null;
      throw payload ?? { code: "UNKNOWN" };
    }
  }

  async function defaultRevokeAllOthers() {
    const response = await fetch("/api/auth/revoke-other-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        message?: string;
        code?: string;
      } | null;
      throw payload ?? { code: "UNKNOWN" };
    }
  }

  async function handleRevoke(sessionId: string) {
    dispatch({ type: "revokeOne.start", sessionId });

    try {
      await (onRevoke ?? defaultRevoke)(sessionId);
      await onRefresh();
      dispatch({ type: "revokeOne.success", message: SESSION_STRINGS.successRevoked });
    } catch (err) {
      dispatch({ type: "revokeOne.failure", error: resolveErrorMessage(err) });
    }
  }

  async function handleRevokeAllOthers() {
    dispatch({ type: "revokeAll.start" });

    try {
      await (onRevokeAllOthers ?? defaultRevokeAllOthers)();
      await onRefresh();
      dispatch({ type: "revokeAll.success", message: SESSION_STRINGS.successRevokedAll });
    } catch (err) {
      dispatch({ type: "revokeAll.failure", error: resolveErrorMessage(err) });
    }
  }

  const otherSessionsCount = sessions.filter((s) => s.id !== currentSessionId).length;
  const showRevokeAll = sessions.length >= 2;
  const showEmpty = sessions.length === 0 || otherSessionsCount === 0;

  return (
    <section className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-sm font-medium text-[var(--neutral-12)]">{SESSION_STRINGS.title}</h3>
          <p className="mt-1 text-sm text-[var(--neutral-11)]">{SESSION_STRINGS.description}</p>
        </div>
        <span className="w-fit rounded-full border border-[var(--neutral-7)] px-2.5 py-1 text-xs font-medium text-[var(--neutral-11)]">
          {capability.available ? SESSION_STRINGS.revokeEnabled : SESSION_STRINGS.providerManaged}
        </span>
      </div>

      {state.error && <p className="mb-4 text-sm text-[hsl(var(--destructive))]">{state.error}</p>}
      {state.successMessage && (
        <p className="mb-4 text-sm text-[var(--status-success,_#10b981)]" role="status">
          {state.successMessage}
        </p>
      )}

      {showRevokeAll && capability.available && (
        <div className="mb-4">
          {state.confirmingAll ? (
            <div
              className="flex flex-col gap-2 rounded-md border border-[var(--neutral-7)] bg-[var(--neutral-2)] p-3 md:flex-row md:items-center md:justify-between"
              role="alertdialog"
            >
              <div>
                <p className="text-sm font-medium text-[var(--neutral-12)]">
                  {SESSION_STRINGS.confirmPrompt}
                </p>
                <p className="mt-1 text-xs leading-5 text-[var(--neutral-10)]">
                  {SESSION_STRINGS.confirmHelp}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  disabled={state.revokingAll}
                  htmlType="button"
                  onClick={() => dispatch({ type: "confirmAll.close" })}
                  variant="outlined"
                >
                  {SESSION_STRINGS.cancel}
                </Button>
                <Button
                  disabled={state.revokingAll}
                  htmlType="button"
                  onClick={handleRevokeAllOthers}
                  variant="filled"
                >
                  {SESSION_STRINGS.confirm}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              disabled={state.revokingAll || otherSessionsCount === 0}
              htmlType="button"
              onClick={() => dispatch({ type: "confirmAll.open" })}
              variant="outlined"
            >
              {SESSION_STRINGS.revokeAll}
            </Button>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((item) => (
            <div
              key={item}
              className="h-20 animate-pulse rounded-lg border border-[var(--neutral-6)] bg-[var(--neutral-2)]"
            />
          ))}
        </div>
      ) : showEmpty ? (
        <p className="text-sm text-[var(--neutral-11)]">{SESSION_STRINGS.empty}</p>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const isCurrent = currentSessionId === session.id;
            return (
              <div
                key={session.id}
                className="flex flex-col gap-4 rounded-lg border border-[var(--neutral-7)] p-4 md:flex-row md:items-start md:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--neutral-12)]">
                    {session.ipAddress || SESSION_STRINGS.unknownIp}
                    {isCurrent && (
                      <span className="ml-2 text-xs font-normal text-[var(--neutral-10)]">
                        {SESSION_STRINGS.currentSession}
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-[var(--neutral-10)]">
                    {SESSION_STRINGS.lastActiveLabel}: {formatRelativeTime(session.updatedAt)}
                  </p>
                  {session.userAgent && (
                    <p className="mt-2 break-words text-xs text-[var(--neutral-11)]">
                      {session.userAgent}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-[var(--neutral-10)]">
                    {SESSION_STRINGS.expiresLabel}: {formatAbsolute(session.expiresAt)}
                  </p>
                </div>

                <Button
                  disabled={
                    !capability.available || isCurrent || state.pendingSessionId === session.id
                  }
                  htmlType="button"
                  onClick={() => handleRevoke(session.id)}
                  variant="outlined"
                >
                  {state.pendingSessionId === session.id
                    ? SESSION_STRINGS.revoking
                    : SESSION_STRINGS.revoke}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-xs leading-5 text-[var(--neutral-10)]">{capability.reason}</p>
    </section>
  );
}
