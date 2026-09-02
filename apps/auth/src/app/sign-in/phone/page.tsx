import { redirect } from "next/navigation";
import { AuthSplitLayout } from "@/components/auth-split-layout";
import { PhoneLoginForm } from "@/components/phone-login-form";
import { isAccessGateEnabled } from "@/lib/access-gate-mode";
import { detectEnabledPhoneProviders } from "@/lib/phone-login";
import { resolvePostLoginReturnTo } from "@/lib/return-to";

export const dynamic = "force-dynamic";

export default async function PhoneSignInPage({
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
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
  const phoneEnabled = detectEnabledPhoneProviders().includes("twilio");

  if (!phoneEnabled || !turnstileSiteKey || isAccessGateEnabled()) {
    redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  }

  return (
    <AuthSplitLayout>
      <PhoneLoginForm returnTo={returnTo} turnstileSiteKey={turnstileSiteKey} />
    </AuthSplitLayout>
  );
}
