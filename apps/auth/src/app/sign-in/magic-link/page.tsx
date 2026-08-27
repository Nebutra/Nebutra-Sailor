import { isAuthFeatureEnabled } from "@nebutra/auth";
import { redirect } from "next/navigation";
import { AuthSplitLayout } from "@/components/auth-split-layout";
import { MagicLinkForm } from "@/components/magic-link-form";
import { resolvePostLoginReturnTo } from "@/lib/return-to";

export const dynamic = "force-dynamic";

export default async function MagicLinkPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const enabled = await isAuthFeatureEnabled("magicLink");
  const query = await searchParams;
  const raw =
    (typeof query.returnTo === "string" && query.returnTo) ||
    (typeof query.returnUrl === "string" && query.returnUrl) ||
    null;
  const returnTo = resolvePostLoginReturnTo(raw);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined;

  if (!enabled) {
    redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  }

  return (
    <AuthSplitLayout>
      <MagicLinkForm returnTo={returnTo} turnstileSiteKey={turnstileSiteKey} />
    </AuthSplitLayout>
  );
}
