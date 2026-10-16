"use client";

import { Button, Field, Input } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import type { ActionState } from "@/app/admin/actions";
import { FormError } from "./form-error";

/**
 * Sign-in and setup post to the backend's /api/v1/auth/* routes, which own
 * rate limiting, the Origin check and the session cookie. One path, not two.
 */
function useAuthPost(endpoint: string) {
  const [state, setState] = useState<ActionState>({});
  const [pending, setPending] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>, body: (f: FormData) => unknown) => {
    event.preventDefault();
    setPending(true);
    setState({});
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body(new FormData(event.currentTarget))),
        credentials: "same-origin",
      });
      if (response.ok) {
        window.location.assign("/admin/incidents");
        return;
      }
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        detail?: unknown;
        retryAfter?: number;
      };
      const detail =
        data.error === "rate_limited"
          ? String(data.retryAfter ?? "")
          : typeof data.detail === "string"
            ? data.detail
            : "";
      setState({ error: { code: data.error ?? String(response.status), detail } });
    } catch (error) {
      setState({ error: { code: "network", detail: String(error) } });
    } finally {
      setPending(false);
    }
  };
  return { state, pending, submit };
}

const str = (f: FormData, k: string) => String(f.get(k) ?? "");

export function SignInForm() {
  const t = useTranslations("admin");
  const { state, pending, submit } = useAuthPost("/api/v1/auth/sign-in");
  return (
    <form
      onSubmit={(e) => submit(e, (f) => ({ email: str(f, "email"), password: str(f, "password") }))}
      className="grid gap-4"
    >
      <FormError state={state} />
      <Field label={t("setup.email")} htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="username" required />
      </Field>
      <Field label={t("setup.password")} htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>
      <Button type="submit" variant="ink" disabled={pending} className="mt-2">
        {t("signIn.submit")}
      </Button>
    </form>
  );
}

export function SetupForm() {
  const t = useTranslations("admin.setup");
  const { state, pending, submit } = useAuthPost("/api/v1/auth/setup");
  return (
    <form
      onSubmit={(e) =>
        submit(e, (f) => ({
          setupToken: str(f, "setupToken"),
          email: str(f, "email"),
          password: str(f, "password"),
          workspaceSlug: str(f, "workspaceSlug"),
          ...(str(f, "name").trim() ? { name: str(f, "name").trim() } : {}),
        }))
      }
      className="grid gap-4"
    >
      <FormError state={state} />
      <Field label={t("token")} htmlFor="setupToken">
        <Input id="setupToken" name="setupToken" type="password" autoComplete="off" required />
      </Field>
      <Field label={t("email")} htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="username" required />
      </Field>
      <Field label={t("password")} htmlFor="password" description={t("passwordHint")}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
        />
      </Field>
      <Field label={t("name")} htmlFor="name">
        <Input id="name" name="name" autoComplete="name" />
      </Field>
      <Field label={t("workspace")} htmlFor="workspaceSlug" description={t("workspaceHint")}>
        <Input
          id="workspaceSlug"
          name="workspaceSlug"
          defaultValue="default"
          pattern="[a-z0-9][a-z0-9_\-]*"
          required
        />
      </Field>
      <Button type="submit" variant="ink" disabled={pending} className="mt-2">
        {t("submit")}
      </Button>
    </form>
  );
}
