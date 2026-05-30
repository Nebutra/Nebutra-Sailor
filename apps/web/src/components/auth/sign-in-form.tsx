"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Turnstile } from "@marsidev/react-turnstile";
import { Warning as AlertTriangle, Eye, EyeOff, Key, Envelope as Mail } from "@nebutra/icons";
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  Input,
  Separator,
} from "@nebutra/ui/primitives";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  enablePasskeyConditionalUI,
  isPasskeySupported,
  signInWithPasskey,
} from "@/lib/auth/passkey-client";
import { OAuthButtons, type OAuthProvider } from "./oauth-buttons";
import { useCapsLock } from "./use-caps-lock";

interface SsoDiscoveryProvider {
  id: string;
  name: string;
  type: "saml" | "oidc";
  domain: string;
  loginUrl: string;
}

// Bounds mirror the original form: both fields were `required` (non-empty)
// with no client-side format gate — the server owns credential validation.
const signInSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});
type SignInValues = z.infer<typeof signInSchema>;

interface SignInFormProps {
  /** OAuth providers actually configured server-side. */
  enabledOAuthProviders?: readonly OAuthProvider[];
  /** Server-sanitized returnUrl to land on after successful sign-in. */
  returnUrl?: string;
  /** Whether the magic-link route is enabled (feature flag `magicLink`). */
  magicLinkEnabled?: boolean;
  /** Whether passkeys are enabled (feature flag `passkeys`). */
  passkeyEnabled?: boolean;
  /** Cloudflare Turnstile site key — if missing, the widget is not rendered. */
  turnstileSiteKey?: string;
}

