"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { MagicLinkForm } from "./magic-link-form";

interface MagicLinkPanelProps {
  /** Sanitized returnUrl to land on after verification. */
  returnUrl?: string;
  /** Cloudflare Turnstile site key — when present, sendLink is gated by a token. */
  turnstileSiteKey?: string;
}

export function MagicLinkPanel({ returnUrl, turnstileSiteKey }: MagicLinkPanelProps) {
  const t = useTranslations("auth.magicLink");
  const router = useRouter();
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  // Custom sendLink that injects x-captcha-response so Better Auth's captcha
  // plugin can verify before the magic-link endpoint runs.
  const onSendLink = turnstileSiteKey
    ? async ({ email }: { email: string }) => {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (turnstileToken) headers["x-captcha-response"] = turnstileToken;
        const response = await fetch("/api/auth/sign-in/magic-link", {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify({ email }),
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as Record<
            string,
            unknown
          > | null;
          throw payload ?? { code: "UNKNOWN" };
        }
      }
    : undefined;

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--neutral-12)]">
          {t("title")}
        </h1>
        <p className="mt-4 text-sm leading-6 text-[var(--neutral-10)]">{t("description")}</p>
      </div>
      {turnstileSiteKey && (
        <div className="mb-4">
          <Turnstile
            siteKey={turnstileSiteKey}
            options={{ size: "invisible", appearance: "interaction-only" }}
            onSuccess={setTurnstileToken}
            onError={() => setTurnstileToken(null)}
            onExpire={() => setTurnstileToken(null)}
          />
        </div>
      )}
      <MagicLinkForm
        {...(onSendLink ? { onSendLink } : {})}
        onSuccess={() => {
          router.push(returnUrl ?? "/");
        }}
      />
    </div>
  );
}
