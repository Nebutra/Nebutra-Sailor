"use client";

import { brand } from "@nebutra/brand/metadata";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { Warning as AlertTriangle, Eye, EyeOff, Key, Envelope as Mail } from "@nebutra/icons";
import { Button, Input } from "@nebutra/ui/primitives";
import { AUTH_PRIMARY_CTA_CLASS } from "@nebutra/ui/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { type AuthSignInOauthMessageKey, resolveOauthErrorMessageKey } from "@/lib/oauth-errors";
import type { OAuthProvider } from "@/lib/oauth-providers";
import {
  enablePasskeyConditionalUI,
  isPasskeySupported,
  PasskeyError,
  signInWithPasskey,
} from "@/lib/passkey-client";
import { challengePath, writePendingAuth } from "@/lib/pending-auth";
import { OAuthButtons } from "./oauth-buttons";
import { useCapsLock } from "./use-caps-lock";

const LANDING_ORIGIN = getBrandOrigin("landing");
const TERMS_HREF = `${LANDING_ORIGIN}/terms`;
const PRIVACY_HREF = `${LANDING_ORIGIN}/privacy`;

interface CredentialsFormProps {
  mode: "sign-in" | "sign-up";
  /** Already-sanitized absolute return URL (computed on the server). */
  returnTo: string;
  /** Providers configured server-side (env secrets present). */
  enabledOAuthProviders?: readonly OAuthProvider[];
  /** When true, show magic-link alternate entry (feature flag). */
  magicLinkEnabled?: boolean;
  /** When true, show passkey alternate entry (feature flag). */
  passkeyEnabled?: boolean;
  /** Cloudflare Turnstile site key — widget omitted when unset. */
  turnstileSiteKey?: string;
  /**
   * OAuth / BA error code from `?error=` (e.g. state_mismatch). Surfaced as a
   * human-readable alert so IdP round-trips that fail don't look like a dead UI.
   */
  oauthErrorCode?: string | null;
}

/**
 * Full Agent OS / apps/web SignInForm parity for the login center:
 * OAuth, email/password, eye toggle, caps-lock, forgot-password,
 * secondary methods, next-intl copy (sign-in + sign-up).
 *
 * Bot protection (Turnstile) is not mounted here — on submit we hand off to
 * `/challenge` so the widget never sits between the password field and the
 * primary button (which broke the column alignment).
 */
function oauthErrorMessage(
  code: string | null | undefined,
  t: (key: AuthSignInOauthMessageKey) => string,
): string | null {
  const key = resolveOauthErrorMessageKey(code);
  return key ? t(key) : null;
}

