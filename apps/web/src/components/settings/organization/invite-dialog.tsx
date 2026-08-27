"use client";

/**
 * Invite-member dialog — phase 2.5.
 *
 * Posts to `/api/organizations/[orgId]/members`. Uses DS Dialog for focus trap,
 * Escape handling, and overlay a11y (UI-03).
 */

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormField,
  Input,
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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle id={titleId}>{t("title")}</DialogTitle>
          <DialogDescription className="sr-only">{t("title")}</DialogDescription>
        </DialogHeader>

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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={formState.isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="ink"
                disabled={formState.isSubmitting || emailValue.trim().length === 0}
              >
                {t("send")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
