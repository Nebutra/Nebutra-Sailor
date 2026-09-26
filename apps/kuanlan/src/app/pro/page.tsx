import { QuietPage } from "@/components/QuietPage";
import { getServerSession } from "@/lib/auth";
import { creditBalance, shootPriceCredits } from "@/lib/credits";
import { DbUnavailableError, tenantDbFor } from "@/lib/db";
import { accountOf, checkoutFor, type KuanlanOffer, loadOffers } from "@/lib/pro";
import { formatDay } from "@/lib/when";

export const dynamic = "force-dynamic";
export const metadata = { title: "观澜 Pro" };

const TIER_NAMES: Record<string, string> = { pro: "Pro", max: "Max" };

function price(offer: KuanlanOffer | undefined): string | null {
  if (!offer?.prices) return null;
  const parts = [];
  if (offer.prices.CNY !== undefined) parts.push(`¥${offer.prices.CNY}`);
  if (offer.prices.USD !== undefined) parts.push(`$${offer.prices.USD}`);
  return parts.join(" / ");
}

/**
 * 观澜 Pro — what 观澜 sells, in the shape 剪映 sells it (ADR 2026-09-27): a
 * membership that grants credits every month, which lapse at the month's end,
 * and credit packs that last two years. Buying opens the one checkout page and
 * comes back here.
 */
export default async function ProPage() {
  const offers = await loadOffers();
  const perShot = shootPriceCredits();
  const session = await getServerSession();

  let account: Awaited<ReturnType<typeof accountOf>> | null = null;
  let balance: number | null = null;
  if (session?.userId) {
    try {
      const { tenant } = await tenantDbFor(session);
      [account, balance] = await Promise.all([
        accountOf(tenant.tenantId),
        creditBalance(tenant.tenantId),
      ]);
    } catch (error) {
      if (!(error instanceof DbUnavailableError)) throw error;
    }
  }

  const memberships = (offers ?? []).filter((o) => o.kind === "membership");
  const packs = (offers ?? []).filter((o) => o.kind === "credits");
  const tiers = [...new Set(memberships.map((o) => o.grants.tier ?? ""))].filter(Boolean);
  const soonest = account?.expiring[0];

  return (
    <QuietPage
      active="/pro"
      title="观澜 Pro"
      line="会员每月送额度，当月用完为止；另买的额度两年内有效。先用快到期的。"
    >
      {balance !== null ? (
        <dl className="ledger">
          <div className="ledger-item">
            <dd className="ledger-figure ledger-figure-sm">
              {account?.membership
                ? `${TIER_NAMES[account.membership.tier] ?? account.membership.tier} · 到 ${formatDay(account.membership.endsAt)}`
                : "还没开通"}
            </dd>
            <dt>会员</dt>
          </div>
          <div className="ledger-item">
            <dd className="ledger-figure">{balance}</dd>
            <dt>
              还能用的额度 · 每张 {perShot}
              {soonest ? `，其中 ${soonest.remaining} 在 ${formatDay(soonest.expiresAt)} 到期` : ""}
            </dt>
          </div>
        </dl>
      ) : null}

      {offers === null ? <p className="note">价格暂时读不到，过一会儿再来。</p> : null}

      {tiers.length > 0 ? (
        <>
          <h2 className="section-title">会员</h2>
          <ul className="plan-grid">
            {tiers.map((tier) => {
              const month = memberships.find((o) => o.grants.tier === tier && o.grants.days === 30);
              const year = memberships.find((o) => o.grants.tier === tier && o.grants.days === 365);
              const monthly = (month ?? year)?.grants.monthlyCredits ?? 0;
              return (
                <li key={tier} className="plan-card">
                  <h3 className="plan-name">{TIER_NAMES[tier] ?? tier}</h3>
                  <p className="plan-line">
                    每月 {monthly} 额度，够拍 {Math.floor(monthly / perShot)} 张
                  </p>
                  <div className="plan-actions">
                    {month ? (
                      <a className="pill pill-ink" href={checkoutFor(month.id)}>
                        月卡 {price(month)}
                      </a>
                    ) : null}
                    {year ? (
                      <a className="pill pill-ghost" href={checkoutFor(year.id)}>
                        年卡 {price(year)}
                      </a>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}

      {packs.length > 0 ? (
        <>
          <h2 className="section-title">额度包</h2>
          <ul className="plan-grid">
            {packs.map((pack) => (
              <li key={pack.id} className="plan-card">
                <h3 className="plan-name">{pack.grants.credits ?? 0} 额度</h3>
                <p className="plan-line">
                  够拍 {Math.floor((pack.grants.credits ?? 0) / perShot)} 张，两年内有效
                </p>
                <div className="plan-actions">
                  <a className="pill pill-ghost" href={checkoutFor(pack.id)}>
                    {price(pack)}
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <p className="note">付款在统一收银台完成，支付宝、微信、银行卡都可以，付完自动回到这里。</p>
    </QuietPage>
  );
}
