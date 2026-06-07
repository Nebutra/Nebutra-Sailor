import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getAuth } from "@/lib/auth";
import { getSecurityCapabilities } from "@/lib/auth/security-capabilities";

async function ForgotPasswordPageContent() {
  await connection();

  // Clerk owns its own hosted forgot-password flow.
  const capabilities = getSecurityCapabilities();
  if (capabilities.provider === "clerk" && capabilities.providerProfileUrl) {
    redirect(capabilities.providerProfileUrl);
  }

  const { isSignedIn } = await getAuth();
  if (isSignedIn) {
    redirect("/");
  }

  const t = await getTranslations("auth.forgotPassword");

  return (
    <AuthSplitLayout>
      <div className="w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--neutral-12)]">
            {t("title")}
          </h1>
          <p className="mt-4 text-sm leading-6 text-[var(--neutral-10)]">{t("description")}</p>
        </div>
        <ForgotPasswordForm />
      </div>
    </AuthSplitLayout>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordPageContent />
    </Suspense>
  );
}
