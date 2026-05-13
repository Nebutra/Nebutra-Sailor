"use client";

/**
 * Invite-member dialog — phase 2.5.
 *
 * Lightweight modal for inviting a new member to the active organization.
 * Posts to `/api/organizations/[orgId]/members` (existing route). Kept as a
 * simple dialog (no Radix Portal) to stay test-friendly and avoid pulling in
 * a heavier component for a single use site; can be migrated later.
 */

import { Button, Input } from "@nebutra/ui/components";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";

type Role = "admin" | "member" | "viewer";

interface InviteDialogProps {
  orgId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InviteDialog({ orgId, open, onClose, onSuccess }: InviteDialogProps) {
  const t = useTranslations("settings.organization.invite");
  const titleId = useId();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setEmail("");
      setRole("member");
      setErrorMessage(null);
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/organizations/${orgId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim().toLowerCase(), role }),
      });
      if (!response.ok) {
        setErrorMessage(t("error"));
        return;
      }
      onSuccess();
      onClose();
    } catch {
      setErrorMessage(t("error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-md rounded-lg border border-neutral-7 bg-neutral-1 p-5 shadow-xl dark:border-white/10 dark:bg-neutral-12">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-base font-semibold text-neutral-12 dark:text-white">
            {t("title")}
          </h2>
          <button
            type="button"
            aria-label={t("title")}
            onClick={onClose}
            className="rounded-md p-1 text-neutral-11 transition-colors hover:bg-neutral-2 dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor={`${titleId}-email`}
              className="block text-xs font-medium text-neutral-11 dark:text-white/70"
            >
              {t("emailLabel")}
            </label>
            <Input
              id={`${titleId}-email`}
              name="email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setEmail(event.target.value)
              }
              aria-label={t("emailLabel")}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor={`${titleId}-role`}
              className="block text-xs font-medium text-neutral-11 dark:text-white/70"
            >
              {t("roleLabel")}
            </label>
            <select
              id={`${titleId}-role`}
              name="role"
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
              className="h-9 w-full rounded-md border border-neutral-7 bg-neutral-1 px-2 text-sm text-neutral-12 dark:border-white/10 dark:bg-white/5 dark:text-white"
              aria-label={t("roleLabel")}
            >
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>

          {errorMessage && (
            <p
              role="alert"
              className="rounded-sm bg-[color:var(--status-danger)]/10 px-3 py-2 text-xs text-[color:var(--status-danger)]"
            >
              {errorMessage}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button htmlType="button" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button htmlType="submit" disabled={submitting || email.trim().length === 0}>
              {t("send")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
