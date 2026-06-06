import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { FooterMinimal, Navbar } from "@/components/landing";
import { VcProfile } from "@/components/landing/solutions/vc/VcProfile";
import { type Locale, routing } from "@/i18n/routing";
import { CHINA_VC_ORGS, chinaVcLogoFor, getChinaVc } from "@/lib/constants/china-vc";
import { similarVcs } from "@/lib/constants/vc";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ lang: string; id: string }> };

export const dynamicParams = true;

export function generateStaticParams() {
  return CHINA_VC_ORGS.map((o) => ({ lang: routing.defaultLocale, id: String(o.id) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, id } = await params;
  if (!hasLocale(routing.locales, lang)) return {};
  const org = getChinaVc(Number(id));
  if (!org) return {};
  const zh = lang === "zh";
  return buildPageMetadata({
    title: zh ? `${org.name} — 投资机构画像 | Nebutra` : `${org.name} — Investor Profile | Nebutra`,
    description:
      org.summary ||
      (zh
        ? `${org.name} 的投资主线、赛道、阶段与代表案例。`
        : `${org.name}: investment focus, sectors, stages and notable portfolio.`),
    path: `/solutions/china-vc/${org.id}`,
    locale: lang as Locale,
  });
}

export default async function ChinaVcProfilePage({ params }: Props) {
  const { lang, id } = await params;
  setRequestLocale(lang as Locale);

  const raw = getChinaVc(Number(id));
  if (!raw) notFound();

  const org = { ...raw, logo: chinaVcLogoFor(raw) };
  const similar = similarVcs(raw, CHINA_VC_ORGS).map((o) => ({ ...o, logo: chinaVcLogoFor(o) }));

  return (
    <main id="main-content" className="relative min-h-screen overflow-hidden bg-background">
      <Navbar />
      <VcProfile
        org={org}
        similar={similar}
        locale={lang as Locale}
        directoryLabel={lang === "zh" ? "中国 VC" : "China VC"}
        hrefBase="/solutions/china-vc"
        variant="deals"
      />
      <FooterMinimal showFinalCta />
    </main>
  );
}
