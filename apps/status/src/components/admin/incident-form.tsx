"use client";

import { Button, Checkbox, Field, Input, Select, Textarea } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { type ActionState, createIncidentAction } from "@/app/admin/actions";
import {
  INCIDENT_STATUSES,
  localInputToIso,
  messageFieldName,
  titleFieldName,
} from "@/lib/admin-form";
import type { AppLocale } from "@/lib/locale";
import { FormError } from "./form-error";

const LOCALE_NAMES: Record<AppLocale, string> = { "zh-CN": "中文", en: "English" };
const IMPACTS = ["none", "minor", "major", "critical"] as const;

/** New incident or maintenance window. Messages are written once per page language. */
export function IncidentForm({
  page,
  locales,
  components,
}: {
  page: string;
  locales: AppLocale[];
  components: Array<{ key: string; name: string; group: string | null }>;
}) {
  const t = useTranslations();
  const [state, action, pending] = useActionState<ActionState, FormData>(createIncidentAction, {});
  const [kind, setKind] = useState<"incident" | "maintenance">("incident");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  return (
    <form action={action} className="grid gap-6">
      <input data-allow-native type="hidden" name="page" value={page} />
      <input
        data-allow-native
        type="hidden"
        name="scheduledStart"
        value={localInputToIso(start) ?? ""}
      />
      <input
        data-allow-native
        type="hidden"
        name="scheduledEnd"
        value={localInputToIso(end) ?? ""}
      />
      <FormError state={state} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("admin.form.kind")} htmlFor="kind">
          <Select
            id="kind"
            name="kind"
            value={kind}
            onValueChange={(v) => setKind(v === "maintenance" ? "maintenance" : "incident")}
            options={[
              { value: "incident", label: t("admin.form.kindIncident") },
              { value: "maintenance", label: t("admin.form.kindMaintenance") },
            ]}
          />
        </Field>
        <Field label={t("admin.form.impact")} htmlFor="impact">
          <Select
            id="impact"
            name="impact"
            defaultValue="minor"
            options={IMPACTS.map((i) => ({ value: i, label: t(`impact.${i}`) }))}
          />
        </Field>
        {kind === "incident" ? (
          <Field label={t("admin.form.status")} htmlFor="status">
            <Select
              id="status"
              name="status"
              defaultValue="investigating"
              options={INCIDENT_STATUSES.filter((s) => s !== "resolved").map((s) => ({
                value: s,
                label: t(`incidentStatus.${s}`),
              }))}
            />
          </Field>
        ) : null}
      </div>

      {locales.map((l, i) => (
        <Field
          key={l}
          label={t("admin.form.titleIn", { locale: LOCALE_NAMES[l] })}
          htmlFor={titleFieldName(l)}
          {...(i > 0 ? { description: t("admin.form.messageOptional") } : {})}
        >
          <Input
            id={titleFieldName(l)}
            name={titleFieldName(l)}
            required={i === 0}
            maxLength={200}
            lang={l}
            {...(i === 0 ? { placeholder: t("admin.form.titlePlaceholder") } : {})}
          />
        </Field>
      ))}

      {kind === "maintenance" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t("admin.form.windowStart")}
            htmlFor="start"
            description={t("admin.form.windowHint")}
          >
            <Input
              id="start"
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              required
            />
          </Field>
          <Field label={t("admin.form.windowEnd")} htmlFor="end">
            <Input
              id="end"
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              required
            />
          </Field>
        </div>
      ) : null}

      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium text-foreground">
          {t("admin.form.components")}
        </legend>
        <p className="text-sm text-muted-foreground">{t("admin.form.componentsHint")}</p>
        <div className="mt-1 grid gap-2.5 sm:grid-cols-2">
          {components.map((c) => (
            <Checkbox key={c.key} name="components" value={c.key}>
              {c.name}
              {c.group ? <span className="ml-1.5 text-muted-foreground">{c.group}</span> : null}
            </Checkbox>
          ))}
        </div>
      </fieldset>

      {locales.map((l, i) => (
        <Field
          key={l}
          label={t("admin.form.message", { locale: LOCALE_NAMES[l] })}
          htmlFor={messageFieldName(l)}
          description={i === 0 ? t("admin.form.messageHint") : t("admin.form.messageOptional")}
        >
          <Textarea
            id={messageFieldName(l)}
            name={messageFieldName(l)}
            rows={4}
            required={i === 0}
            lang={l}
          />
        </Field>
      ))}

      <div className="flex items-center gap-3">
        <Button type="submit" variant="ink" disabled={pending}>
          {t("admin.form.submit")}
        </Button>
        <a
          href={`/admin/incidents?page=${page}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {t("admin.form.cancel")}
        </a>
      </div>
    </form>
  );
}
