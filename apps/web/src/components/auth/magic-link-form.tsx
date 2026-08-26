"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  Input,
} from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { resolveAuthErrorKey } from "@/lib/auth/error-catalog";
import type { AuthErrorKey } from "@/lib/auth/error-keys";

const VERIFICATION_CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

const magicLinkSchema = z.object({
  email: z.string().email(),
  code: z.string(),
});
type MagicLinkValues = z.infer<typeof magicLinkSchema>;

export interface MagicLinkSendInput {
  email: string;
}

export interface MagicLinkVerifyInput {
  email: string;
  code: string;
}

export interface MagicLinkFormProps {
  /** POST /api/auth/sign-in/magic-link with {email}. */
  onSendLink?: (input: MagicLinkSendInput) => Promise<void>;
  /** POST /api/auth/magic-link/verify with {email, code}. */
  onVerify?: (input: MagicLinkVerifyInput) => Promise<unknown>;
  /** Called with the verify response on success. */
  onSuccess?: (sessionData: unknown) => void;
}

async function defaultSendLink({ email }: MagicLinkSendInput): Promise<void> {
  const response = await fetch("/api/auth/sign-in/magic-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    throw payload ?? { code: "UNKNOWN" };
  }
}

async function defaultVerify({ email, code }: MagicLinkVerifyInput): Promise<unknown> {
  const response = await fetch("/api/auth/magic-link/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, code }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    throw payload ?? { code: "UNKNOWN" };
  }
  return response.json().catch(() => null);
}

export function MagicLinkForm({ onSendLink, onVerify, onSuccess }: MagicLinkFormProps) {
  const t = useTranslations("auth.magicLink");
  const tErrors = useTranslations("auth.errors");

  const form = useForm<MagicLinkValues>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: { email: "", code: "" },
  });
  const email = form.watch("email");
  const code = form.watch("code");

  const [stage, setStage] = useState<"email" | "code">("email");
  const [pending, setPending] = useState(false);
  const [errorKey, setErrorKey] = useState<AuthErrorKey | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const verifyingRef = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1_000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleSend(values: MagicLinkValues) {
    setErrorKey(null);
    setPending(true);
    try {
      const submit = onSendLink ?? defaultSendLink;
      await submit({ email: values.email });
      setStage("code");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      setErrorKey(resolveAuthErrorKey(error));
    } finally {
      setPending(false);
    }
  }

  function handleInvalidSend() {
    setErrorKey("invalidEmail");
  }

  async function handleVerify(submittedCode: string) {
    if (verifyingRef.current) return;
    verifyingRef.current = true;
    setErrorKey(null);
    setPending(true);
    try {
      const submit = onVerify ?? defaultVerify;
      const result = await submit({ email, code: submittedCode });
      onSuccess?.(result);
    } catch (error) {
      setErrorKey(resolveAuthErrorKey(error));
    } finally {
      setPending(false);
      verifyingRef.current = false;
    }
  }

  function handleCodeChange(value: string) {
    const digitsOnly = value.replace(/\D+/g, "").slice(0, VERIFICATION_CODE_LENGTH);
    form.setValue("code", digitsOnly);
    if (digitsOnly.length === VERIFICATION_CODE_LENGTH) {
      void handleVerify(digitsOnly);
    }
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setErrorKey(null);
    setPending(true);
    try {
      const submit = onSendLink ?? defaultSendLink;
      await submit({ email });
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      setErrorKey(resolveAuthErrorKey(error));
    } finally {
      setPending(false);
    }
  }

  const errorMessage = errorKey ? tErrors(errorKey) : null;
  const errorId = "magic-link-error";

  return (
    <section className="rounded-[var(--radius-lg)] border border-border bg-background p-6">
      <div className="mb-5">
        <h3 className="text-sm font-medium text-foreground">{t("title")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {errorMessage && (
        <p className="mb-4 text-sm text-[hsl(var(--destructive))]" id={errorId} role="alert">
          {errorMessage}
        </p>
      )}

      {stage === "email" && (
        <Form {...form}>
          <form
            className="space-y-4"
            noValidate
            onSubmit={form.handleSubmit(handleSend, handleInvalidSend)}
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="block text-sm font-medium text-foreground">
                    {t("emailLabel")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      aria-describedby={errorMessage ? errorId : undefined}
                      aria-invalid={Boolean(errorMessage)}
                      autoComplete="email"
                      name="email"
                      required
                      type="email"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button disabled={pending} type="submit">
              {t("send")}
            </Button>
          </form>
        </Form>
      )}

      {stage === "code" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("sentTo", { email })}</p>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground" htmlFor="magic-link-code">
              {t("codeLabel")}
            </label>
            <Input
              aria-describedby={errorMessage ? errorId : undefined}
              aria-invalid={Boolean(errorMessage)}
              autoComplete="one-time-code"
              id="magic-link-code"
              inputMode="numeric"
              maxLength={VERIFICATION_CODE_LENGTH}
              name="code"
              onChange={(event) => handleCodeChange(event.target.value)}
              pattern="\d{6}"
              required
              type="text"
              value={code}
            />
          </div>

          <Button
            disabled={cooldown > 0 || pending}
            type="button"
            onClick={handleResend}
            variant="outline"
          >
            {cooldown > 0 ? t("resendCooldown", { seconds: cooldown }) : t("resend")}
          </Button>
        </div>
      )}
    </section>
  );
}
