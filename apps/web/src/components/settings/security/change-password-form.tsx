"use client";

import { Button } from "@nebutra/ui/components";
import { Input } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { type FormEvent, useReducer } from "react";
import { resolveAuthErrorKey } from "@/lib/auth/error-catalog";
import type { AuthErrorKey } from "@/lib/auth/error-keys";
import type { SecurityCapabilities } from "./security-capabilities";

const MIN_PASSWORD_LENGTH = 8;

export interface ChangePasswordSubmitInput {
  currentPassword: string;
  newPassword: string;
  revokeOtherSessions: boolean;
}

interface ChangePasswordFormProps {
  capability: SecurityCapabilities["password"];
  /** Optional override for testing — defaults to fetch POST /api/auth/change-password */
  onSubmit?: (input: ChangePasswordSubmitInput) => Promise<void>;
  /** When true, the parent is still resolving capabilities; show a skeleton. */
  loading?: boolean;
}

async function defaultSubmit(input: ChangePasswordSubmitInput): Promise<void> {
  const response = await fetch("/api/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    throw payload ?? { code: "UNKNOWN" };
  }
}

interface ChangePasswordState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  revokeOtherSessions: boolean;
  errorKey: AuthErrorKey | null;
  success: boolean;
  pending: boolean;
}

const INITIAL_CHANGE_PASSWORD_STATE: ChangePasswordState = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
  revokeOtherSessions: true,
  errorKey: null,
  success: false,
  pending: false,
};

type ChangePasswordAction =
  | { type: "field.currentPassword"; value: string }
  | { type: "field.newPassword"; value: string }
  | { type: "field.confirmPassword"; value: string }
  | { type: "field.revokeOtherSessions"; value: boolean }
  | { type: "submit.start" }
  | { type: "submit.validationError"; errorKey: AuthErrorKey }
  | { type: "submit.success" }
  | { type: "submit.failure"; errorKey: AuthErrorKey };

function changePasswordReducer(
  state: ChangePasswordState,
  action: ChangePasswordAction,
): ChangePasswordState {
  switch (action.type) {
    case "field.currentPassword":
      return { ...state, currentPassword: action.value };
    case "field.newPassword":
      return { ...state, newPassword: action.value };
    case "field.confirmPassword":
      return { ...state, confirmPassword: action.value };
    case "field.revokeOtherSessions":
      return { ...state, revokeOtherSessions: action.value };
    case "submit.start":
      return { ...state, errorKey: null, success: false, pending: true };
    case "submit.validationError":
      return { ...state, errorKey: action.errorKey, success: false, pending: false };
    case "submit.success":
      return {
        ...state,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        errorKey: null,
        success: true,
        pending: false,
      };
    case "submit.failure":
      return { ...state, errorKey: action.errorKey, success: false, pending: false };
  }
}

