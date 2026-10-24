"use client";

import { Button, Field, Select, Textarea } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef } from "react";
import { type ActionState, updateIncidentAction } from "@/app/admin/actions";
import { INCIDENT_STATUSES, messageFieldName, nextStatus } from "@/lib/admin-form";
import type { AppLocale } from "@/lib/locale";
import { FormError } from "./form-error";

const LOCALE_NAMES: Record<AppLocale, string> = { "zh-CN": "中文", en: "English" };

/** Post an update (status + message per language), or resolve in one click. */
export function UpdateForm({
  page,
  id,
  kind,
  status,
  locales,
}: {
  page: string;
  id: string;
  kind: "incident" | "maintenance";
  status: string;
  locales: AppLocale[];
}) {
  const t = useTranslations();
  const [state, action, pending] = useActionState<ActionState, FormData>(updateIncidentAction, {});
  const form = useRef<HTMLFormElement | null>(null);
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state]);
  const closed = status === "resolved";

  return (
    <div className="grid gap-4">
      {closed ? <p className="text-sm text-muted-foreground">{t("admin.update.closed")}</p> : null}
      <form ref={form} action={action} className="grid gap-4">
        <input data-allow-native type="hidden" name="page" value={page} />
        <input data-allow-native type="hidden" name="id" value={id} />
        <input data-allow-native type="hidden" name="kind" value={kind} />
        <FormError state={state} />
        <Field label={t("admin.form.status")} htmlFor="update-status">
          <Select
            id="update-status"
            name="status"
            defaultValue={closed ? "monitoring" : nextStatus(status)}
            options={INCIDENT_STATUSES.map((s) => ({ value: s, label: t(`incidentStatus.${s}`) }))}
          />
        </Field>
        {locales.map((l, i) => (
          <Field
            key={l}
            label={t("admin.form.message", { locale: LOCALE_NAMES[l] })}
            htmlFor={`update-${messageFieldName(l)}`}
            {...(i > 0 ? { description: t("admin.form.messageOptional") } : {})}
          >
            <Textarea
              id={`update-${messageFieldName(l)}`}
              name={messageFieldName(l)}
              rows={3}
              lang={l}
            />
          </Field>
        ))}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" name="intent" value="update" variant="ink" disabled={pending}>
            {t("admin.update.submit")}
          </Button>
          {closed ? null : (
            <Button
              type="submit"
              name="intent"
              value="resolve"
              variant="outline"
              disabled={pending}
              formNoValidate
              title={t("admin.update.resolveHint")}
            >
              {t("admin.update.resolve")}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
