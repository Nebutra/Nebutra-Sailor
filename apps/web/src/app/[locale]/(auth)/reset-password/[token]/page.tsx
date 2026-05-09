import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getSecurityCapabilities } from "@/lib/auth/security-capabilities";

interface PageProps {
  params: Promise<{ locale: string; token: string }>;
}

const TOKEN_REGEX = /^[A-Za-z0-9._-]{8,}$/;

async function ResetPasswordPageContent({ params }: PageProps) {
  await connection();

  const capabilities = getSecurityCapabilities();
  if (capabilities.provider === "clerk" && capabilities.providerProfileUrl) {
    redirect(capabilities.providerProfileUrl);
  }

  const { token } = await params;
  const t = await getTranslations("auth.resetPassword");
  const isValid = typeof token === "string" && TOKEN_REGEX.test(token);

  return (
    <AuthSplitLayout>
      <div className="w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--neutral-12)]">
            {t("title")}
          </h1>
          <p className="mt-4 text-sm leading-6 text-[var(--neutral-10)]">{t("description")}</p>
        </div>
        {isValid ? (
          <ResetPasswordForm token={token} />
        ) : (
          <section
            aria-live="polite"
            className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6"
            role="alert"
          >
            <h3 className="text-sm font-medium text-[var(--neutral-12)]">{t("invalidTitle")}</h3>
            <p className="mt-2 text-sm text-[var(--neutral-11)]">{t("invalidDescription")}</p>
          </section>
        )}
      </div>
    </AuthSplitLayout>
  );
}

export default function ResetPasswordPage(props: PageProps) {
  return (
    <Suspense>
      <ResetPasswordPageContent {...props} />
    </Suspense>
  );
}
