import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { FooterMinimal, Navbar } from "@/components/landing";
import { VcProfile } from "@/components/landing/solutions/vc/VcProfile";
import { type Locale, routing } from "@/i18n/routing";
import { GLOBAL_VC_ORGS, getGlobalVc, globalVcLogoFor } from "@/lib/constants/global-vc";
import { similarVcs } from "@/lib/constants/vc";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ lang: string; id: string }> };

export const dynamicParams = true;

export function generateStaticParams() {
  return GLOBAL_VC_ORGS.map((o) => ({ lang: routing.defaultLocale, id: String(o.id) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, id } = await params;
  if (!hasLocale(routing.locales, lang)) return {};
  const org = getGlobalVc(Number(id));
  if (!org) return {};
  return buildPageMetadata({
    title: `${org.name} — Investor Profile | Nebutra`,
    description: org.summary || `${org.name}: focus sectors, stage and region.`,
    path: `/solutions/global-vc/${org.id}`,
    locale: lang as Locale,
  });
}

export default async function GlobalVcProfilePage({ params }: Props) {
  const { lang, id } = await params;
  setRequestLocale(lang as Locale);

  const raw = getGlobalVc(Number(id));
  if (!raw) notFound();

  const org = { ...raw, logo: globalVcLogoFor(raw) };
  const similar = similarVcs(raw, GLOBAL_VC_ORGS).map((o) => ({ ...o, logo: globalVcLogoFor(o) }));

  return (
    <main id="main-content" className="relative min-h-screen overflow-hidden bg-background">
      <Navbar />
      <VcProfile
        org={org}
        similar={similar}
        locale={lang as Locale}
        directoryLabel={lang === "zh" ? "全球 VC" : "Global VC"}
        hrefBase="/solutions/global-vc"
        variant="global"
      />
      <FooterMinimal showFinalCta />
    </main>
  );
}
