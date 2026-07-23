import {
  ArrowRight,
  CheckCircle,
  Link as LinkIcon,
  ShieldCheck,
  Sparkles,
  Users,
} from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { normalizeReferralCode } from "@nebutra/waitlist";
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FooterMinimal, Navbar } from "@/components/landing";
import {
  ReferWaitlistForm,
  type ReferWaitlistFormCopy,
} from "@/components/landing/refer-waitlist-form";
import { type Locale, routing } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo/metadata";

type ReferPageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ code?: string | string[] }>;
};

const proofIconClassName = "h-5 w-5 text-[color:var(--cyan-10)]";

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(routing.locales, lang)) return {};

  const locale = lang as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "refer" });

  return buildPageMetadata({
    title: t("metadataTitle"),
    description: t("metadataDescription"),
    path: "/refer",
    locale,
  });
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ lang: locale }));
}

export default async function ReferPage({ params, searchParams }: ReferPageProps) {
  const [{ lang }, query] = await Promise.all([params, searchParams]);
  const locale = lang as Locale;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "refer" });
  const initialCode = normalizeReferralCode(firstParam(query.code));
  const formCopy: ReferWaitlistFormCopy = {
    emailLabel: t("form.emailLabel"),
    emailPlaceholder: t("form.emailPlaceholder"),
    codeLabel: t("form.codeLabel"),
    codePlaceholder: t("form.codePlaceholder"),
    submit: t("form.submit"),
    submitting: t("form.submitting"),
    invalidEmail: t("form.invalidEmail"),
    error: t("form.error"),
    successTitle: t("form.successTitle"),
    successDescription: t("form.successDescription"),
    positionLabel: t("form.positionLabel"),
    referralCodeLabel: t("form.referralCodeLabel"),
    referralUrlLabel: t("form.referralUrlLabel"),
    copyLink: t("form.copyLink"),
    copied: t("form.copied"),
    share: t("form.share"),
    shareTitle: t("form.shareTitle"),
    shareText: t("form.shareText"),
    directMode: t("form.directMode"),
    codeMode: t("form.codeMode"),
  };

  const proofItems = [
    {
      icon: Users,
      title: t("proof.peerLoop.title"),
      description: t("proof.peerLoop.description"),
    },
    {
      icon: ShieldCheck,
      title: t("proof.attribution.title"),
      description: t("proof.attribution.description"),
    },
    {
      icon: LinkIcon,
      title: t("proof.shareLink.title"),
      description: t("proof.shareLink.description"),
    },
  ] as const;

  const infrastructureItems = [
    {
      eyebrow: t("infrastructure.data.eyebrow"),
      title: t("infrastructure.data.title"),
      description: t("infrastructure.data.description"),
    },
    {
      eyebrow: t("infrastructure.api.eyebrow"),
      title: t("infrastructure.api.title"),
      description: t("infrastructure.api.description"),
    },
    {
      eyebrow: t("infrastructure.cicd.eyebrow"),
      title: t("infrastructure.cicd.title"),
      description: t("infrastructure.cicd.description"),
    },
  ] as const;

  return (
    <main
      id="main-content"
      className="min-h-screen overflow-x-hidden bg-background text-foreground"
    >
      <Navbar />

      <section className="relative isolate overflow-hidden border-b border-border px-6 pb-12 pt-24 md:pb-20 md:pt-36">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,color-mix(in_srgb,hsl(var(--border))_42%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_srgb,hsl(var(--border))_42%,transparent)_1px,transparent_1px)] bg-[size:56px_56px] opacity-35"
        />
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:items-center">
          <AnimateIn preset="emerge" inView>
            <div>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold uppercase text-muted-foreground">
                <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-[color:var(--cyan-10)]" />
                {t("eyebrow")}
              </p>
              <h1 className="max-w-3xl text-balance text-3xl font-semibold leading-[1.05] text-foreground sm:text-5xl md:text-6xl">
                {t("title")}
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg md:leading-8">
                {t("description")}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-sm text-muted-foreground">
                  <CheckCircle
                    aria-hidden="true"
                    className="h-4 w-4 text-[color:var(--green-10)]"
                  />
                  {t("signal.waitlist")}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-sm text-muted-foreground">
                  <ArrowRight aria-hidden="true" className="h-4 w-4 text-[color:var(--amber-10)]" />
                  {initialCode
                    ? t("signal.codeDetected", { code: initialCode })
                    : t("signal.direct")}
                </span>
              </div>
            </div>
          </AnimateIn>

          <AnimateIn preset="fadeUp" inView>
            <ReferWaitlistForm copy={formCopy} initialCode={initialCode} />
          </AnimateIn>
        </div>
      </section>

      <section className="border-b border-border bg-muted px-6 py-12">
        <AnimateInGroup
          stagger="normal"
          className="mx-auto grid max-w-6xl divide-y divide-[color:hsl(var(--border))] overflow-hidden rounded-[var(--radius-lg)] border border-border bg-background md:grid-cols-3 md:divide-x md:divide-y-0"
        >
          {proofItems.map((item) => {
            const Icon = item.icon;
            return (
              <AnimateIn key={item.title} preset="fadeUp">
                <article className="min-h-44 p-6">
                  <Icon aria-hidden="true" className={proofIconClassName} />
                  <h2 className="mt-4 text-base font-semibold text-foreground">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                </article>
              </AnimateIn>
            );
          })}
        </AnimateInGroup>
      </section>

      <section className="px-6 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
            <AnimateIn preset="emerge" inView>
              <div>
                <p className="text-xs font-semibold uppercase text-[color:hsl(var(--muted-foreground))]">
                  {t("infrastructure.eyebrow")}
                </p>
                <h2 className="mt-3 text-3xl font-semibold leading-tight text-foreground md:text-4xl">
                  {t("infrastructure.title")}
                </h2>
                <p className="mt-4 text-base leading-7 text-muted-foreground">
                  {t("infrastructure.description")}
                </p>
              </div>
            </AnimateIn>

            <AnimateInGroup
              stagger="normal"
              className="grid divide-y divide-[color:hsl(var(--border))] overflow-hidden rounded-[var(--radius-lg)] border border-border bg-background"
            >
              {infrastructureItems.map((item) => (
                <AnimateIn key={item.title} preset="fadeUp">
                  <article className="grid gap-3 p-5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-6">
                    <p className="text-xs font-semibold uppercase text-[color:hsl(var(--muted-foreground))]">
                      {item.eyebrow}
                    </p>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </article>
                </AnimateIn>
              ))}
            </AnimateInGroup>
          </div>
        </div>
      </section>

      <FooterMinimal />
    </main>
  );
}
