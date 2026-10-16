import { brand } from "@nebutra/brand/metadata";
import { PageHeader } from "@nebutra/ui/layout";
import { getTranslations } from "next-intl/server";
import { ReferralPanel } from "@/components/growth/referral-panel";
import { requireOrg } from "@/lib/auth";

export const metadata = { title: "Referrals — Settings" };

export default async function ReferralsPage() {
  const tc = await getTranslations("copy.referralsPage");
  await requireOrg();

  return (
    <div className="space-y-6">
      <PageHeader
        size="section"
        title={tc("referrals")}
        description={tc("shareYourCodeTrack", { name: String(brand.name) })}
      />

      <ReferralPanel />
    </div>
  );
}
