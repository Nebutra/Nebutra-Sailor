"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import { Phone } from "@nebutra/icons";
import { Button, Input, InputOTP, InputOTPGroup, InputOTPSlot } from "@nebutra/ui/primitives";
import { AUTH_PRIMARY_CTA_CLASS } from "@nebutra/ui/utils";
import { type CountryCode, getCountries, getCountryCallingCode } from "libphonenumber-js/min";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { normalizePhoneNumber } from "@/lib/phone-login";

interface PhoneLoginFormProps {
  returnTo: string;
  turnstileSiteKey: string;
}

interface PhoneCopy {
  title: string;
  subtitle: string;
  country: string;
  phone: string;
  send: string;
  sending: string;
  code: string;
  codeSent: (phone: string) => string;
  verify: string;
  verifying: string;
  resend: string;
  resendIn: (seconds: number) => string;
  change: string;
  back: string;
  invalidPhone: string;
  captcha: string;
  sendFailed: string;
  invalidCode: string;
}

const EN_COPY: PhoneCopy = {
  title: "Sign in with your phone",
  subtitle: "Choose your country or region, then enter your mobile number.",
  country: "Country or region",
  phone: "Phone number",
  send: "Send verification code",
  sending: "Sending...",
  code: "Verification code",
  codeSent: (phone) => `Enter the 6-digit code sent to ${phone}.`,
  verify: "Verify and sign in",
  verifying: "Verifying...",
  resend: "Send a new code",
  resendIn: (seconds) => `A new code can be sent in ${seconds}s`,
  change: "Use a different number",
  back: "Back to sign in",
  invalidPhone: "Enter a valid mobile number for the selected country or region.",
  captcha: "Complete the security check before requesting a code.",
  sendFailed: "We could not send a code right now. Please try again.",
  invalidCode: "That code is invalid or expired. Request a new code and try again.",
};

const ZH_COPY: PhoneCopy = {
  title: "使用手机号登录",
  subtitle: "选择国家或地区，然后输入手机号码。",
  country: "国家或地区",
  phone: "手机号码",
  send: "发送验证码",
  sending: "正在发送...",
  code: "验证码",
  codeSent: (phone) => `请输入发送至 ${phone} 的 6 位验证码。`,
  verify: "验证并登录",
  verifying: "正在验证...",
  resend: "重新发送验证码",
  resendIn: (seconds) => `${seconds} 秒后可重新发送`,
  change: "更换手机号",
  back: "返回登录",
  invalidPhone: "请输入所选国家或地区的有效手机号码。",
  captcha: "发送验证码前请先完成安全验证。",
  sendFailed: "暂时无法发送验证码，请稍后重试。",
  invalidCode: "验证码无效或已过期，请重新获取后再试。",
};

const COUNTRY_CODES = getCountries();
const COUNTRY_CODE_SET = new Set<string>(COUNTRY_CODES);
const DEFAULT_COUNTRY_BY_LANGUAGE: Partial<Record<string, CountryCode>> = {
  ar: "AE",
  de: "DE",
  es: "ES",
  fr: "FR",
  ja: "JP",
  ko: "KR",
  zh: "CN",
};

function copyForLocale(locale: string): PhoneCopy {
  return locale.toLowerCase().startsWith("zh") ? ZH_COPY : EN_COPY;
}

function countryFromLocale(locale: string): CountryCode {
  const normalized = locale.replace(/_/gu, "-");
  const region = normalized
    .split("-")
    .slice(1)
    .find((part) => /^[a-z]{2}$/iu.test(part))
    ?.toUpperCase();
  if (region && COUNTRY_CODE_SET.has(region)) return region as CountryCode;
  if (normalized.toLowerCase().startsWith("zh-hant")) return "TW";
  return DEFAULT_COUNTRY_BY_LANGUAGE[normalized.split("-")[0]?.toLowerCase() ?? ""] ?? "US";
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
  const copy = copyForLocale(locale);
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
      setError(copy.invalidPhone);
      return;
    }
    if (!captchaToken) {
      setError(copy.captcha);
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
            ? copy.captcha
            : copy.sendFailed,
        );
        return;
      }
      setNormalizedPhone(destination);
      setCode("");
      setCooldown(60);
    } catch {
      setError(copy.sendFailed);
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
        setError(copy.invalidCode);
        return;
      }
      window.location.assign(returnTo);
    } catch {
      setError(copy.invalidCode);
    } finally {
      setLoading(false);
    }
  }

  const signInHref = `/sign-in?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground">{copy.title}</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          {normalizedPhone ? copy.codeSent(normalizedPhone) : copy.subtitle}
        </p>
      </div>

      {normalizedPhone ? (
        <form onSubmit={verifyCode} className="flex flex-col gap-5" aria-busy={loading}>
          <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
            <legend className="text-sm font-medium text-foreground">{copy.code}</legend>
            <InputOTP
              maxLength={6}
              pattern="^[0-9]+$"
              value={code}
              onChange={(value) => setCode(value.replace(/\D/gu, "").slice(0, 6))}
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
              className="rounded-[var(--radius-md)] border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
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
            {loading ? copy.verifying : copy.verify}
          </Button>

          {cooldown > 0 ? (
            <p className="text-center text-xs text-muted-foreground" role="status">
              {copy.resendIn(cooldown)}
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
                type="button"
                variant="outline"
                disabled={loading || !captchaToken}
                className="h-11 w-full"
                onClick={() => void sendCode()}
              >
                {copy.resend}
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
            {copy.change}
          </Button>
        </form>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="phone-country" className="text-sm font-medium text-foreground">
                {copy.country}
              </label>
              <select
                id="phone-country"
                value={country}
                onChange={(event) => setCountry(event.target.value as CountryCode)}
                className="h-12 min-w-0 rounded-[var(--radius-md)] border border-border bg-background px-3 text-sm text-foreground shadow-none outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {countryOptions.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.name} (+{option.callingCode})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="phone-number" className="text-sm font-medium text-foreground">
                {copy.phone}
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
                className="h-12 min-w-0 border-border bg-background text-foreground shadow-none"
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
              className="rounded-[var(--radius-md)] border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
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
            {loading ? copy.sending : copy.send}
          </Button>
        </div>
      )}

      <p className="mt-6 text-sm text-muted-foreground">
        <Link href={signInHref} className="font-medium text-primary hover:text-primary">
          {copy.back}
        </Link>
      </p>
    </div>
  );
}
