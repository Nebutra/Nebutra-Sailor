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

  return (
    <AuthSplitLayout>
      <ForgotPasswordForm returnTo={returnTo} />
    </AuthSplitLayout>
  );
}
