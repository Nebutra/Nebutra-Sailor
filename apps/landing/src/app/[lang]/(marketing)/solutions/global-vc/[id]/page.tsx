import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FinalCTA } from "@/components/landing";
import { VcProfile } from "@/components/landing/solutions/vc/VcProfile";
import { prerenderDefaultLocale } from "@/i18n/prerender";
import { type Locale, routing } from "@/i18n/routing";
import { GLOBAL_VC_ORGS, getGlobalVc, globalVcLogoFor } from "@/lib/constants/global-vc";
import { similarVcs } from "@/lib/constants/vc";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ lang: string; id: string }> };

/**
 * Params outside generateStaticParams render on demand as a blocking route
 * rather than streaming behind a <Suspense> fallback: a streamed page reaches a
 * reader without JavaScript as its fallback (scripts/verify-landing-ssr.mjs).
 */
export const instant = false;

export function generateStaticParams() {
  return prerenderDefaultLocale(GLOBAL_VC_ORGS, (o) => ({ id: String(o.id) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, id } = await params;
  if (!hasLocale(routing.locales, lang)) return {};
  const org = getGlobalVc(Number(id));
  if (!org) return {};
  const t = await getTranslations({ locale: lang, namespace: "solutionsCatalog.meta" });
  return buildPageMetadata({
    title: t("globalVcProfileTitle", { name: org.name }),
    description: org.summary || t("globalVcProfileDescriptionFallback", { name: org.name }),
    path: `/solutions/global-vc/${org.id}`,
    locale: lang as Locale,
  });
}

export default async function GlobalVcProfilePage({ params }: Props) {
  const { lang, id } = await params;
  if (!hasLocale(routing.locales, lang)) notFound();
  setRequestLocale(lang as Locale);

  const raw = getGlobalVc(Number(id));
  if (!raw) notFound();

  const org = { ...raw, logo: globalVcLogoFor(raw) };
  const similar = similarVcs(raw, GLOBAL_VC_ORGS).map((o) => ({ ...o, logo: globalVcLogoFor(o) }));
  const t = await getTranslations({ locale: lang, namespace: "solutionsCatalog.globalVc" });

  return (
    <main id="main-content" className="relative flex-1 overflow-hidden bg-background">
      <VcProfile
        org={org}
        similar={similar}
        locale={lang as Locale}
        directoryLabel={t("directoryLabel")}
        hrefBase="/solutions/global-vc"
        variant="global"
      />
      <FinalCTA />
    </main>
  );
}
