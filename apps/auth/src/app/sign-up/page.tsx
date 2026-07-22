import { AuthSplitLayout } from "@/components/auth-split-layout";
import { CredentialsForm } from "@/components/credentials-form";
import { resolvePostLoginReturnTo } from "@/lib/return-to";

export const dynamic = "force-dynamic";

export default async function SignUpPage({
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
      <CredentialsForm mode="sign-up" returnTo={returnTo} />
    </AuthSplitLayout>
  );
}
