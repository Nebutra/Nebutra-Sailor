import { getTranslations } from "next-intl/server";
import { AuthSplitLayout } from "@/components/auth-split-layout";
import { ResetPasswordForm } from "@/components/reset-password-form";

export const dynamic = "force-dynamic";

/**
 * Better Auth may deliver tokens as:
 * - /reset-password?token=...
 * - /reset-password/<token>
 */
export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ token?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ token: slug }, query] = await Promise.all([params, searchParams]);
  const tokenFromQuery = typeof query.token === "string" ? query.token : null;
  const token = tokenFromQuery || slug?.[0] || "";
  const t = await getTranslations("auth.resetPassword");

  return (
    <AuthSplitLayout>
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="w-full">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {t("invalidTitle")}
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">{t("invalidDescription")}</p>
        </div>
      )}
    </AuthSplitLayout>
  );
}
