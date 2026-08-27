import { AuthSplitLayout } from "@/components/auth-split-layout";
import { CredentialsForm } from "@/components/credentials-form";
import { isAccessGateEnabled } from "@/lib/access-gate-mode";
import { detectEnabledOAuthProviders } from "@/lib/oauth-providers";
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
  const enabledOAuthProviders = detectEnabledOAuthProviders();
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined;
  const initialInviteCode = typeof query.invite === "string" ? query.invite : "";
  const tenantId =
    typeof query.tenantId === "string" && query.tenantId.trim() ? query.tenantId : undefined;

  return (
    <AuthSplitLayout>
      <CredentialsForm
        mode="sign-up"
        returnTo={returnTo}
        enabledOAuthProviders={enabledOAuthProviders}
        turnstileSiteKey={turnstileSiteKey}
        accessGateEnabled={isAccessGateEnabled()}
        initialInviteCode={initialInviteCode}
        tenantId={tenantId}
        wechatAppId={process.env.NEXT_PUBLIC_WECHAT_APP_ID}
      />
    </AuthSplitLayout>
  );
}
