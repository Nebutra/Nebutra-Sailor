"use client";

import {
  getClerkSsoErrorMessage,
  useClerkEnterpriseSso,
} from "@nebutra/auth/react/clerk-enterprise-sso";
import { Key } from "@nebutra/icons";
import { Button } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";

interface ClerkEnterpriseSsoHandoffProps {
  identifier: string;
  providerName: string;
  returnUrl?: string;
}

/**
 * App-shell UI for Clerk Enterprise SSO.
 *
 * SSO kickoff lives in `@nebutra/auth` (`useClerkEnterpriseSso`) so this file
 * never imports the Clerk SDK directly.
 */
export function ClerkEnterpriseSsoHandoff({
  identifier,
  providerName,
  returnUrl,
}: ClerkEnterpriseSsoHandoffProps) {
  const t = useTranslations("auth.signIn");
  const { error, retry } = useClerkEnterpriseSso({
    identifier,
    redirectUrl: returnUrl ?? "/",
  });

  const errorMessage = error ? (getClerkSsoErrorMessage(error) ?? t("ssoError")) : "";

  return (
    <div className="w-full">
      <div className="mb-8 flex flex-col items-center text-center">
        <span
          aria-hidden
          className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted"
        >
          <Key className="h-5 w-5 text-primary" />
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("ssoTitle")}</h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
          {t("ssoDescription", { provider: providerName, email: identifier })}
        </p>
      </div>

      {errorMessage ? (
        <div className="flex flex-col gap-4">
          <p
            className="rounded-[var(--radius-md)] border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
            aria-live="polite"
          >
            {errorMessage}
          </p>
          <Button
            type="button"
            className="h-11 w-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--muted-foreground))]"
            onClick={retry}
          >
            {t("ssoRetry")}
          </Button>
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground" role="status">
          {t("providerLoading")}
        </p>
      )}
    </div>
  );
}
