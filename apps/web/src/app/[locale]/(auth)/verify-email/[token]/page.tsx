import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { VerifyEmailResult } from "@/components/auth/verify-email-result";
import { resolveServerRequestOrigin } from "@/lib/auth";
import { resolveAuthErrorKey } from "@/lib/auth/error-catalog";
import type { AuthErrorKey } from "@/lib/auth/error-keys";
import { getSecurityCapabilities } from "@/lib/auth/security-capabilities";

interface PageProps {
  params: Promise<{ locale: string; token: string }>;
}

const TOKEN_REGEX = /^[A-Za-z0-9._-]{8,}$/;

async function verifyEmailServerSide(
  token: string,
): Promise<{ success: true } | { success: false; errorKey: AuthErrorKey }> {
  try {
    const requestHeaders = new Headers(await headers());
    const origin = resolveServerRequestOrigin(requestHeaders);
    const response = await fetch(`${origin}/api/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (response.ok) {
      return { success: true };
    }
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    return { success: false, errorKey: resolveAuthErrorKey(payload ?? { code: "UNKNOWN" }) };
  } catch (error) {
    return { success: false, errorKey: resolveAuthErrorKey(error) };
  }
}

async function VerifyEmailPageContent({ params }: PageProps) {
  await connection();

  const capabilities = getSecurityCapabilities();
  if (capabilities.provider === "clerk" && capabilities.providerProfileUrl) {
    redirect(capabilities.providerProfileUrl);
  }

  const { token } = await params;
  const t = await getTranslations("auth.verifyEmail");

  const isValid = typeof token === "string" && TOKEN_REGEX.test(token);
  const result = isValid
    ? await verifyEmailServerSide(token)
    : ({ success: false, errorKey: "invalidVerificationCode" } as const);

  return (
    <AuthSplitLayout>
      <div className="w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--neutral-12)]">
            {result.success ? t("successTitle") : t("failureTitle")}
          </h1>
        </div>
        {result.success ? (
          <VerifyEmailResult success />
        ) : (
          <VerifyEmailResult success={false} errorKey={result.errorKey} />
        )}
      </div>
    </AuthSplitLayout>
  );
}

export default function VerifyEmailPage(props: PageProps) {
  return (
    <Suspense>
      <VerifyEmailPageContent {...props} />
    </Suspense>
  );
}
