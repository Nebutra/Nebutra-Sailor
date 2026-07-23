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
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">{t("description")}</p>
        </div>
        {isValid ? (
          <ResetPasswordForm token={token} />
        ) : (
          <section
            aria-live="polite"
            className="rounded-[var(--radius-lg)] border border-border bg-background p-6"
            role="alert"
          >
            <h3 className="text-sm font-medium text-foreground">{t("invalidTitle")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t("invalidDescription")}</p>
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
