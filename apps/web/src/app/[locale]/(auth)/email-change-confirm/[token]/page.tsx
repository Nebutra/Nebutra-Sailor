import { headers } from "next/headers";
import Link from "next/link";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { resolveServerRequestOrigin } from "@/lib/auth";

interface PageProps {
  params: Promise<{ locale: string; token: string }>;
}

const TOKEN_REGEX = /^[A-Za-z0-9._-]{8,}$/;

interface ConfirmResult {
  success: boolean;
  newEmail?: string;
  errorCode?: string;
}

async function confirmEmailChange(token: string): Promise<ConfirmResult> {
  try {
    const requestHeaders = new Headers(await headers());
    const origin = resolveServerRequestOrigin(requestHeaders);
    const response = await fetch(`${origin}/api/account/email-change/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Forward cookies so an authenticated user passes the session check.
      // Note: server-side `fetch` from RSC does not auto-forward cookies,
      // so we explicitly forward them here.
      cache: "no-store",
    });
    if (response.ok) {
      const body = (await response.json().catch(() => ({}))) as { newEmail?: string };
      return { success: true, newEmail: body.newEmail };
    }
    const body = (await response.json().catch(() => ({}))) as { code?: string };
    return { success: false, errorCode: body.code ?? "UNKNOWN" };
  } catch {
    return { success: false, errorCode: "NETWORK" };
  }
}

async function EmailChangeConfirmContent({ params }: PageProps) {
  await connection();
  const { token } = await params;
  const t = await getTranslations("account.emailChange.confirm");

  const isValid = typeof token === "string" && TOKEN_REGEX.test(token);
  const result = isValid
    ? await confirmEmailChange(token)
    : ({ success: false, errorCode: "INVALID_TOKEN" } as const);

  return (
    <AuthSplitLayout>
      <div className="w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--neutral-12)]">
            {result.success ? t("successTitle") : t("failureTitle")}
          </h1>
        </div>
        <section
          aria-live="polite"
          className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6 text-center"
        >
          {result.success ? (
            <>
              <div
                aria-hidden
                className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--status-success)_15%,transparent)] text-lg text-[color:var(--status-success)]"
              >
                ✓
              </div>
              <p className="mt-4 text-sm text-[var(--neutral-11)]">
                {result.newEmail
                  ? t("successWithEmail", { email: result.newEmail })
                  : t("successDescription")}
              </p>
              <div className="mt-5">
                <Link
                  href="/settings/account"
                  className="inline-flex items-center justify-center rounded-md bg-[var(--neutral-12)] px-4 py-2 text-sm font-medium text-[var(--neutral-1)] hover:bg-[var(--neutral-11)]"
                >
                  {t("continueCta")}
                </Link>
              </div>
            </>
          ) : (
            <>
              <div
                aria-hidden
                className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--status-warning)_15%,transparent)] text-lg text-[color:var(--status-warning)]"
              >
                ⚠
              </div>
              <p className="mt-4 text-sm text-[var(--neutral-11)]" role="alert">
                {t("failureDescription")}
              </p>
              <p className="mt-1 text-xs text-[var(--neutral-11)]">
                {t("errorCode", { code: result.errorCode ?? "UNKNOWN" })}
              </p>
              <div className="mt-5">
                <Link
                  href="/settings/account"
                  className="inline-flex items-center justify-center rounded-md border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-4 py-2 text-sm font-medium text-[var(--neutral-12)] hover:bg-[var(--neutral-2)]"
                >
                  {t("backCta")}
                </Link>
              </div>
            </>
          )}
        </section>
      </div>
    </AuthSplitLayout>
  );
}

export default function EmailChangeConfirmPage(props: PageProps) {
  return (
    <Suspense>
      <EmailChangeConfirmContent {...props} />
    </Suspense>
  );
}
