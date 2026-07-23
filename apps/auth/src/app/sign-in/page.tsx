import { isAuthFeatureEnabled } from "@nebutra/auth";
import { AuthSplitLayout } from "@/components/auth-split-layout";
import { CredentialsForm } from "@/components/credentials-form";
import { detectEnabledOAuthProviders } from "@/lib/oauth-providers";
import { resolvePostLoginReturnTo } from "@/lib/return-to";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const raw =
    (typeof query.returnTo === "string" && query.returnTo) ||
    (typeof query.returnUrl === "string" && query.returnUrl) ||
    (typeof query.redirect === "string" && query.redirect) ||
    null;

  const returnTo = resolvePostLoginReturnTo(raw);
  const enabledOAuthProviders = detectEnabledOAuthProviders();
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined;
  const [magicLinkEnabled, passkeyEnabled] = await Promise.all([
    isAuthFeatureEnabled("magicLink"),
    isAuthFeatureEnabled("passkeys"),
  ]);

  return (
    <AuthSplitLayout>
      <CredentialsForm
        mode="sign-in"
        returnTo={returnTo}
        enabledOAuthProviders={enabledOAuthProviders}
        magicLinkEnabled={magicLinkEnabled}
        passkeyEnabled={passkeyEnabled}
        turnstileSiteKey={turnstileSiteKey}
      />
    </AuthSplitLayout>
  );
}
