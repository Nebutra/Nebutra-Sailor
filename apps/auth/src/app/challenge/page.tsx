import { AuthSplitLayout } from "@/components/auth-split-layout";
import { TurnstileChallengeForm } from "@/components/turnstile-challenge-form";

export const dynamic = "force-dynamic";

/**
 * Standalone bot challenge after the user submits credentials / email.
 * Keeps Turnstile off the sign-in form so the password → submit column stays aligned.
 */
export default async function ChallengePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  // Relative path only (allow query/hash); reject protocol-relative //evil.
  const rawCancel = typeof query.cancelTo === "string" ? query.cancelTo : "";
  const cancelTo =
    rawCancel.startsWith("/") && !rawCancel.startsWith("//") ? rawCancel : "/sign-in";
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

  if (!turnstileSiteKey) {
    // Misconfiguration — nothing to challenge; send them back.
    const { redirect } = await import("next/navigation");
    redirect(cancelTo);
  }

  return (
    <AuthSplitLayout>
      <TurnstileChallengeForm turnstileSiteKey={turnstileSiteKey} cancelTo={cancelTo} />
    </AuthSplitLayout>
  );
}
