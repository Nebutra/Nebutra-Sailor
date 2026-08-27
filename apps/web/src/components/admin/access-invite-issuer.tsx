"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

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

const issueSchema = z.object({
  count: z.string().refine(
    (value) => {
      const parsed = Number(value);
      return Number.isInteger(parsed) && parsed >= 1 && parsed <= 25;
    },
    { message: "Count must be between 1 and 25." },
  ),
  scope: z.enum(["platform", "tenant"]),
  tenantId: z.string(),
  issuedToEmail: z.string(),
  expiresAt: z.string(),
});
type IssueValues = z.infer<typeof issueSchema>;

export function AccessInviteIssuer() {
  const t = useTranslations("startupOs");
  const [message, setMessage] = useState<string | null>(null);
  const [issued, setIssued] = useState<IssuedInvite[]>([]);
  const [managedInvites, setManagedInvites] = useState<ManagedInvite[]>([]);

  const form = useForm<IssueValues>({
    resolver: zodResolver(issueSchema),
    defaultValues: {
      count: "1",
      scope: "platform",
      tenantId: "",
      issuedToEmail: "",
      expiresAt: "",
    },
  });

  const scope = form.watch("scope");
  const pending = form.formState.isSubmitting;

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

  async function handleSubmit(values: IssueValues) {
    setMessage(null);
    setIssued([]);

    const body = {
      count: Number(values.count ?? 1),
      scope: values.scope,
      tenantId: values.scope === "tenant" ? String(values.tenantId ?? "") : undefined,
      issuedToEmail: String(values.issuedToEmail ?? "") || undefined,
      expiresAt: String(values.expiresAt ?? "") || undefined,
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
    <section className="mt-6 rounded-[var(--radius-3xl)] border border-border bg-background p-4 shadow-sm sm:p-6">
      <div>
        <p className="font-medium text-sm text-muted-foreground uppercase tracking-[0.18em]">
          Access gate
        </p>
        <h2 className="mt-2 font-semibold text-2xl text-foreground">
          Issue cold-start invite codes
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Generate bounded invite codes for invite-only signup. Codes are returned once, then only
          their hashes are stored.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="mt-5 grid gap-3 lg:grid-cols-5">
          <FormField
            control={form.control}
            name="count"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs font-medium text-muted-foreground">Count</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min={1}
                    max={25}
                    className="mt-1 w-full rounded-[var(--radius-lg)] border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="scope"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs font-medium text-muted-foreground">Scope</FormLabel>
                <Select name="scope" value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="mt-1 w-full rounded-[var(--radius-lg)] border border-border bg-background px-3 py-2 text-sm text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="platform">Platform</SelectItem>
                    <SelectItem value="tenant">Tenant</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tenantId"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs font-medium text-muted-foreground">
                  Tenant ID
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled={scope !== "tenant"}
                    placeholder="org_..."
                    className="mt-1 w-full rounded-[var(--radius-lg)] border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-50"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="issuedToEmail"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs font-medium text-muted-foreground">
                  Email lock
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    placeholder="optional"
                    className="mt-1 w-full rounded-[var(--radius-lg)] border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="expiresAt"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs font-medium text-muted-foreground">
                  Expires at
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="datetime-local"
                    className="mt-1 w-full rounded-[var(--radius-lg)] border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-end gap-3 lg:col-span-5">
            <button
              type="submit"
              disabled={pending}
              className="rounded-[var(--radius-lg)] bg-[color:hsl(var(--primary))] px-3 py-2 font-medium text-[hsl(var(--background))] text-sm disabled:opacity-50"
            >
              {pending ? "Issuing..." : "Issue invite codes"}
            </button>
            {message ? (
              <p role="status" className="text-sm text-muted-foreground">
                {message}
              </p>
            ) : null}
          </div>
        </form>
      </Form>

      {issued.length > 0 ? (
        <div className="mt-4 rounded-[var(--radius-2xl)] border border-border bg-muted p-3">
          <ul className="space-y-2">
            {issued.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-lg)] bg-background px-3 py-2"
              >
                <div className="min-w-0">
                  <code className="font-mono text-foreground text-sm">{invite.code}</code>
                  <p className="mt-1 truncate font-mono text-muted-foreground text-xs">
                    {invite.inviteUrl}
                  </p>
                </div>
                <span className="shrink-0 text-muted-foreground text-xs">
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

      <div className="mt-4 rounded-[var(--radius-2xl)] border border-border bg-muted p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-medium text-foreground text-sm">Recent access invites</h3>
          <button
            type="button"
            onClick={() => void loadManagedInvites()}
            className="rounded-[var(--radius-md)] border border-border px-2 py-1 text-muted-foreground text-xs"
          >
            Refresh
          </button>
        </div>
        {managedInvites.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("emptyState.accessInvites")}</p>
        ) : (
          <ul className="space-y-2">
            {managedInvites.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-lg)] bg-background px-3 py-2"
              >
                <div className="min-w-0">
                  <code className="font-mono text-foreground text-sm">{invite.prefix}</code>
                  <p className="mt-1 truncate text-muted-foreground text-xs">
                    {invite.issuedToEmail ?? "unbound"} · {invite.scope}
                    {invite.tenantId ? ` · ${invite.tenantId}` : ""} · redeemed{" "}
                    {invite.redemptionCount}/{invite.maxRedemptions}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">{invite.status}</span>
                  {invite.status === "active" ? (
                    <button
                      type="button"
                      onClick={() => void revokeInvite(invite.id)}
                      className="rounded-[var(--radius-md)] border border-border px-2 py-1 text-muted-foreground text-xs"
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
