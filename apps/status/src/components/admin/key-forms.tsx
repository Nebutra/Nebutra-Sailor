"use client";

import { Button, Checkbox, CopyButton, Field, Input } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef, useState } from "react";
import { type ActionState, createKeyAction, revokeKeyAction } from "@/app/admin/actions";
import { FormError } from "./form-error";

/** Create a key; the plaintext is shown once, here, with a copy button. */
export function CreateKeyForm({ scopes }: { scopes: readonly string[] }) {
  const t = useTranslations("admin.keys");
  const [state, action, pending] = useActionState<ActionState, FormData>(createKeyAction, {});
  const form = useRef<HTMLFormElement | null>(null);
  useEffect(() => {
    if (state.key) form.current?.reset();
  }, [state]);

  return (
    <div className="grid gap-4">
      {state.key ? (
        <div
          role="status"
          className="grid gap-2 rounded-lg border border-green-700/40 bg-green-200 p-4"
        >
          <p className="text-sm text-foreground">{t("created")}</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground">
              {state.key}
            </code>
            <CopyButton value={state.key} label={t("copy")} showToast={false} />
          </div>
        </div>
      ) : null}
      <form ref={form} action={action} className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="grid gap-4">
          <FormError state={state.key ? {} : state} />
          <Field label={t("name")} htmlFor="key-name">
            <Input
              id="key-name"
              name="name"
              required
              maxLength={120}
              placeholder={t("namePlaceholder")}
            />
          </Field>
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium text-foreground">{t("scopes")}</legend>
            <div className="mt-1 flex flex-wrap gap-x-5 gap-y-2">
              {scopes.map((s) => (
                <Checkbox key={s} name="scopes" value={s} defaultChecked={s === "status:read"}>
                  {t(`scope_${s}` as "scope_status:read")}
                  <span className="ml-1.5 font-mono text-xs text-muted-foreground">{s}</span>
                </Checkbox>
              ))}
            </div>
          </fieldset>
        </div>
        <Button type="submit" variant="ink" disabled={pending}>
          {t("create")}
        </Button>
      </form>
    </div>
  );
}

/** Two-step revoke: the first click arms, the second revokes. */
export function RevokeKeyButton({ id }: { id: string }) {
  const t = useTranslations("admin.keys");
  const [armed, setArmed] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(revokeKeyAction, {});
  if (!armed) {
    return (
      <Button type="button" size="sm" variant="ghost" onClick={() => setArmed(true)}>
        {t("revoke")}
      </Button>
    );
  }
  return (
    <form action={action} className="inline-flex items-center gap-2">
      <input data-allow-native type="hidden" name="id" value={id} />
      {state.error ? <FormError state={state} /> : null}
      <Button type="submit" size="sm" variant="destructive" disabled={pending}>
        {t("revokeConfirm")}
      </Button>
    </form>
  );
}
