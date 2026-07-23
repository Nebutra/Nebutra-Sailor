import {
  buildAuthCenterSignInUrl,
  getAuthCenterOrigin,
  getConfiguredAuthProvider,
  isAuthFeatureEnabled,
  sanitizeReturnUrl,
} from "@nebutra/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { ClerkEnterpriseSsoHandoff } from "@/components/auth/clerk-enterprise-sso-handoff";
import { MagicLinkPanel } from "@/components/auth/magic-link-panel";
import { PasskeyPanel } from "@/components/auth/passkey-panel";
import { SignInForm } from "@/components/auth/sign-in-form";
import { detectEnabledOAuthProviders } from "@/lib/auth/oauth-providers";
import { extractEmailDomain } from "@/lib/auth/sso-discovery";

/**
 * Better Auth multi-app RP: this route only renders a local UI for Clerk.
 * Default (better-auth) always soft-redirects to auth.nebutra.com so there
 * is a single login entry. Proxy already 307s; this is a belt-and-suspenders
 * fallback if middleware is bypassed.
 */

type SearchParams = {
  returnUrl?: string;
  returnTo?: string;
  redirect?: string;
  identifier?: string;
  providerName?: string;
};

function resolveAppOrigin(headerStore: Headers): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (configured?.startsWith("http")) return configured;
  const xfHost = headerStore.get("x-forwarded-host")?.split(",")[0]?.trim();
  const xfProto = headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  if (xfHost && !xfHost.startsWith("0.0.0.0") && xfHost !== "127.0.0.1" && xfHost !== "localhost") {
    return `${xfProto}://${xfHost}`;
  }
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://app.nebutra.com";
}

async function SignInPageContent({
  params,
  searchParams,
}: {
  params: Promise<{ "sign-in"?: string[] }>;
  searchParams: Promise<SearchParams>;
}) {
  await connection();
  const [{ "sign-in": slug }, query, headerStore] = await Promise.all([
    params,
    searchParams,
    headers(),
  ]);
  const sanitized = sanitizeReturnUrl(query.returnUrl ?? query.returnTo ?? query.redirect);
  const returnUrl = sanitized === "/" ? undefined : sanitized;
  const subroute = slug?.[0];
  const provider = getConfiguredAuthProvider();

  // Single entry: funnel to auth-center unless this host IS the auth center
  // (shared code) or we are on Clerk (hosted UI stays on app).
  if (provider !== "clerk") {
    const authOrigin = getAuthCenterOrigin();
    const thisOrigin = resolveAppOrigin(headerStore);
    let isAuthCenterHost = false;
    try {
      isAuthCenterHost = new URL(authOrigin).host === new URL(thisOrigin).host;
    } catch {
      isAuthCenterHost = false;
    }
    if (!isAuthCenterHost) {
      const returnTo = returnUrl || `${thisOrigin}/dashboard`;
      // Preserve subroutes as query only — magic/passkey live on auth-center.
      if (subroute === "magic-link") {
        redirect(
          `${authOrigin.replace(/\/$/, "")}/sign-in/magic-link?returnTo=${encodeURIComponent(returnTo)}`,
        );
      }
      if (subroute === "passkey") {
        redirect(
          `${authOrigin.replace(/\/$/, "")}/sign-in?returnTo=${encodeURIComponent(returnTo)}`,
        );
      }
      redirect(buildAuthCenterSignInUrl(returnTo));
    }
  }

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

  if (subroute === "sso") {
    const identifier = query.identifier?.trim().toLowerCase() ?? "";
    if (provider !== "clerk" || !extractEmailDomain(identifier)) {
      redirect(returnUrl ? `/sign-in?returnUrl=${encodeURIComponent(returnUrl)}` : "/sign-in");
    }

    return (
      <AuthSplitLayout>
        <ClerkEnterpriseSsoHandoff
          identifier={identifier}
          providerName={query.providerName?.trim() || "Enterprise SSO"}
          returnUrl={returnUrl}
        />
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
