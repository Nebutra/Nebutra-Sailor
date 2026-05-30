"use client";

/**
 * Invite-member dialog — phase 2.5.
 *
 * Lightweight modal for inviting a new member to the active organization.
 * Posts to `/api/organizations/[orgId]/members` (existing route). Kept as a
 * simple dialog (no Radix Portal) to stay test-friendly and avoid pulling in
 * a heavier component for a single use site; can be migrated later.
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { Cross as X } from "@nebutra/icons";
import { Button, Input } from "@nebutra/ui/components";
import {
  Form,
  FormField,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useEffect, useId } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const ROLES = ["admin", "member", "viewer"] as const;
type Role = (typeof ROLES)[number];

const inviteSchema = z.object({
  email: z.string().trim().min(1).email(),
  role: z.enum(ROLES),
});
type InviteValues = z.infer<typeof inviteSchema>;

interface InviteDialogProps {
  orgId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InviteDialog({ orgId, open, onClose, onSuccess }: InviteDialogProps) {
  const t = useTranslations("settings.organization.invite");
  const titleId = useId();

  const form = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "member" },
  });

  const { reset, setError, clearErrors, formState, watch } = form;
  const rootErrorMessage = formState.errors.root?.message;
  const emailValue = watch("email");

  useEffect(() => {
    if (open) {
      reset({ email: "", role: "member" });
    }
  }, [open, reset]);

  if (!open) return null;

  async function onSubmit(values: InviteValues) {
    clearErrors("root");

    try {
      const response = await fetch(`/api/organizations/${orgId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: values.email.trim().toLowerCase(), role: values.role }),
      });
      if (!response.ok) {
        setError("root", { message: t("error") });
        return;
      }
      onSuccess();
      onClose();
    } catch {
      setError("root", { message: t("error") });
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-neutral-7 bg-neutral-1 p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-base font-semibold text-neutral-12">
            {t("title")}
          </h2>
          <button
            type="button"
            aria-label={t("title")}
            onClick={onClose}
            className="rounded-[var(--radius-md)] p-1 text-neutral-11 transition-colors hover:bg-neutral-2"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <div className="space-y-1.5">
                  <label
                    htmlFor={`${titleId}-email`}
                    className="block text-xs font-medium text-neutral-11"
                  >
                    {t("emailLabel")}
                  </label>
                  <Input
                    {...field}
                    id={`${titleId}-email`}
                    type="email"
                    required
                    autoFocus
                    aria-label={t("emailLabel")}
                  />
                </div>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <div className="space-y-1.5">
                  <label
                    htmlFor={`${titleId}-role`}
                    className="block text-xs font-medium text-neutral-11"
                  >
                    {t("roleLabel")}
                  </label>
                  <Select
                    name={field.name}
                    value={field.value}
                    onValueChange={(value) => field.onChange(value as Role)}
                  >
                    <SelectTrigger id={`${titleId}-role`} aria-label={t("roleLabel")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            />

            {rootErrorMessage && (
              <p
                role="alert"
                className="rounded-[var(--radius-sm)] bg-[color:var(--status-danger)]/10 px-3 py-2 text-xs text-[color:var(--status-danger)]"
              >
                {rootErrorMessage}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button htmlType="button" onClick={onClose} disabled={formState.isSubmitting}>
                Cancel
              </Button>
              <Button
                htmlType="submit"
                disabled={formState.isSubmitting || emailValue.trim().length === 0}
              >
                {t("send")}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
