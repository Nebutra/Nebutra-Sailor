"use client";

import { Button } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useState } from "react";

export type OAuthProvider = "google" | "github" | "apple" | "microsoft";

interface OAuthButtonsProps {
  mode: "signIn" | "signUp";
  /**
   * Providers that are actually configured server-side. Pass from the page
   * server component so we don't render buttons that would 404 on the
   * `/api/auth/oauth/:provider` route. Falls back to all four when omitted —
   * useful in Storybook / tests.
   */
  providers?: readonly OAuthProvider[];
  /**
   * Pre-sanitized returnUrl to forward through OAuth round-trip. Must already
   * have passed through `sanitizeReturnUrl()` server-side.
   */
  returnUrl?: string;
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <title>Google</title>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <title>GitHub</title>
      <path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.572C20.565 21.795 24 17.298 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <title>Apple</title>
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <title>Microsoft</title>
      <path fill="#F25022" d="M11.4 11.4H1V1h10.4z" />
      <path fill="#7FBA00" d="M23 11.4H12.6V1H23z" />
      <path fill="#00A4EF" d="M11.4 23H1V12.6h10.4z" />
      <path fill="#FFB900" d="M23 23H12.6V12.6H23z" />
    </svg>
  );
}

const PROVIDER_ICON: Record<OAuthProvider, () => React.ReactElement> = {
  google: GoogleIcon,
  github: GitHubIcon,
  apple: AppleIcon,
  microsoft: MicrosoftIcon,
};

const ALL_PROVIDERS: readonly OAuthProvider[] = ["google", "github", "apple", "microsoft"];

export function OAuthButtons({ mode, providers = ALL_PROVIDERS, returnUrl }: OAuthButtonsProps) {
  const t = useTranslations("auth.signIn");
  const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(null);

  function handleOAuth(provider: OAuthProvider) {
    setLoadingProvider(provider);
    const callback = returnUrl ?? (mode === "signIn" ? "/" : "/onboarding");
    const params = new URLSearchParams({ callback });
    window.location.href = `/api/auth/oauth/${provider}?${params.toString()}`;
  }

  if (providers.length === 0) return null;

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
      {providers.map((provider) => {
        const Icon = PROVIDER_ICON[provider];
        const label = t(`providers.${provider}`);
        return (
          <Button
            key={provider}
            type="button"
            variant="outline"
            className="h-10 w-full justify-center gap-2.5 border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 text-[var(--neutral-12)] shadow-none hover:bg-[var(--neutral-2)]"
            disabled={loadingProvider !== null}
            aria-label={`${t("continueWith")} ${label}`}
            onClick={() => handleOAuth(provider)}
          >
            <Icon />
            {loadingProvider === provider ? t("providerLoading") : label}
          </Button>
        );
      })}
    </div>
  );
}
