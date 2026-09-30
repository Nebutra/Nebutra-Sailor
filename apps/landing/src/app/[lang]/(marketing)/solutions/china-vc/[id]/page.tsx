import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FinalCTA } from "@/components/landing";
import { VcProfile } from "@/components/landing/solutions/vc/VcProfile";
import { prerenderDefaultLocale } from "@/i18n/prerender";
import { type Locale, routing } from "@/i18n/routing";
import { CHINA_VC_ORGS, chinaVcLogoFor, getChinaVc } from "@/lib/constants/china-vc";
import { similarVcs } from "@/lib/constants/vc";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ lang: string; id: string }> };

const PRERENDERED_CHINA_VC_ORGS = CHINA_VC_ORGS.slice(0, 24);

/**
 * Params outside generateStaticParams render on demand as a blocking route
 * rather than streaming behind a <Suspense> fallback: a streamed page reaches a
 * reader without JavaScript as its fallback (scripts/verify-landing-ssr.mjs).
 */
export const instant = false;

export function generateStaticParams() {
  return prerenderDefaultLocale(PRERENDERED_CHINA_VC_ORGS, (o) => ({ id: String(o.id) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, id } = await params;
  if (!hasLocale(routing.locales, lang)) return {};
  const org = getChinaVc(Number(id));
  if (!org) return {};
  const t = await getTranslations({ locale: lang, namespace: "solutionsCatalog.meta" });
  return buildPageMetadata({
    title: t("chinaVcProfileTitle", { name: org.name }),
    description: org.summary || t("chinaVcProfileDescriptionFallback", { name: org.name }),
    path: `/solutions/china-vc/${org.id}`,
    locale: lang as Locale,
  });
}

export default async function ChinaVcProfilePage({ params }: Props) {
  const { lang, id } = await params;
  if (!hasLocale(routing.locales, lang)) notFound();
  setRequestLocale(lang as Locale);

  const raw = getChinaVc(Number(id));
  if (!raw) notFound();

  const org = { ...raw, logo: chinaVcLogoFor(raw) };
  const similar = similarVcs(raw, CHINA_VC_ORGS).map((o) => ({ ...o, logo: chinaVcLogoFor(o) }));
  const t = await getTranslations({ locale: lang, namespace: "solutionsCatalog.chinaVc" });

  return (
    <main id="main-content" className="relative flex-1 overflow-hidden bg-background">
      <VcProfile
        org={org}
        similar={similar}
        locale={lang as Locale}
        directoryLabel={t("directoryLabel")}
        hrefBase="/solutions/china-vc"
        variant="deals"
      />
      <FinalCTA />
    </main>
  );
}
