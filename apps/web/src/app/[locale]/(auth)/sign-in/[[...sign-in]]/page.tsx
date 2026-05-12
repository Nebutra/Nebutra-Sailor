import { isAuthFeatureEnabled, sanitizeReturnUrl } from "@nebutra/auth";
import { connection } from "next/server";
import { Suspense } from "react";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { MagicLinkPanel } from "@/components/auth/magic-link-panel";
import type { OAuthProvider } from "@/components/auth/oauth-buttons";
import { SignInForm } from "@/components/auth/sign-in-form";

/**
 * Catchall route — `/sign-in`, `/sign-in/magic-link`, etc. all hit this page.
 * We dispatch on the first slug segment to render the right panel inside the
 * shared split layout.
 */

function detectEnabledOAuthProviders(): readonly OAuthProvider[] {
  const enabled: OAuthProvider[] = [];
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) enabled.push("google");
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) enabled.push("github");
  if (process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET) enabled.push("apple");
  if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET)
    enabled.push("microsoft");
  return enabled;
}

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

  if (subroute === "magic-link") {
    return (
      <AuthSplitLayout>
        <MagicLinkPanel returnUrl={returnUrl} />
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
