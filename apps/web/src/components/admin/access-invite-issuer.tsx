"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";

interface IssuedInvite {
  attributionStatus: "canonical" | "dub" | "failed";
  canonicalInviteUrl: string;
  code: string;
  emailStatus: "sent" | "skipped" | "failed";
  inviteUrl: string;
  id: string;
  prefix: string;
  scope: "platform" | "tenant";
  tenantId: string | null;
  expiresAt: string | null;
}

interface ManagedInvite {
  id: string;
  prefix: string;
  scope: "platform" | "tenant";
  tenantId: string | null;
  issuedToEmail: string | null;
  status: "active" | "redeemed" | "revoked" | "expired";
  redemptionCount: number;
  maxRedemptions: number;
  expiresAt: string | null;
  createdAt: string;
}

export function AccessInviteIssuer() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [issued, setIssued] = useState<IssuedInvite[]>([]);
  const [managedInvites, setManagedInvites] = useState<ManagedInvite[]>([]);
  const [scope, setScope] = useState<"platform" | "tenant">("platform");

  const loadManagedInvites = useCallback(async () => {
    const response = await fetch("/api/admin/access-invites");
    const payload = (await response.json().catch(() => ({}))) as {
      invites?: ManagedInvite[];
    };
    if (response.ok) {
      setManagedInvites(payload.invites ?? []);
    }
  }, []);

  useEffect(() => {
    void loadManagedInvites().catch(() => undefined);
  }, [loadManagedInvites]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setIssued([]);

    const form = new FormData(event.currentTarget);
    const body = {
      count: Number(form.get("count") ?? 1),
      scope,
      tenantId: scope === "tenant" ? String(form.get("tenantId") ?? "") : undefined,
      issuedToEmail: String(form.get("issuedToEmail") ?? "") || undefined,
      expiresAt: String(form.get("expiresAt") ?? "") || undefined,
    };

    try {
      const response = await fetch("/api/admin/access-invites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        invites?: IssuedInvite[];
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to issue invites.");
      }
      setIssued(payload.invites ?? []);
      setMessage("Copy these codes now. Plaintext invite codes are never shown again.");
      await loadManagedInvites().catch(() => undefined);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to issue invites.");
    } finally {
      setPending(false);
    }
  }

  async function revokeInvite(id: string) {
    setMessage(null);
    const response = await fetch("/api/admin/access-invites", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, action: "revoke" }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setMessage(payload.error ?? "Failed to revoke invite.");
      return;
    }
    setMessage("Invite revoked.");
    await loadManagedInvites().catch(() => undefined);
  }

  return (
    <section className="mt-6 rounded-[var(--radius-3xl)] border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-4 shadow-sm sm:p-6">
      <div>
        <p className="font-medium text-sm text-[var(--neutral-10)] uppercase tracking-[0.18em]">
          Access gate
        </p>
        <h2 className="mt-2 font-semibold text-2xl text-[var(--neutral-12)]">
          Issue cold-start invite codes
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-[var(--neutral-11)]">
          Generate bounded invite codes for invite-only signup. Codes are returned once, then only
          their hashes are stored.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 grid gap-3 lg:grid-cols-5">
        <label className="text-xs font-medium text-[var(--neutral-11)]">
          Count
          <input
            data-allow-native
            name="count"
            type="number"
            min={1}
            max={25}
            defaultValue={1}
            className="mt-1 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-2 text-sm text-[var(--neutral-12)]"
          />
        </label>
        <label className="text-xs font-medium text-[var(--neutral-11)]">
          Scope
          <select
            data-allow-native
            name="scope"
            value={scope}
            onChange={(event) => setScope(event.target.value as "platform" | "tenant")}
            className="mt-1 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-2 text-sm text-[var(--neutral-12)]"
          >
            <option value="platform">Platform</option>
            <option value="tenant">Tenant</option>
          </select>
        </label>
        <label className="text-xs font-medium text-[var(--neutral-11)]">
          Tenant ID
          <input
            data-allow-native
            name="tenantId"
            disabled={scope !== "tenant"}
            className="mt-1 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-2 text-sm text-[var(--neutral-12)] disabled:opacity-50"
            placeholder="org_..."
          />
        </label>
        <label className="text-xs font-medium text-[var(--neutral-11)]">
          Email lock
          <input
            data-allow-native
            name="issuedToEmail"
            type="email"
            className="mt-1 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-2 text-sm text-[var(--neutral-12)]"
            placeholder="optional"
          />
        </label>
        <label className="text-xs font-medium text-[var(--neutral-11)]">
          Expires at
          <input
            data-allow-native
            name="expiresAt"
            type="datetime-local"
            className="mt-1 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-2 text-sm text-[var(--neutral-12)]"
          />
        </label>

        <div className="flex items-end gap-3 lg:col-span-5">
          <button
            type="submit"
            disabled={pending}
            className="rounded-[var(--radius-lg)] bg-[color:var(--brand-primary)] px-3 py-2 font-medium text-[var(--neutral-1)] text-sm disabled:opacity-50"
          >
            {pending ? "Issuing..." : "Issue invite codes"}
          </button>
          {message ? (
            <p role="status" className="text-sm text-[var(--neutral-11)]">
              {message}
            </p>
          ) : null}
        </div>
      </form>

      {issued.length > 0 ? (
        <div className="mt-4 rounded-[var(--radius-2xl)] border border-[var(--neutral-7)] bg-[var(--neutral-2)] p-3">
          <ul className="space-y-2">
            {issued.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-lg)] bg-[var(--neutral-1)] px-3 py-2"
              >
                <div className="min-w-0">
                  <code className="font-mono text-[var(--neutral-12)] text-sm">{invite.code}</code>
                  <p className="mt-1 truncate font-mono text-[var(--neutral-10)] text-xs">
                    {invite.inviteUrl}
                  </p>
                </div>
                <span className="shrink-0 text-[var(--neutral-10)] text-xs">
                  {invite.scope}
                  {invite.attributionStatus === "dub" ? " · tracked link" : ""}
                  {invite.attributionStatus === "failed" ? " · link tracking failed" : ""}
                  {invite.emailStatus !== "skipped" ? ` · email ${invite.emailStatus}` : ""}
                  {invite.tenantId ? ` · ${invite.tenantId}` : ""}
                  {invite.expiresAt ? ` · expires ${invite.expiresAt}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 rounded-[var(--radius-2xl)] border border-[var(--neutral-7)] bg-[var(--neutral-2)] p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-medium text-[var(--neutral-12)] text-sm">Recent access invites</h3>
          <button
            type="button"
            onClick={() => void loadManagedInvites()}
            className="rounded-[var(--radius-md)] border border-[var(--neutral-7)] px-2 py-1 text-[var(--neutral-11)] text-xs"
          >
            Refresh
          </button>
        </div>
        {managedInvites.length === 0 ? (
          <p className="text-[var(--neutral-10)] text-sm">No access invites issued yet.</p>
        ) : (
          <ul className="space-y-2">
            {managedInvites.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-lg)] bg-[var(--neutral-1)] px-3 py-2"
              >
                <div className="min-w-0">
                  <code className="font-mono text-[var(--neutral-12)] text-sm">
                    {invite.prefix}
                  </code>
                  <p className="mt-1 truncate text-[var(--neutral-10)] text-xs">
                    {invite.issuedToEmail ?? "unbound"} · {invite.scope}
                    {invite.tenantId ? ` · ${invite.tenantId}` : ""} · redeemed{" "}
                    {invite.redemptionCount}/{invite.maxRedemptions}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[var(--neutral-10)] text-xs">{invite.status}</span>
                  {invite.status === "active" ? (
                    <button
                      type="button"
                      onClick={() => void revokeInvite(invite.id)}
                      className="rounded-[var(--radius-md)] border border-[var(--neutral-7)] px-2 py-1 text-[var(--neutral-11)] text-xs"
                    >
                      Revoke
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
