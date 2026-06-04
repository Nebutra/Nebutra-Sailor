import { sanitizeReturnUrl } from "@nebutra/auth";
import { connection } from "next/server";
import { Suspense } from "react";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { SignUpForm } from "@/components/auth/sign-up-form";

type SearchParams = { returnUrl?: string; returnTo?: string; redirect?: string };

async function SignUpPageContent({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await connection();
  const query = await searchParams;
  const sanitized = sanitizeReturnUrl(query.returnUrl ?? query.returnTo ?? query.redirect);
  const returnUrl = sanitized === "/" ? undefined : sanitized;

  return (
    <AuthSplitLayout>
      <SignUpForm returnUrl={returnUrl} />
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
