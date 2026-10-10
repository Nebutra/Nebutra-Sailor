"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import { PRODUCT_LANGUAGE_META } from "@nebutra/i18n/languages";
import { toMessageLocale } from "@nebutra/i18n/locales";
import { Phone } from "@nebutra/icons";
import {
  Button,
  Input,
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nebutra/ui/primitives";
import { AUTH_PRIMARY_CTA_CLASS } from "@nebutra/ui/utils";
import { type CountryCode, getCountries, getCountryCallingCode } from "libphonenumber-js/min";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { normalizePhoneNumber } from "@/lib/phone-login";

interface PhoneLoginFormProps {
  returnTo: string;
  turnstileSiteKey: string;
}

const COUNTRY_CODES = getCountries();
const COUNTRY_CODE_SET = new Set<string>(COUNTRY_CODES);
/** The region in the locale tag, else the language's default region in the registry. */
function countryFromLocale(locale: string): CountryCode {
  const region = locale
    .replace(/_/gu, "-")
    .split("-")
    .slice(1)
    .find((part) => /^[a-z]{2}$/iu.test(part))
    ?.toUpperCase();
  if (region && COUNTRY_CODE_SET.has(region)) return region as CountryCode;
  const fallback = PRODUCT_LANGUAGE_META[toMessageLocale(locale)]?.defaultRegion;
  return fallback && COUNTRY_CODE_SET.has(fallback) ? (fallback as CountryCode) : "US";
}

function responseCode(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  return typeof record.code === "string"
    ? record.code
    : typeof record.error === "string"
      ? record.error
      : null;
}

export function PhoneLoginForm({ returnTo, turnstileSiteKey }: PhoneLoginFormProps) {
  const locale = useLocale();
  const t = useTranslations("auth.phone");
  const [country, setCountry] = useState<CountryCode>(() => countryFromLocale(locale));
  const [phone, setPhone] = useState("");
  const [normalizedPhone, setNormalizedPhone] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayNamesReady, setDisplayNamesReady] = useState(false);

  const countryOptions = useMemo(() => {
    let names: Intl.DisplayNames | null = null;
    if (displayNamesReady) {
      try {
        names = new Intl.DisplayNames([locale], { type: "region" });
      } catch {
        // Region codes remain usable if localized display names are unavailable.
      }
    }
    return COUNTRY_CODES.map((code) => ({
      code,
      callingCode: getCountryCallingCode(code),
      name: names?.of(code) ?? code,
    })).sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [displayNamesReady, locale]);
  const countryItems = useMemo(
    () =>
      Object.fromEntries(
        countryOptions.map((option) => [option.code, `${option.name} (+${option.callingCode})`]),
      ),
    [countryOptions],
  );
  const selectedCountryLabel = countryItems[country] ?? country;

  useEffect(() => setDisplayNamesReady(true), []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  function resetCaptcha() {
    setCaptchaToken(null);
    setCaptchaKey((value) => value + 1);
  }

  async function sendCode() {
    if (loading || cooldown > 0) return;
    const destination = normalizePhoneNumber(phone, country);
    if (!destination) {
      setError(t("invalidPhone"));
      return;
    }
    if (!captchaToken) {
      setError(t("captcha"));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/phone-number/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-captcha-response": captchaToken,
        },
        credentials: "include",
        body: JSON.stringify({ phoneNumber: destination }),
      });
      const payload = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        const code = responseCode(payload);
        setError(
          code === "VERIFICATION_FAILED" || code === "MISSING_RESPONSE"
            ? t("captcha")
            : t("sendFailed"),
        );
        return;
      }
      setNormalizedPhone(destination);
      setCode("");
      setCooldown(60);
    } catch {
      setError(t("sendFailed"));
    } finally {
      resetCaptcha();
      setLoading(false);
    }
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    if (!normalizedPhone || code.length !== 6 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/phone-number/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phoneNumber: normalizedPhone, code }),
      });
      if (!response.ok) {
        setError(t("invalidCode"));
        return;
      }
      window.location.assign(returnTo);
    } catch {
      setError(t("invalidCode"));
    } finally {
      setLoading(false);
    }
  }

  const signInHref = `/sign-in?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground">{t("title")}</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          {normalizedPhone ? t("codeSent", { phone: normalizedPhone }) : t("subtitle")}
        </p>
      </div>

      {normalizedPhone ? (
        <form onSubmit={verifyCode} className="flex flex-col gap-5" aria-busy={loading}>
          <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
            <legend className="text-sm font-medium text-foreground">{t("code")}</legend>
            <InputOTP
              maxLength={6}
              pattern="^[0-9]+$"
              value={code}
              onValueChange={(value) => setCode(value.replace(/\D/gu, "").slice(0, 6))}
              containerClassName="w-full"
            >
              <InputOTPGroup className="grid w-full grid-cols-6 gap-2">
                {Array.from({ length: 6 }, (_, index) => (
                  <InputOTPSlot
                    key={index}
                    index={index}
                    className="h-12 w-full rounded-[var(--radius-md)] border bg-background text-base"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </fieldset>

          {error ? (
            <p
              className="rounded-[var(--radius-md)] border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive-strong"
              role="alert"
              aria-live="polite"
            >
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={loading || code.length !== 6}
            variant="ink"
            className={AUTH_PRIMARY_CTA_CLASS}
          >
            {loading ? t("verifying") : t("verify")}
          </Button>

          {cooldown > 0 ? (
            <p className="text-center text-xs text-muted-foreground" role="status">
              {t("resendIn", { seconds: cooldown })}
            </p>
          ) : (
            <div className="flex flex-col items-stretch gap-3">
              <div className="flex min-h-[172px] items-center justify-center rounded-[var(--radius-md)] border border-border bg-muted/40 px-3 py-4">
                <Turnstile
                  key={captchaKey}
                  siteKey={turnstileSiteKey}
                  options={{ size: "compact", theme: "auto", action: "turnstile-spin-v2" }}
                  onSuccess={setCaptchaToken}
                  onError={() => setCaptchaToken(null)}
                  onExpire={() => setCaptchaToken(null)}
                />
              </div>
              <Button
                size="lg"
                type="button"
                variant="outline"
                disabled={loading || !captchaToken}
                className="w-full"
                onClick={() => void sendCode()}
              >
                {t("resend")}
              </Button>
            </div>
          )}

          <Button
            type="button"
            variant="ghost"
            className="h-10 w-full"
            onClick={() => {
              setNormalizedPhone(null);
              setCode("");
              setCooldown(0);
              setError(null);
              resetCaptcha();
            }}
          >
            {t("change")}
          </Button>
        </form>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="phone-country" className="text-sm font-medium text-foreground">
                {t("country")}
              </label>
              <Select
                value={country}
                onValueChange={(nextCountry) => {
                  if (nextCountry && COUNTRY_CODE_SET.has(nextCountry)) {
                    setCountry(nextCountry as CountryCode);
                  }
                }}
                items={countryItems}
              >
                <SelectTrigger id="phone-country" size="large" className="min-w-0">
                  <SelectValue placeholder={selectedCountryLabel}>
                    {() => selectedCountryLabel}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {countryOptions.map((option) => (
                    <SelectItem key={option.code} value={option.code}>
                      {countryItems[option.code]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="phone-number" className="text-sm font-medium text-foreground">
                {t("phone")}
              </label>
              <Input
                id="phone-number"
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                size="lg"
                className="min-w-0"
                placeholder="415 555 2671"
              />
            </div>
          </div>

          <div className="flex min-h-[172px] items-center justify-center rounded-[var(--radius-md)] border border-border bg-muted/40 px-3 py-4">
            <Turnstile
              key={captchaKey}
              siteKey={turnstileSiteKey}
              options={{ size: "compact", theme: "auto", action: "turnstile-spin-v2" }}
              onSuccess={setCaptchaToken}
              onError={() => setCaptchaToken(null)}
              onExpire={() => setCaptchaToken(null)}
            />
          </div>

          {error ? (
            <p
              className="rounded-[var(--radius-md)] border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive-strong"
              role="alert"
              aria-live="polite"
            >
              {error}
            </p>
          ) : null}

          <Button
            type="button"
            disabled={loading || !phone.trim() || !captchaToken}
            variant="ink"
            className={AUTH_PRIMARY_CTA_CLASS}
            onClick={() => void sendCode()}
          >
            <Phone aria-hidden className="h-4 w-4" />
            {loading ? t("sending") : t("send")}
          </Button>
        </div>
      )}

      <p className="mt-6 text-sm text-muted-foreground">
        <Link href={signInHref} className="font-medium text-primary hover:text-primary">
          {t("back")}
        </Link>
      </p>
    </div>
  );
}