export function SignInForm({
  enabledOAuthProviders,
  returnUrl,
  magicLinkEnabled = false,
  passkeyEnabled = false,
  turnstileSiteKey,
}: SignInFormProps) {
  const router = useRouter();
  const t = useTranslations("auth.signIn");
  const accessGateEnabled = process.env.NEXT_PUBLIC_ACCESS_GATE_MODE === "invite";

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [passkeyAvailable, setPasskeyAvailable] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [ssoProvider, setSsoProvider] = useState<SsoDiscoveryProvider | null>(null);
  const { capsLockOn, onKeyEvent } = useCapsLock();
  const conditionalUIStartedRef = useRef(false);
  const ssoDiscoverySeqRef = useRef(0);

  const loading = form.formState.isSubmitting;
  const fallbackTarget = returnUrl ?? "/";
  const shouldRenderOAuth = !accessGateEnabled && (enabledOAuthProviders?.length ?? 0) > 0;

  // Browser passkey availability — only render the explicit button if so.
  useEffect(() => {
    setPasskeyAvailable(isPasskeySupported());
  }, []);

  // WebAuthn Conditional UI — let the browser autofill passkeys on the
  // email field. Standard 2026 SV pattern (Stripe / Linear / GitHub).
  useEffect(() => {
    if (!passkeyEnabled || conditionalUIStartedRef.current) return;
    conditionalUIStartedRef.current = true;
    const controller = new AbortController();
    void enablePasskeyConditionalUI({
      signal: controller.signal,
      onSuccess: () => router.push(fallbackTarget),
      onError: () => {
        // Silent — conditional UI errors are not surfaced (user can still
        // type credentials normally).
      },
    });
    return () => controller.abort();
  }, [passkeyEnabled, router, fallbackTarget]);

  async function handleSubmit(values: SignInValues) {
    setError("");

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (turnstileToken) headers["x-captcha-response"] = turnstileToken;

    try {
      const response = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          returnUrl: fallbackTarget,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch((): { error?: string; code?: string } => ({}));
        const code = data.code ?? data.error;
        if (code === "VERIFICATION_FAILED" || code === "MISSING_RESPONSE") {
          setError(t("captchaError"));
        } else {
          setError(data.error ?? t("signInFailed"));
        }
        return;
      }
      router.push(fallbackTarget);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("genericError"));
    }
  }

  async function discoverSsoProvider() {
    const normalizedEmail = form.getValues("email").trim().toLowerCase();
    ssoDiscoverySeqRef.current += 1;
    const seq = ssoDiscoverySeqRef.current;
    setSsoProvider(null);

    if (!normalizedEmail.includes("@")) return;

    const params = new URLSearchParams({ email: normalizedEmail });
    if (returnUrl) params.set("returnUrl", returnUrl);

    try {
      const response = await fetch(`/api/auth/sso/discovery?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok || seq !== ssoDiscoverySeqRef.current) return;
      const payload = (await response.json().catch(() => null)) as {
        provider?: SsoDiscoveryProvider | null;
      } | null;
      setSsoProvider(payload?.provider ?? null);
    } catch {
      // SSO discovery is an enhancement. Password, passkey, and magic-link
      // sign-in remain available if discovery fails.
    }
  }

  async function handlePasskey() {
    setPasskeyLoading(true);
    setError("");
    try {
      const email = form.getValues("email");
      await signInWithPasskey(email ? { email } : undefined);
      router.push(fallbackTarget);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "cancelled") {
        // Silent — user closed the prompt.
      } else if (code === "unsupported") {
        setError(t("passkeyUnsupported"));
      } else {
        setError(t("passkeyError"));
      }
      setPasskeyLoading(false);
    }
  }

  function buildAltLink(path: string): string {
    if (!returnUrl) return path;
    const params = new URLSearchParams({ returnUrl });
    return `${path}?${params.toString()}`;
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--neutral-12)]">
          {t("title")}
        </h1>
        <p className="mt-4 text-sm leading-6 text-[var(--neutral-10)]">{t("subtitle")}</p>
      </div>

      {shouldRenderOAuth && (
        <>
          <OAuthButtons mode="signIn" providers={enabledOAuthProviders} returnUrl={returnUrl} />
          <div className="relative my-6">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--neutral-1)] px-3 text-xs font-medium text-[var(--neutral-9)]">
              {t("dividerOr")}
            </span>
          </div>
        </>
      )}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-5"
          aria-busy={loading}
          aria-describedby={error ? "sign-in-error" : undefined}
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-1.5">
                <FormLabel>{t("emailLabel")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    size="lg"
                    className="h-12 border-[var(--neutral-7)] bg-[var(--neutral-1)] text-[var(--neutral-12)] shadow-none"
                    placeholder={t("emailPlaceholder")}
                    onChange={(e) => {
                      field.onChange(e);
                      setSsoProvider(null);
                    }}
                    onBlur={() => {
                      field.onBlur();
                      void discoverSsoProvider();
                    }}
                    required
                    // Conditional UI: the browser uses these hints to surface passkey
                    // suggestions in the autocomplete dropdown.
                    autoComplete={passkeyEnabled ? "username webauthn" : "email"}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {ssoProvider && (
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full justify-center border-[var(--neutral-7)] bg-[var(--neutral-1)] text-[var(--neutral-12)] shadow-none hover:bg-[var(--neutral-2)]"
              onClick={() => {
                window.location.href = ssoProvider.loginUrl;
              }}
            >
              {t("continueWithProvider", { provider: ssoProvider.name })}
            </Button>
          )}

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <FormLabel>{t("passwordLabel")}</FormLabel>
                  <Link
                    href={buildAltLink("/forgot-password")}
                    className="text-xs font-medium text-[color:var(--blue-11)] hover:text-[color:var(--blue-12)]"
                  >
                    {t("forgotPassword")}
                  </Link>
                </div>
                <div className="relative">
                  <FormControl>
                    <Input
                      {...field}
                      type={showPassword ? "text" : "password"}
                      size="lg"
                      className="h-12 border-[var(--neutral-7)] bg-[var(--neutral-1)] pr-12 text-[var(--neutral-12)] shadow-none"
                      placeholder={t("passwordPlaceholder")}
                      onKeyDown={onKeyEvent}
                      onKeyUp={onKeyEvent}
                      required
                      autoComplete="current-password"
                      aria-describedby={capsLockOn ? "caps-lock-warning" : undefined}
                    />
                  </FormControl>
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                    aria-pressed={showPassword}
                    className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--neutral-10)] transition-colors hover:bg-[var(--neutral-3)] hover:text-[var(--neutral-12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue-9)]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {capsLockOn && (
                  <p
                    id="caps-lock-warning"
                    role="status"
                    aria-live="polite"
                    className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-medium text-[color:var(--amber-11,var(--neutral-11))]"
                  >
                    <AlertTriangle aria-hidden className="h-3.5 w-3.5" />
                    {t("capsLockOn")}
                  </p>
                )}
              </FormItem>
            )}
          />

          {turnstileSiteKey && (
            <Turnstile
              siteKey={turnstileSiteKey}
              options={{ size: "invisible", appearance: "interaction-only" }}
              onSuccess={setTurnstileToken}
              onError={() => setTurnstileToken(null)}
              onExpire={() => setTurnstileToken(null)}
            />
          )}

          {error && (
            <p
              id="sign-in-error"
              className="rounded-[var(--radius-md)] border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
              aria-live="polite"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="h-11 w-full bg-[var(--neutral-12)] text-[var(--neutral-1)] hover:bg-[var(--neutral-11)] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={loading}
          >
            {loading ? t("submitLoading") : t("submit")}
          </Button>
        </form>
      </Form>

      {(magicLinkEnabled || (passkeyEnabled && passkeyAvailable)) && (
        <div className="mt-4 flex flex-col gap-2">
          {passkeyEnabled && passkeyAvailable && (
            <button
              type="button"
              onClick={handlePasskey}
              disabled={passkeyLoading}
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-[color:var(--blue-11)] hover:text-[color:var(--blue-12)] disabled:opacity-60"
            >
              <Key aria-hidden className="h-4 w-4" />
              {passkeyLoading ? t("providerLoading") : t("usePasskey")}
            </button>
          )}
          {magicLinkEnabled && (
            <Link
              href={buildAltLink("/sign-in/magic-link")}
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-[color:var(--blue-11)] hover:text-[color:var(--blue-12)]"
            >
              <Mail aria-hidden className="h-4 w-4" />
              {t("useMagicLink")}
            </Link>
          )}
        </div>
      )}

      <p className="mt-6 text-sm text-[var(--neutral-9)]">
        {t("newToProduct")}{" "}
        <Link
          href={buildAltLink("/sign-up")}
          className="font-medium text-[color:var(--blue-11)] hover:text-[color:var(--blue-12)]"
        >
          {t("signUpLink")}
        </Link>
      </p>
    </div>
  );
}
