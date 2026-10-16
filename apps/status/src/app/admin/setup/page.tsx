import { getTranslations } from "next-intl/server";
import { SetupForm } from "@/components/admin/auth-forms";
import { adminLocale } from "@/lib/admin";
import { setupAvailable } from "@/server/auth";
import { getDb } from "@/server/db";
import { AuthFrame } from "../auth-frame";

export default async function SetupPage() {
  const t = await getTranslations({ locale: await adminLocale(), namespace: "admin.setup" });
  if (!(await setupAvailable(getDb()))) {
    return (
      <AuthFrame title={t("closedTitle")} body={t("closedBody")}>
        <a href="/admin/sign-in" className="text-sm text-foreground underline underline-offset-4">
          {t("toSignIn")}
        </a>
      </AuthFrame>
    );
  }
  return (
    <AuthFrame title={t("title")} body={t("body")}>
      <SetupForm />
    </AuthFrame>
  );
}
