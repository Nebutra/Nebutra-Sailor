import { sanitizeReturnUrl } from "@nebutra/auth";
import { connection } from "next/server";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { LoginSuccessHandoff } from "@/components/auth/login-success-handoff";

type SearchParams = { returnUrl?: string; returnTo?: string; redirect?: string };

export default async function LoginSuccessPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await connection();
  const query = await searchParams;
  const sanitized = sanitizeReturnUrl(query.returnUrl ?? query.returnTo ?? query.redirect);
  const redirectTo = sanitized === "/login/success" ? "/" : sanitized;

  return (
    <AuthSplitLayout>
      <LoginSuccessHandoff redirectTo={redirectTo} />
    </AuthSplitLayout>
  );
}
