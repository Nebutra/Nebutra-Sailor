"use client";

import { SettingsSection } from "@nebutra/ui/layout";
import { Button } from "@nebutra/ui/primitives";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useReducer } from "react";
import { resolveAuthErrorKey } from "@/lib/auth/error-catalog";
import type { SecurityCapabilities } from "./security-capabilities";

export interface ActiveSession {
  id: string;
  kind: "web" | "desktop";
  label: string;
  browser?: string | null;
  platform?: string | null;
  deviceType?: "desktop" | "mobile" | "tablet" | "unknown";
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
  expiresAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  isCurrent: boolean;
  canRevoke: boolean;
}

interface ActiveSessionsBlockProps {
  capability: SecurityCapabilities["activeSessions"];
  sessions: ActiveSession[];
  /** Optional — current session id, marked with "(current)" badge. */
  currentSessionId?: string;
  loading?: boolean;
  onRefresh: () => Promise<void>;
  /** Override for testing — default fetch POST /api/auth/device-sessions/revoke. */
  onRevoke?: (sessionId: string, kind: ActiveSession["kind"]) => Promise<void>;
  /** Override for testing — default fetch POST /api/auth/device-sessions/revoke-others. */
  onRevokeAllOthers?: () => Promise<void>;
}

// Inline i18n strings — the web app does not bundle next-intl into this component
// today, so we keep English-only literals here and align keys with
// packages/platform/i18n/locales/en.json → auth.security.sessions.* and auth.errors.*.

function resolveErrorMessage(error: unknown, tErrors: (key: string) => string): string {
  return tErrors(resolveAuthErrorKey(error));
}

/**
 * Exported for tests. Returns the parsed Date or null for invalid input.
 * Formatting now happens inside the component via next-intl useFormatter
 * so that locale + time-zone are sourced from the i18n context.
 */
