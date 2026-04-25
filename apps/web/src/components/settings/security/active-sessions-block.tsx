"use client";

import { Button } from "@nebutra/ui/components";
import { useState } from "react";
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
  loading?: boolean;
  onRefresh: () => Promise<void>;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleString();
}

export function ActiveSessionsBlock({
  capability,
  sessions,
  loading = false,
  onRefresh,
}: ActiveSessionsBlockProps) {
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function revokeSession(sessionId: string) {
    setPendingSessionId(sessionId);
    setError("");

    try {
      const response = await fetch("/api/auth/revoke-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
          message?: string;
        } | null;
        setError(payload?.error || payload?.message || "Failed to revoke session.");
        return;
      }

      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke session.");
    } finally {
      setPendingSessionId(null);
    }
  }

  return (
    <section className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-sm font-medium text-[var(--neutral-12)]">Active sessions</h3>
          <p className="mt-1 text-sm text-[var(--neutral-11)]">
            Review where your account is signed in and revoke sessions you no longer trust.
          </p>
        </div>
        <span className="w-fit rounded-full border border-[var(--neutral-7)] px-2.5 py-1 text-xs font-medium text-[var(--neutral-11)]">
          {capability.available ? "Revoke enabled" : "Provider managed"}
        </span>
      </div>

      {error && <p className="mb-4 text-sm text-[hsl(var(--destructive))]">{error}</p>}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((item) => (
            <div
              key={item}
              className="h-20 animate-pulse rounded-lg border border-[var(--neutral-6)] bg-[var(--neutral-2)]"
            />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-[var(--neutral-11)]">No active sessions were reported.</p>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex flex-col gap-4 rounded-lg border border-[var(--neutral-7)] p-4 md:flex-row md:items-start md:justify-between"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--neutral-12)]">
                  {session.ipAddress || "Unknown IP"}
                </p>
                <p className="mt-1 text-xs text-[var(--neutral-10)]">
                  Last active: {formatDate(session.updatedAt)}
                </p>
                {session.userAgent && (
                  <p className="mt-2 break-words text-xs text-[var(--neutral-11)]">
                    {session.userAgent}
                  </p>
                )}
                <p className="mt-2 text-xs text-[var(--neutral-10)]">
                  Expires: {formatDate(session.expiresAt)}
                </p>
              </div>

              <Button
                disabled={!capability.available || pendingSessionId === session.id}
                htmlType="button"
                onClick={() => revokeSession(session.id)}
                variant="outlined"
              >
                {pendingSessionId === session.id ? "Revoking…" : "Revoke"}
              </Button>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs leading-5 text-[var(--neutral-10)]">{capability.reason}</p>
    </section>
  );
}
