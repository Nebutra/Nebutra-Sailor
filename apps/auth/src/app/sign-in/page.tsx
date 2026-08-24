import { isAuthFeatureEnabled } from "@nebutra/auth";
import { AuthSplitLayout } from "@/components/auth-split-layout";
import { CredentialsForm } from "@/components/credentials-form";
import { isAccessGateEnabled } from "@/lib/access-gate-mode";
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
  const oauthErrorCode =
    typeof query.error === "string" && query.error.trim() ? query.error.trim() : null;
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
        oauthErrorCode={oauthErrorCode}
        accessGateEnabled={isAccessGateEnabled()}
        wechatAppId={process.env.NEXT_PUBLIC_WECHAT_APP_ID}
      />
    </AuthSplitLayout>
  );
}