export function CredentialsForm({
  mode,
  returnTo,
  enabledOAuthProviders = [],
  magicLinkEnabled = false,
  passkeyEnabled = false,
  turnstileSiteKey,
  oauthErrorCode = null,
}: CredentialsFormProps) {
  const tSignIn = useTranslations("auth.signIn");
  const tSignUp = useTranslations("auth.signUp");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyAvailable, setPasskeyAvailable] = useState(false);
  const { capsLockOn, onKeyEvent } = useCapsLock();
  const conditionalUIStartedRef = useRef(false);

  useEffect(() => {
    setPasskeyAvailable(isPasskeySupported());
  }, []);

  useEffect(() => {
    const msg = oauthErrorMessage(oauthErrorCode, tSignIn);
    if (msg) setError(msg);
  }, [oauthErrorCode, tSignIn]);

  // WebAuthn Conditional UI — autofill passkeys on the email field when enabled.
  useEffect(() => {
    if (!passkeyEnabled || conditionalUIStartedRef.current) return;
    conditionalUIStartedRef.current = true;
    const controller = new AbortController();
    void enablePasskeyConditionalUI({
      signal: controller.signal,
      onSuccess: () => {
        window.location.assign(returnTo);
      },
      onError: () => {
        // Silent — user can still type credentials.
      },
    });
    return () => controller.abort();
  }, [passkeyEnabled, returnTo]);

  function withReturnTo(path: string): string {
    const params = new URLSearchParams({ returnTo });
    return `${path}?${params.toString()}`;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const endpoint = mode === "sign-in" ? "/api/auth/sign-in/email" : "/api/auth/sign-up/email";
      const name =
        mode === "sign-up"
          ? `${firstName} ${lastName}`.trim() || email.split("@")[0] || "User"
          : undefined;
      const body =
        mode === "sign-in"
          ? { email, password, callbackURL: returnTo }
          : { email, password, name, callbackURL: returnTo };

      // When Turnstile is configured, never mount the widget on this form —
      // park the request and challenge on a dedicated page so layout stays stable.
      if (turnstileSiteKey) {
        const cancelTo = withReturnTo(mode === "sign-in" ? "/sign-in" : "/sign-up");
        writePendingAuth({
          kind: mode,
          endpoint,
          body,
          successRedirect: returnTo,
          cancelTo,
        });
        router.push(challengePath(cancelTo));
        return;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          message?: string;
          error?: string;
          code?: string;
        } | null;
        setError(
          data?.message ||
            data?.error ||
            (mode === "sign-in" ? tSignIn("signInFailed") : tSignUp("signUpFailed")),
        );
        return;
      }

      window.location.assign(returnTo);
    } catch {
      setError(tSignIn("genericError"));
    } finally {
      setLoading(false);
    }
  }

  async function handlePasskey() {
    setPasskeyLoading(true);
    setError(null);
    try {
      await signInWithPasskey(email ? { email } : undefined);
      window.location.assign(returnTo);
    } catch (err) {
      if (err instanceof PasskeyError) {
        if (err.code === "cancelled") {
          // User closed the prompt — no error.
        } else if (err.code === "unsupported") {
          setError(tSignIn("passkeyUnsupported"));
        } else {
          setError(tSignIn("passkeyError"));
        }
      } else {
        setError(tSignIn("passkeyError"));
      }
      setPasskeyLoading(false);
    }
  }

  const altHref = mode === "sign-in" ? withReturnTo("/sign-up") : withReturnTo("/sign-in");
  const showOAuth = enabledOAuthProviders.length > 0;
  const showAltMethods =
    mode === "sign-in" && (magicLinkEnabled || (passkeyEnabled && passkeyAvailable));

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          {mode === "sign-in" ? tSignIn("title") : tSignUp("title")}
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          {mode === "sign-in" ? tSignIn("subtitle") : tSignUp("subtitle")}
        </p>
      </div>

      {showOAuth ? (
        <>
          <OAuthButtons providers={enabledOAuthProviders} returnTo={returnTo} />
          <div className="relative my-6">
            <div className="h-px w-full bg-[hsl(var(--border))]" aria-hidden />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs font-medium text-muted-foreground">
              {tSignIn("dividerOr")}
            </span>
          </div>
        </>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-5"
        aria-busy={loading}
        aria-describedby={error ? "auth-form-error" : undefined}
      >
        {mode === "sign-up" ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="auth-first-name" className="text-sm font-medium text-foreground">
                {tSignUp("firstNameLabel")}
              </label>
              <Input
                id="auth-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
                size="lg"
                className="h-12 border-border bg-background text-foreground shadow-none"
                placeholder={tSignUp("firstNamePlaceholder")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="auth-last-name" className="text-sm font-medium text-foreground">
                {tSignUp("lastNameLabel")}
              </label>
              <Input
                id="auth-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
                size="lg"
                className="h-12 border-border bg-background text-foreground shadow-none"
                placeholder={tSignUp("lastNamePlaceholder")}
              />
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="auth-email" className="text-sm font-medium text-foreground">
            {tSignIn("emailLabel")}
          </label>
          <Input
            id="auth-email"
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete={passkeyEnabled ? "username webauthn" : "email"}
            size="lg"
            className="h-12 border-border bg-background text-foreground shadow-none"
            placeholder={tSignIn("emailPlaceholder")}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="auth-password" className="text-sm font-medium text-foreground">
              {tSignIn("passwordLabel")}
            </label>
            {mode === "sign-in" ? (
              <Link
                href={withReturnTo("/forgot-password")}
                className="text-xs font-medium text-primary hover:text-primary"
              >
                {tSignIn("forgotPassword")}
              </Link>
            ) : null}
          </div>
          <div className="relative">
            <Input
              id="auth-password"
              required
              type={showPassword ? "text" : "password"}
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={onKeyEvent}
              onKeyUp={onKeyEvent}
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              size="lg"
              className="h-12 border-border bg-background pr-12 text-foreground shadow-none"
              placeholder={tSignIn("passwordPlaceholder")}
              aria-describedby={capsLockOn ? "caps-lock-warning" : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? tSignIn("hidePassword") : tSignIn("showPassword")}
              aria-pressed={showPassword}
              className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[var(--radius-md)] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--primary))]"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden />
              ) : (
                <Eye className="h-4 w-4" aria-hidden />
              )}
            </button>
          </div>
          {capsLockOn ? (
            <p
              id="caps-lock-warning"
              role="status"
              aria-live="polite"
              className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-medium text-[color:var(--amber-11,hsl(var(--muted-foreground)))]"
            >
              <AlertTriangle aria-hidden className="h-3.5 w-3.5" />
              {tSignIn("capsLockOn")}
            </p>
          ) : null}
        </div>

        {error ? (
          <p
            id="auth-form-error"
            className="rounded-[var(--radius-md)] border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={loading} variant="ink" className={AUTH_PRIMARY_CTA_CLASS}>
          {mode === "sign-in"
            ? loading
              ? tSignIn("submitLoading")
              : tSignIn("submit")
            : loading
              ? tSignUp("submitLoading")
              : tSignUp("submit")}
        </Button>
      </form>

      {showAltMethods ? (
        <div className="mt-4 flex flex-col gap-2">
          {passkeyEnabled && passkeyAvailable ? (
            <button
              type="button"
              onClick={() => void handlePasskey()}
              disabled={passkeyLoading}
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-primary hover:text-primary disabled:opacity-60"
            >
              <Key aria-hidden className="h-4 w-4" />
              {passkeyLoading ? tSignIn("providerLoading") : tSignIn("usePasskey")}
            </button>
          ) : null}
          {magicLinkEnabled ? (
            <Link
              href={withReturnTo("/sign-in/magic-link")}
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-primary hover:text-primary"
            >
              <Mail aria-hidden className="h-4 w-4" />
              {tSignIn("useMagicLink")}
            </Link>
          ) : null}
        </div>
      ) : null}

      <p className="mt-6 text-sm text-muted-foreground">
        {mode === "sign-in" ? (
          <>
            {tSignIn("newToProduct")}{" "}
            <Link href={altHref} className="font-medium text-primary hover:text-primary">
              {tSignIn("signUpLink")}
            </Link>
          </>
        ) : (
          <>
            {tSignUp("alreadyHaveAccount")}{" "}
            <Link href={altHref} className="font-medium text-primary hover:text-primary">
              {tSignUp("signInLink")}
            </Link>
          </>
        )}
      </p>

      {/*
        Implied-consent legal line (Supabase-style). Links to marketing-site
        pages — no marketing-email claim (we do not auto-subscribe on sign-in).
      */}
      <p className="mt-8 text-center text-xs leading-5 text-muted-foreground">
        {tSignIn.rich("legalNotice", {
          brandName: brand.name,
          terms: (chunks) => (
            <a
              href={TERMS_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              {chunks}
            </a>
          ),
          privacy: (chunks) => (
            <a
              href={PRIVACY_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              {chunks}
            </a>
          ),
        })}
      </p>
    </div>
  );
}
