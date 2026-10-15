import { brand } from "@nebutra/brand/metadata";
import { getTranslations } from "next-intl/server";
import { ReferralPanel } from "@/components/growth/referral-panel";
import { requireOrg } from "@/lib/auth";

export const metadata = { title: "Referrals — Settings" };

export default async function ReferralsPage() {
  const tc = await getTranslations("copy.referralsPage");
  await requireOrg();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-foreground">{tc("referrals")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {tc("shareYourCodeTrack", { name: String(brand.name) })}
        </p>
      </header>

      <ReferralPanel />
    </div>
  );
}
