"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { resolveAuthErrorKey } from "@/lib/auth/error-catalog";
import type { AuthErrorKey } from "@/lib/auth/error-keys";
import { dicebearAvatarUrl } from "@/lib/avatar";

interface OrganizationInvitationModalProps {
  invitationId: string;
  organizationName: string;
  roleLabel: string;
  logoUrl?: string;
}

type SubmittingState = false | "accept" | "decline";

async function postJson(url: string): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    throw payload ?? { code: "UNKNOWN" };
  }
}

/**
 * Modal-style confirmation card shown to a logged-in user when they open an
 * invitation link. Calls the accept/decline routes and routes the user to the
 * dashboard on success.
 */
export function OrganizationInvitationModal({
  invitationId,
  organizationName,
  roleLabel: role,
  logoUrl,
}: OrganizationInvitationModalProps) {
  const t = useTranslations("organizations.invitation");
  const tErrors = useTranslations("auth.errors");
  const router = useRouter();
  const [submitting, setSubmitting] = useState<SubmittingState>(false);
  const [errorKey, setErrorKey] = useState<AuthErrorKey | null>(null);
  const [declined, setDeclined] = useState(false);

  const knownRoles = new Set(["owner", "admin", "member", "viewer"]);
  const roleLabel = knownRoles.has(role.toLowerCase())
    ? t(`role.${role.toLowerCase()}` as "role.owner" | "role.admin" | "role.member" | "role.viewer")
    : role;

  async function handleAccept() {
    if (submitting) return;
    setSubmitting("accept");
    setErrorKey(null);
    try {
      await postJson(`/api/invitations/${invitationId}/accept`);
      router.push("/");
      router.refresh();
    } catch (error) {
      setErrorKey(resolveAuthErrorKey(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDecline() {
    if (submitting) return;
    setSubmitting("decline");
    setErrorKey(null);
    try {
      await postJson(`/api/invitations/${invitationId}/decline`);
      setDeclined(true);
    } catch (error) {
      setErrorKey(resolveAuthErrorKey(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (declined) {
    return (
      <section
        aria-labelledby="invitation-declined-heading"
        className="mx-auto w-full max-w-md rounded-[var(--radius-2xl)] border border-border bg-background p-6 shadow-sm"
      >
        <h2 id="invitation-declined-heading" className="text-lg font-semibold text-foreground">
          {t("declinedView")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("success")}</p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-6 inline-flex w-full items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--foreground))] px-4 py-2.5 text-sm font-medium text-[hsl(var(--background))] transition hover:opacity-90"
        >
          {t("backToDashboard")}
        </button>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="invitation-heading"
      className="mx-auto w-full max-w-md rounded-[var(--radius-2xl)] border border-border bg-background p-6 shadow-sm"
    >
      <div className="flex items-center gap-3">
        {logoUrl ? (
          // biome-ignore lint/performance/noImgElement: avatar from arbitrary host; next/image needs domain config
          <img
            src={logoUrl}
            alt=""
            className="h-12 w-12 rounded-[var(--radius-lg)] border border-border object-cover"
          />
        ) : (
          <img
            src={dicebearAvatarUrl(organizationName)}
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 rounded-[var(--radius-lg)] border border-border object-cover"
          />
        )}
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{t("title")}</p>
          <p className="truncate text-base font-semibold text-foreground">{organizationName}</p>
        </div>
      </div>

      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]" />
        {t("roleLabel", { role: roleLabel })}
      </div>

      <h2 id="invitation-heading" className="mt-5 text-lg font-semibold text-foreground">
        {t("heading", { organizationName })}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{t("description")}</p>

      {errorKey ? (
        <p
          role="alert"
          className="mt-4 rounded-[var(--radius-lg)] border border-[var(--status-danger)] bg-[var(--status-danger)]/10 px-3 py-2 text-sm text-[color:var(--status-danger)]"
        >
          {tErrors(errorKey)}
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={handleDecline}
          disabled={!!submitting}
          className="inline-flex flex-1 items-center justify-center rounded-[var(--radius-lg)] border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting === "decline" ? t("declining") : t("decline")}
        </button>
        <button
          type="button"
          onClick={handleAccept}
          disabled={!!submitting}
          className="inline-flex flex-1 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--foreground))] px-4 py-2.5 text-sm font-medium text-[hsl(var(--background))] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting === "accept" ? t("accepting") : t("accept")}
        </button>
      </div>
    </section>
  );
}