export function parseSessionDate(value: string): Date | null {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
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
  const tc = useTranslations("copy.securityActiveSessionsBlock");
  const tReasons = useTranslations("copy.securityReasons");
  const ts = useTranslations("copy.securitySessions");
  const tErrors = useTranslations("auth.errors");
  const format = useFormatter();
  const [state, dispatch] = useReducer(activeSessionsReducer, INITIAL_ACTIVE_SESSIONS_STATE);

  // Auto-clear success message after a few seconds.
  useEffect(() => {
    if (!state.successMessage) return;
    const timer = setTimeout(() => dispatch({ type: "success.clear" }), SUCCESS_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [state.successMessage]);

  async function defaultRevoke(sessionId: string, kind: ActiveSession["kind"]) {
    const response = await fetch("/api/auth/device-sessions/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, kind }),
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
    const response = await fetch("/api/auth/device-sessions/revoke-others", {
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

  async function handleRevoke(session: ActiveSession) {
    dispatch({ type: "revokeOne.start", sessionId: session.id });

    try {
      await (onRevoke ?? defaultRevoke)(session.id, session.kind);
      await onRefresh();
      dispatch({ type: "revokeOne.success", message: ts("successRevoked") });
    } catch (err) {
      dispatch({ type: "revokeOne.failure", error: resolveErrorMessage(err, tErrors) });
    }
  }

  async function handleRevokeAllOthers() {
    dispatch({ type: "revokeAll.start" });

    try {
      await (onRevokeAllOthers ?? defaultRevokeAllOthers)();
      await onRefresh();
      dispatch({ type: "revokeAll.success", message: ts("successRevokedAll") });
    } catch (err) {
      dispatch({ type: "revokeAll.failure", error: resolveErrorMessage(err, tErrors) });
    }
  }

  const isCurrentSession = (session: ActiveSession) =>
    session.isCurrent || currentSessionId === session.id;
  const canRevokeSession = (session: ActiveSession) =>
    session.canRevoke && !isCurrentSession(session);
  const otherSessionsCount = sessions.filter((session) => !isCurrentSession(session)).length;
  const canRevokeOtherSessions = sessions.some(canRevokeSession);
  const showRevokeAll = sessions.some(isCurrentSession) && canRevokeOtherSessions;
  const showEmpty = sessions.length === 0 || otherSessionsCount === 0;

  return (
    <SettingsSection
      title={ts("title")}
      description={ts("description")}
      badge={
        <span className="w-fit rounded-full border border-neutral-7 px-2.5 py-1 text-xs font-medium text-neutral-11">
          {capability.available ? ts("revokeEnabled") : ts("providerManaged")}
        </span>
      }
    >
      {state.error && <p className="mb-4 text-sm text-destructive-strong">{state.error}</p>}
      {state.successMessage && (
        <p className="mb-4 text-sm text-success-strong" role="status">
          {state.successMessage}
        </p>
      )}

      {showRevokeAll && capability.available && (
        <div className="mb-4">
          {state.confirmingAll ? (
            <div
              className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-neutral-7 bg-neutral-2 p-3 md:flex-row md:items-center md:justify-between"
              role="alertdialog"
            >
              <div>
                <p className="text-sm font-medium text-neutral-12">{ts("confirmPrompt")}</p>
                <p className="mt-1 text-xs leading-5 text-neutral-10">{ts("confirmHelp")}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  disabled={state.revokingAll}
                  type="button"
                  onClick={() => dispatch({ type: "confirmAll.close" })}
                  variant="outline"
                >
                  {ts("cancel")}
                </Button>
                <Button
                  disabled={state.revokingAll}
                  type="button"
                  onClick={handleRevokeAllOthers}
                  variant="default"
                >
                  {ts("confirm")}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              disabled={state.revokingAll || otherSessionsCount === 0}
              type="button"
              onClick={() => dispatch({ type: "confirmAll.open" })}
              variant="outline"
            >
              {ts("revokeAll")}
            </Button>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((item) => (
            <div
              key={item}
              className="h-20 animate-pulse rounded-[var(--radius-lg)] border border-neutral-6 bg-neutral-2"
            />
          ))}
        </div>
      ) : showEmpty ? (
        <p className="text-sm text-neutral-11">{ts("empty")}</p>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const isCurrent = isCurrentSession(session);
            const lastActiveAt = session.lastActiveAt || session.updatedAt;
            return (
              <div
                key={session.id}
                className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-neutral-7 p-4 md:flex-row md:items-start md:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-neutral-12">
                    {(session.label || session.ipAddress || ts("unknownIp"))
                      .replace("Web browser", ts("webBrowser"))
                      .replace("Unknown platform", ts("unknownPlatform"))}
                    {isCurrent && (
                      <span className="ml-2 text-xs font-normal text-neutral-10">
                        {ts("currentSession")}
                      </span>
                    )}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-10">
                    <span className="rounded-full border border-neutral-7 px-2 py-0.5">
                      {session.kind === "desktop" ? ts("desktopKind") : ts("webKind")}
                    </span>
                    {session.ipAddress && <span>{session.ipAddress}</span>}
                    {session.platform && (
                      <span>
                        {session.platform === "Unknown platform"
                          ? ts("unknownPlatform")
                          : session.platform}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-neutral-10">
                    {ts("lastActiveLabel")}:{" "}
                    {parseSessionDate(lastActiveAt)
                      ? format.relativeTime(parseSessionDate(lastActiveAt) as Date)
                      : tc("unknownTime")}
                  </p>
                  {session.userAgent && (
                    <p className="mt-2 break-words text-xs text-neutral-11">{session.userAgent}</p>
                  )}
                  <p className="mt-2 text-xs text-neutral-10">
                    {ts("expiresLabel")}:{" "}
                    {parseSessionDate(session.expiresAt)
                      ? format.dateTime(parseSessionDate(session.expiresAt) as Date, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : tc("unknownTime")}
                  </p>
                </div>

                <Button
                  disabled={
                    !capability.available ||
                    !canRevokeSession(session) ||
                    state.pendingSessionId === session.id
                  }
                  type="button"
                  onClick={() => handleRevoke(session)}
                  variant="outline"
                >
                  {state.pendingSessionId === session.id ? ts("revoking") : ts("revoke")}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-xs leading-5 text-neutral-10">
        {tReasons(capability.reasonKey, capability.reasonValues)}
      </p>
    </SettingsSection>
  );
}