export function ChangePasswordForm({
  capability,
  onSubmit,
  loading = false,
}: ChangePasswordFormProps) {
  const t = useTranslations("auth.security.changePassword");
  const tErrors = useTranslations("auth.errors");

  const [state, dispatch] = useReducer(changePasswordReducer, INITIAL_CHANGE_PASSWORD_STATE);

  if (loading) {
    return (
      <section className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-sm font-medium text-[var(--neutral-12)]">Password</h3>
            <p className="mt-1 text-sm text-[var(--neutral-11)]">
              Check whether this account has a credential sign-in method and explain the safest
              supported password path.
            </p>
          </div>
        </div>
        <p className="text-sm text-[var(--neutral-11)]">Loading password capabilities…</p>
      </section>
    );
  }

  if (!capability.hasPasswordAccount) {
    return (
      <section className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-sm font-medium text-[var(--neutral-12)]">Password</h3>
            <p className="mt-1 text-sm text-[var(--neutral-11)]">
              Check whether this account has a credential sign-in method and explain the safest
              supported password path.
            </p>
          </div>
          <span className="w-fit rounded-full border border-[var(--neutral-7)] px-2.5 py-1 text-xs font-medium text-[var(--neutral-11)]">
            OAuth only
          </span>
        </div>

        <p className="text-sm text-[var(--neutral-11)]">{capability.reason}</p>
      </section>
    );
  }

  function validate(): AuthErrorKey | null {
    if (state.newPassword.length < MIN_PASSWORD_LENGTH) return "passwordTooShort";
    if (state.newPassword !== state.confirmPassword) return "passwordsDontMatch";
    if (state.newPassword === state.currentPassword) return "samePassword";
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    dispatch({ type: "submit.start" });

    const validationError = validate();
    if (validationError) {
      dispatch({ type: "submit.validationError", errorKey: validationError });
      return;
    }

    try {
      const submit = onSubmit ?? defaultSubmit;
      await submit({
        currentPassword: state.currentPassword,
        newPassword: state.newPassword,
        revokeOtherSessions: state.revokeOtherSessions,
      });
      dispatch({ type: "submit.success" });
    } catch (error) {
      dispatch({ type: "submit.failure", errorKey: resolveAuthErrorKey(error) });
    }
  }

  const errorId = "change-password-error";
  const successId = "change-password-success";
  const errorMessage = state.errorKey ? tErrors(state.errorKey) : null;

  return (
    <section className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-sm font-medium text-[var(--neutral-12)]">{t("title")}</h3>
          <p className="mt-1 text-sm text-[var(--neutral-11)]">{t("description")}</p>
        </div>
        <span className="w-fit rounded-full border border-[var(--neutral-7)] px-2.5 py-1 text-xs font-medium text-[var(--neutral-11)]">
          Credential attached
        </span>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="space-y-1.5">
          <label
            className="block text-sm font-medium text-[var(--neutral-12)]"
            htmlFor="change-password-current"
          >
            {t("currentPasswordLabel")}
          </label>
          <Input
            aria-describedby={errorMessage ? errorId : undefined}
            aria-invalid={Boolean(errorMessage)}
            autoComplete="current-password"
            id="change-password-current"
            name="currentPassword"
            onChange={(event) =>
              dispatch({ type: "field.currentPassword", value: event.target.value })
            }
            required
            type="password"
            value={state.currentPassword}
          />
        </div>

        <div className="space-y-1.5">
          <label
            className="block text-sm font-medium text-[var(--neutral-12)]"
            htmlFor="change-password-new"
          >
            {t("newPasswordLabel")}
          </label>
          <Input
            aria-describedby={errorMessage ? errorId : undefined}
            aria-invalid={Boolean(errorMessage)}
            autoComplete="new-password"
            id="change-password-new"
            minLength={MIN_PASSWORD_LENGTH}
            name="newPassword"
            onChange={(event) => dispatch({ type: "field.newPassword", value: event.target.value })}
            required
            type="password"
            value={state.newPassword}
          />
        </div>

        <div className="space-y-1.5">
          <label
            className="block text-sm font-medium text-[var(--neutral-12)]"
            htmlFor="change-password-confirm"
          >
            {t("confirmPasswordLabel")}
          </label>
          <Input
            aria-describedby={errorMessage ? errorId : undefined}
            aria-invalid={Boolean(errorMessage)}
            autoComplete="new-password"
            id="change-password-confirm"
            minLength={MIN_PASSWORD_LENGTH}
            name="confirmPassword"
            onChange={(event) =>
              dispatch({ type: "field.confirmPassword", value: event.target.value })
            }
            required
            type="password"
            value={state.confirmPassword}
          />
        </div>

        <label
          className="flex items-center gap-2 text-sm text-[var(--neutral-11)]"
          htmlFor="change-password-revoke"
        >
          <input
            data-allow-native
            checked={state.revokeOtherSessions}
            className="size-4 rounded border-[var(--neutral-7)] text-[var(--blue-9)]"
            id="change-password-revoke"
            name="revokeOtherSessions"
            onChange={(event) =>
              dispatch({ type: "field.revokeOtherSessions", value: event.target.checked })
            }
            type="checkbox"
          />
          {t("revokeOtherSessions")}
        </label>

        {errorMessage && (
          <p className="text-sm text-[hsl(var(--destructive))]" id={errorId} role="alert">
            {errorMessage}
          </p>
        )}

        {state.success && (
          <p
            className="text-sm text-[var(--status-success,hsl(var(--success,142_71%_45%)))]"
            id={successId}
            role="status"
          >
            {t("success")}
          </p>
        )}

        {state.pending && (
          <p className="text-sm text-[var(--neutral-11)]" role="status">
            {t("pending")}
          </p>
        )}

        <div>
          <Button disabled={state.pending} htmlType="submit" type="primary">
            {state.pending ? t("pending") : t("submit")}
          </Button>
        </div>
      </form>
    </section>
  );
}
