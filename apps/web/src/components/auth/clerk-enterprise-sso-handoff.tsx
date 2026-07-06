"use client";

import { useSignIn } from "@clerk/nextjs";
import { Key } from "@nebutra/icons";
import { Button } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

interface ClerkEnterpriseSsoHandoffProps {
  identifier: string;
  providerName: string;
  returnUrl?: string;
}

function getErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;

  if ("message" in error && typeof error.message === "string") {
    return error.message;
  }

  if ("errors" in error && Array.isArray(error.errors)) {
    const first = error.errors.find(
      (entry): entry is { message: string } =>
        Boolean(entry) &&
        typeof entry === "object" &&
        "message" in entry &&
        typeof entry.message === "string",
    );
    return first?.message ?? null;
  }

  return null;
}

export function ClerkEnterpriseSsoHandoff({
  identifier,
  providerName,
  returnUrl,
}: ClerkEnterpriseSsoHandoffProps) {
  const t = useTranslations("auth.signIn");
  const { signIn } = useSignIn();
  const startedRef = useRef(false);
  const [error, setError] = useState("");
  const redirectUrl = returnUrl ?? "/";

  const startSso = useCallback(() => {
    if (!signIn || startedRef.current) return;

    startedRef.current = true;
    setError("");

    void signIn
      .sso({
        identifier,
        strategy: "enterprise_sso",
        redirectUrl,
        redirectCallbackUrl: "/sign-in",
      })
      .then((result) => {
        if (result?.error) {
          setError(getErrorMessage(result.error) ?? t("ssoError"));
        }
      })
      .catch((err: unknown) => {
        setError(getErrorMessage(err) ?? t("ssoError"));
      });
  }, [identifier, redirectUrl, signIn, t]);

  useEffect(() => {
    startSso();
  }, [startSso]);

  function retry() {
    startedRef.current = false;
    setError("");
    startSso();
  }

  return (
    <div className="w-full">
      <div className="mb-8 flex flex-col items-center text-center">
        <span
          aria-hidden
          className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--neutral-7)] bg-[var(--neutral-2)]"
        >
          <Key className="h-5 w-5 text-[var(--blue-11)]" />
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--neutral-12)]">
          {t("ssoTitle")}
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--neutral-10)]">
          {t("ssoDescription", { provider: providerName, email: identifier })}
        </p>
      </div>

      {error ? (
        <div className="flex flex-col gap-4">
          <p
            className="rounded-[var(--radius-md)] border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
          <Button
            type="button"
            className="h-11 w-full bg-[var(--neutral-12)] text-[var(--neutral-1)] hover:bg-[var(--neutral-11)]"
            onClick={retry}
          >
            {t("ssoRetry")}
          </Button>
        </div>
      ) : (
        <p className="text-center text-sm text-[var(--neutral-10)]" role="status">
          {t("providerLoading")}
        </p>
      )}
    </div>
  );
}
