import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getAuth } from "@/lib/auth";

async function ForgotPasswordPageContent() {
  await connection();

  const { isSignedIn } = await getAuth();
  if (isSignedIn) {
    redirect("/");
  }

  const t = await getTranslations("auth.forgotPassword");

  return (
    <AuthSplitLayout>
      <div className="w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">{t("description")}</p>
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
