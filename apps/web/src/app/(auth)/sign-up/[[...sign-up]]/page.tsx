import {
  buildAuthCenterSignUpUrl,
  getAuthCenterOrigin,
  getConfiguredAuthProvider,
  sanitizeReturnUrl,
} from "@nebutra/auth";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { detectEnabledOAuthProviders } from "@/lib/auth/oauth-providers";

type SearchParams = {
  returnUrl?: string;
  returnTo?: string;
  redirect?: string;
  invite?: string;
  tenantId?: string;
};

function resolveAppOrigin(headerStore: Headers): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (configured?.startsWith("http")) return configured;
  const xfHost = headerStore.get("x-forwarded-host")?.split(",")[0]?.trim();
  const xfProto = headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  if (xfHost && !xfHost.startsWith("0.0.0.0") && xfHost !== "127.0.0.1" && xfHost !== "localhost") {
    return `${xfProto}://${xfHost}`;
  }
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || getBrandOrigin("app");
}

async function SignUpPageContent({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await connection();
  const [query, headerStore] = await Promise.all([searchParams, headers()]);
  const sanitized = sanitizeReturnUrl(query.returnUrl ?? query.returnTo ?? query.redirect);
  const returnUrl = sanitized === "/" ? undefined : sanitized;
  const provider = getConfiguredAuthProvider();

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
      const returnTo = returnUrl || `${thisOrigin}/onboarding`;
      const dest = new URL(buildAuthCenterSignUpUrl(returnTo));
      const invite = query.invite?.trim();
      const tenantId = query.tenantId?.trim();
      if (invite) dest.searchParams.set("invite", invite);
      if (tenantId) dest.searchParams.set("tenantId", tenantId);
      redirect(dest.toString());
    }
  }

  return (
    <AuthSplitLayout>
      <SignUpForm enabledOAuthProviders={detectEnabledOAuthProviders()} returnUrl={returnUrl} />
    </AuthSplitLayout>
  );
}

export default function SignUpPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <Suspense>
      <SignUpPageContent searchParams={searchParams} />
    </Suspense>
  );
}
