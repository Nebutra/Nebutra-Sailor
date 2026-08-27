import { AuthSplitLayout } from "@/components/auth-split-layout";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { resolvePostLoginReturnTo } from "@/lib/return-to";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const raw =
    (typeof query.returnTo === "string" && query.returnTo) ||
    (typeof query.returnUrl === "string" && query.returnUrl) ||
    null;
  const returnTo = resolvePostLoginReturnTo(raw);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined;

  return (
    <AuthSplitLayout>
      <ForgotPasswordForm returnTo={returnTo} turnstileSiteKey={turnstileSiteKey} />
    </AuthSplitLayout>
  );
}
