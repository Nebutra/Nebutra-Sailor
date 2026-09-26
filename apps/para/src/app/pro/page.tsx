import { Button, Card } from "@nebutra/ui/primitives";
import { HomeTopBar } from "@/components/home/home-top-bar";
import { checkoutFor, loadOffers, type ParaOffer, priceLabel } from "@/lib/billing";

export const dynamic = "force-dynamic";
export const metadata = { title: "Plans & credits" };

function MembershipCard({ tier, offers }: { tier: string; offers: ParaOffer[] }) {
  const month = offers.find((o) => o.grants.days === 30);
  const year = offers.find((o) => o.grants.days === 365);
  const monthly = (month ?? year)?.grants.monthlyCredits ?? 0;
  return (
    <Card className="flex flex-col gap-2 p-5">
      <h3 className="font-medium text-foreground text-body capitalize">{tier}</h3>
      <p className="text-muted-foreground text-label">
        {monthly.toLocaleString("en-US")} credits every month, for your organization
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {month ? (
          <Button asChild variant="ink" size="sm">
            <a href={checkoutFor(month.id)}>Monthly · {priceLabel(month)}</a>
          </Button>
        ) : null}
        {year ? (
          <Button asChild variant="outline" size="sm">
            <a href={checkoutFor(year.id)}>Yearly · {priceLabel(year)}</a>
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

/**
 * Plans & credits (ADR 2026-09-27 product wallets), in the shape RunningHub and
 * LibTV sell: a membership that grants credits monthly, which lapse at the
 * month's end, plus packs that last two years. Paying happens on the one
 * checkout page, which returns here.
 */
export default async function ProPage() {
  const offers = await loadOffers();
  const memberships = (offers ?? []).filter((o) => o.kind === "membership");
  const packs = (offers ?? []).filter((o) => o.kind === "credits");
  const tiers = [...new Set(memberships.map((o) => o.grants.tier ?? ""))].filter(Boolean);

  return (
    <div className="flex min-h-full flex-col">
      <HomeTopBar />
      <main className="mx-auto w-full max-w-para-surface flex-1 px-6 pt-16 pb-24">
        <h1 className="mb-2 font-medium text-display text-foreground tracking-tight">
          Plans & credits
        </h1>
        <p className="mb-10 max-w-para-focus text-muted-foreground">
          A plan's monthly credits are spent first and lapse at the end of their month. Credits from
          a pack last two years.
        </p>

        {offers === null ? (
          <p className="text-muted-foreground">
            Prices could not be loaded. Try again in a moment.
          </p>
        ) : null}

        {tiers.length > 0 ? (
          <section aria-labelledby="plans" className="mb-12">
            <h2 id="plans" className="mb-4 font-medium text-foreground text-body">
              Plans
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {tiers.map((tier) => (
                <MembershipCard
                  key={tier}
                  tier={tier}
                  offers={memberships.filter((o) => o.grants.tier === tier)}
                />
              ))}
            </div>
          </section>
        ) : null}

        {packs.length > 0 ? (
          <section aria-labelledby="packs">
            <h2 id="packs" className="mb-4 font-medium text-foreground text-body">
              Credit packs
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {packs.map((pack) => (
                <Card key={pack.id} className="flex flex-col gap-2 p-5">
                  <h3 className="font-medium text-foreground text-body">
                    {(pack.grants.credits ?? 0).toLocaleString("en-US")} credits
                  </h3>
                  <p className="text-muted-foreground text-label">Valid for two years</p>
                  <Button asChild variant="outline" size="sm" className="mt-3 self-start">
                    <a href={checkoutFor(pack.id)}>{priceLabel(pack)}</a>
                  </Button>
                </Card>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
