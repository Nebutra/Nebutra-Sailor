import { isAuthFeatureEnabled, sanitizeReturnUrl } from "@nebutra/auth";
import { connection } from "next/server";
import { Suspense } from "react";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { MagicLinkPanel } from "@/components/auth/magic-link-panel";
import { PasskeyPanel } from "@/components/auth/passkey-panel";
import { SignInForm } from "@/components/auth/sign-in-form";
import { detectEnabledOAuthProviders } from "@/lib/auth/oauth-providers";

/**
 * Catchall route — `/sign-in`, `/sign-in/magic-link`, etc. all hit this page.
 * We dispatch on the first slug segment to render the right panel inside the
 * shared split layout.
 */

type SearchParams = { returnUrl?: string; returnTo?: string; redirect?: string };

async function SignInPageContent({
  params,
  searchParams,
}: {
  params: Promise<{ "sign-in"?: string[] }>;
  searchParams: Promise<SearchParams>;
}) {
  await connection();
  const [{ "sign-in": slug }, query] = await Promise.all([params, searchParams]);
  const sanitized = sanitizeReturnUrl(query.returnUrl ?? query.returnTo ?? query.redirect);
  const returnUrl = sanitized === "/" ? undefined : sanitized;
  const subroute = slug?.[0];

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined;

  if (subroute === "magic-link") {
    return (
      <AuthSplitLayout>
        <MagicLinkPanel returnUrl={returnUrl} turnstileSiteKey={turnstileSiteKey} />
      </AuthSplitLayout>
    );
  }

  if (subroute === "passkey") {
    return (
      <AuthSplitLayout>
        <PasskeyPanel returnUrl={returnUrl} />
      </AuthSplitLayout>
    );
  }

  const [magicLinkEnabled, passkeyEnabled] = await Promise.all([
    isAuthFeatureEnabled("magicLink"),
    isAuthFeatureEnabled("passkeys"),
  ]);

  return (
    <AuthSplitLayout>
      <SignInForm
        enabledOAuthProviders={detectEnabledOAuthProviders()}
        returnUrl={returnUrl}
        magicLinkEnabled={magicLinkEnabled}
        passkeyEnabled={passkeyEnabled}
        turnstileSiteKey={turnstileSiteKey}
      />
    </AuthSplitLayout>
  );
}

export default function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ "sign-in"?: string[] }>;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense>
      <SignInPageContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
