"use client";

import { Button, Input, Label } from "@nebutra/ui/primitives";
import { Key } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { isPasskeySupported, signInWithPasskey } from "@/lib/auth/passkey-client";

interface PasskeyPanelProps {
  returnUrl?: string;
}

export function PasskeyPanel({ returnUrl }: PasskeyPanelProps) {
  const t = useTranslations("auth.signIn");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(isPasskeySupported());
  }, []);

  async function handleSignIn() {
    setLoading(true);
    setError("");
    try {
      await signInWithPasskey(email ? { email } : undefined);
      router.push(returnUrl ?? "/");
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "cancelled") {
        setError(t("passkeyCancelled"));
      } else if (code === "unsupported") {
        setError(t("passkeyUnsupported"));
      } else {
        setError(t("passkeyError"));
      }
      setLoading(false);
    }
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
          {t("passkeyTitle")}
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--neutral-10)]">
          {t("passkeyDescription")}
        </p>
      </div>

      {!supported && (
        <p
          className="mb-4 rounded-[var(--radius-md)] border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {t("passkeyUnsupported")}
        </p>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="passkey-email">{t("emailLabel")}</Label>
          <Input
            id="passkey-email"
            type="email"
            size="lg"
            className="h-12 border-[var(--neutral-7)] bg-[var(--neutral-1)] text-[var(--neutral-12)] shadow-none"
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username webauthn"
          />
        </div>

        {error && (
          <p
            className="rounded-[var(--radius-md)] border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}

        <Button
          type="button"
          className="h-11 w-full bg-[var(--neutral-12)] text-[var(--neutral-1)] hover:bg-[var(--neutral-11)] disabled:cursor-not-allowed disabled:opacity-70"
          onClick={handleSignIn}
          disabled={loading || !supported}
        >
          <Key className="mr-2 h-4 w-4" aria-hidden />
          {loading ? t("providerLoading") : t("passkeyButton")}
        </Button>
      </div>
    </div>
  );
}
