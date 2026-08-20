import { brand } from "@nebutra/brand/metadata";
import { ReferralPanel } from "@/components/growth/referral-panel";
import { requireOrg } from "@/lib/auth";

export const metadata = { title: "Referrals — Settings" };

export default async function ReferralsPage() {
  await requireOrg();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-foreground">Referrals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Share your code, track who joined, and see where you sit on the {brand.name} referral
          ladder.
        </p>
      </header>

      <ReferralPanel />
    </div>
  );
}
