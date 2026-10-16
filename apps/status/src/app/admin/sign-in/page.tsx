import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SignInForm } from "@/components/admin/auth-forms";
import { adminLocale, currentMember } from "@/lib/admin";
import { setupAvailable } from "@/server/auth";
import { getDb } from "@/server/db";
import { AuthFrame } from "../auth-frame";

export default async function SignInPage() {
  if (await currentMember()) redirect("/admin/incidents");
  const t = await getTranslations({ locale: await adminLocale(), namespace: "admin" });
  const canSetUp = await setupAvailable(getDb());
  return (
    <AuthFrame title={t("signIn.title")} body={t("signIn.body")}>
      <SignInForm />
      {canSetUp ? (
        <a
          href="/admin/setup"
          className="mt-6 block text-sm text-muted-foreground hover:text-foreground"
        >
          {t("signIn.setupLink")}
        </a>
      ) : null}
    </AuthFrame>
  );
}
