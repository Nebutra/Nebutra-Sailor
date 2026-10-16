"use client";

import { useTranslations } from "next-intl";
import type { ActionState } from "@/app/admin/actions";

const KNOWN = new Set([
  "invalid_credentials",
  "setup_token_invalid",
  "already_set_up",
  "setup_disabled",
  "invalid_input",
  "forbidden",
  "not_found",
  "rate_limited",
]);

/** An action's error in the reader's language, announced to screen readers. */
export function FormError({ state }: { state: ActionState }) {
  const t = useTranslations("admin.errors");
  if (!state.error) return null;
  const { code, detail = "" } = state.error;
  const text = KNOWN.has(code)
    ? t(code as "invalid_input", { detail })
    : t("generic", { detail: code });
  return (
    <p
      role="alert"
      className="rounded-md border border-red-700/40 bg-red-200 px-3 py-2 text-sm text-foreground"
    >
      {text}
    </p>
  );
}
