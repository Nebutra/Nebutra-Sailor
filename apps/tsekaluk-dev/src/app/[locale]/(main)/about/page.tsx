import { Envelope } from "@nebutra/icons";
import { AnimateIn } from "@nebutra/ui/components";
import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { AboutAnchorNav } from "@/components/about-anchor-nav";
import { CountUp } from "@/components/count-up";
import { ResumeDownloadButton } from "@/components/resume-download-button";
import { personJsonLd } from "@/lib/json-ld";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.about" });
  return {
    title: t("metadata_title"),
    description: t("metadata_desc"),
    openGraph: {
      images: [
        `/og?title=${encodeURIComponent(t("metadata_title"))}&subtitle=${encodeURIComponent(t("metadata_desc"))}`,
      ],
    },
    alternates: {
      canonical: `https://tsekaluk.dev/${locale}/about`,
      languages: {
        en: "https://tsekaluk.dev/en/about",
        zh: "https://tsekaluk.dev/zh/about",
        ja: "https://tsekaluk.dev/ja/about",
      },
    },
  };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.about" });

  const TIMELINE = [
    { year: "2020", label: t("journey_2020") },
    { year: "2022", label: t("journey_2022") },
    { year: "2023", label: t("journey_2023") },
    { year: "2024", label: t("journey_2024") },
    { year: "2025", label: t("journey_2025") },
    { year: "Now", label: t("journey_now") },
  ];

  const AWARDS = [
    {
      title: t("award_1_title"),
      level: t("award_1_level"),
      detail: t("award_1_detail"),
      year: "2025",
    },
    {
      title: t("award_2_title"),
      level: t("award_2_level"),
      detail: t("award_2_detail"),
      year: "2025",
    },
    {
      title: t("award_3_title"),
      level: t("award_3_level"),
      detail: t("award_3_detail"),
      year: "2025",
    },
    {
      title: t("award_4_title"),
      level: t("award_4_level"),
      detail: t("award_4_detail"),
      year: "2024",
    },
    {
      title: t("award_5_title"),
      level: t("award_5_level"),
      detail: t("award_5_detail"),
      year: "2024",
    },
    {
      title: t("award_6_title"),
      level: t("award_6_level"),
      detail: t("award_6_detail"),
      year: "2025",
    },
    {
      title: t("award_7_title"),
      level: t("award_7_level"),
      detail: t("award_7_detail"),
      year: "2024",
    },
    {
      title: t("award_8_title"),
      level: t("award_8_level"),
      detail: t("award_8_detail"),
      year: "2024",
    },
    {
      title: t("award_9_title"),
      level: t("award_9_level"),
      detail: t("award_9_detail"),
      year: "2024",
    },
    {
      title: t("award_10_title"),
      level: t("award_10_level"),
      detail: t("award_10_detail"),
      year: "2023",
    },
  ];

  const CERTS = [
    t("cred_1"),
    t("cred_2"),
    t("cred_3"),
    t("cred_4"),
    t("cred_5"),
    t("cred_6"),
    t("cred_7"),
    t("cred_8"),
  ];

  const beliefs = [{ quote: t("belief_1"), credit: t("belief_1_credit") }];

  const MUSIC = [
    "Glass Animals",
    "NINEONE# 乃万",
    "Metro Boomin",
    "Marshmello",
    "San Holo",
    "Claude Debussy",
    "美波",
    "milet",
    "法老",
    "C418",
    "Troye Sivan",
    "Juice WRLD",
    "Rich Brian",
    "Coi Leray",
    "Cardi B",
    "Nicki Minaj",
    "Lizzo",
    "Ed Sheeran",
    "Taylor Swift",
    "Justin Bieber",
    "OneOne",
  ];

  const PHILOSOPHY = [
    "Nietzsche",
    "Sartre",
    "Schopenhauer",
    "Kant",
    "Freud",
    "Russell",
    "Maslow",
    "Thoreau",
    "周国平",
  ];

  const GAMES = ["Minecraft · Deer_Sama", "Detroit: Become Human", "Kingdom Rush", "美丽水世界"];

  const NAV_SECTIONS = [
    { id: "personality", label: t("personality_label") },
    { id: "journey", label: t("journey_label") },
    { id: "awards", label: t("awards_label") },
    { id: "credentials", label: t("credentials_label") },
    { id: "beliefs", label: t("beliefs_label") },
    { id: "life", label: t("life_label") },
    { id: "contact", label: t("contact_anchor_label") },
  ];

  return (
    <section className="mx-auto max-w-4xl px-8 py-24 md:py-32">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd()) }}
      />

      {/* Header */}
      <AnimateIn preset="fadeUp" className="mb-24">
        <p className="mb-6 text-xs font-mono tracking-widest text-gray-400 uppercase">
          {t("label")}
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl max-w-2xl leading-tight">
          {t("headline")}{" "}
          <span className="text-gray-400 dark:text-gray-500">{t("headline_muted")}</span>
        </h1>
      </AnimateIn>

      {/* Anchor Nav */}
      <AboutAnchorNav sections={NAV_SECTIONS} />

      {/* Photo + Bio */}
      <AnimateIn preset="fadeUp" delay={0.1} className="mb-32 grid gap-12 md:grid-cols-[280px_1fr]">
        <figure className="relative mx-auto w-full max-w-[280px] md:mx-0 group">
          <div className="aspect-[4/5] w-full overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm transition-[border-color,box-shadow] duration-700">
            <Image
              src="/images/black.jpeg"
              alt="Tseka Luk"
              width={400}
              height={500}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              priority
            />
          </div>
          <figcaption className="mt-4 flex justify-between text-[10px] font-mono tracking-widest text-gray-400 uppercase">
            <span>{t("photo_tag")}</span>
            <span>{t("photo_location")}</span>
          </figcaption>
        </figure>

        <div className="flex flex-col justify-center space-y-12 text-base leading-relaxed text-gray-600 dark:text-gray-400">
          <div className="space-y-6">
            <p>{t("bio_1")}</p>
            <p>{t("bio_2")}</p>
            <p>{t("bio_3")}</p>
          </div>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 pt-6 border-t border-gray-100 dark:border-gray-800/50">
            {[
              { target: 19, label: t("stat_projects") },
              { target: 10, label: t("stat_awards") },
              { target: 6, label: t("stat_first_prizes") },
              { target: 8, label: t("stat_certs") },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-light text-foreground mb-1">
                  <CountUp target={stat.target} />
                </p>
                <p className="text-[11px] uppercase tracking-widest text-gray-400 dark:text-gray-500">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </AnimateIn>

      {/* Personality */}
      <span id="personality" className="block scroll-mt-24" aria-hidden="true" />
      <AnimateIn preset="fadeUp" className="mb-32">
        <h2 className="mb-12 text-sm font-mono tracking-widest text-gray-500 dark:text-gray-400 uppercase">
          {t("personality_label")}
        </h2>
        <div className="grid gap-12 md:grid-cols-2 items-center">
          <div className="overflow-hidden rounded-2xl bg-gray-50/50 dark:bg-gray-900/50">
            <Image
              src="/images/intp-logician.svg"
              alt="INTP The Logician"
              width={800}
              height={400}
              className="w-full h-auto mix-blend-multiply dark:mix-blend-screen opacity-90 transition-opacity hover:opacity-100"
            />
          </div>
          <div className="space-y-10">
            <div className="group flex gap-5 items-start">
              <Image
                src="/images/intp-badge.svg"
                alt="INTP"
                width={64}
                height={64}
                className="h-16 w-16 shrink-0 opacity-80 transition-opacity group-hover:opacity-100"
              />
              <div>
                <div className="flex items-baseline gap-4 mb-2">
                  <h3 className="text-xl font-semibold tracking-tight text-foreground transition-colors group-hover:text-[var(--color-accent)]">
                    {t("personality_intp_name")}
                  </h3>
                  <span className="text-sm text-gray-400">{t("personality_intp_subtitle")}</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
                  {t("personality_intp_desc")}
                </p>
                <p className="text-[10px] font-mono text-gray-400/80 uppercase tracking-widest">
                  {t("personality_intp_source")}
                </p>
              </div>
            </div>

            <div className="group flex gap-5 items-start">
              <Image
                src="/images/4w5-badge.svg"
                alt="4w5"
                width={64}
                height={64}
                className="h-16 w-16 shrink-0 opacity-80 transition-opacity group-hover:opacity-100"
              />
              <div>
                <div className="flex items-baseline gap-4 mb-2">
                  <h3 className="text-xl font-semibold tracking-tight text-foreground transition-colors group-hover:text-[var(--color-accent)]">
                    {t("personality_4w5_name")}
                  </h3>
                  <span className="text-sm text-gray-400">{t("personality_4w5_subtitle")}</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
                  {t("personality_4w5_desc")}
                </p>
                <p className="text-[10px] font-mono text-gray-400/80 uppercase tracking-widest">
                  {t("personality_4w5_source")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </AnimateIn>

      {/* Timeline */}
      <span id="journey" className="block scroll-mt-24" aria-hidden="true" />
      <AnimateIn preset="fadeUp" className="mb-32">
        <h2 className="mb-12 text-sm font-mono tracking-widest text-gray-500 dark:text-gray-400 uppercase">
          {t("journey_label")}
        </h2>
        <div className="flex flex-col">
          {TIMELINE.map((entry) => (
            <div
              key={entry.year}
              className="group grid gap-4 py-5 md:grid-cols-[120px_1fr] border-b border-gray-100 dark:border-gray-800/50 last:border-0 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
            >
              <span className="font-mono text-sm tracking-widest text-gray-400 dark:text-gray-500 transition-colors group-hover:text-foreground">
                {entry.year}
              </span>
              <span className="text-base text-gray-700 dark:text-gray-300 transition-colors group-hover:text-foreground">
                {entry.label}
              </span>
            </div>
          ))}
        </div>
      </AnimateIn>

      {/* Awards */}
      <span id="awards" className="block scroll-mt-24" aria-hidden="true" />
      <AnimateIn preset="fadeUp" className="mb-32">
        <div className="mb-12 flex items-baseline gap-4">
          <h2 className="text-sm font-mono tracking-widest text-gray-500 dark:text-gray-400 uppercase">
            {t("awards_label")}
          </h2>
          <span className="text-[10px] font-medium text-[var(--color-accent)] px-2 py-0.5 rounded-full bg-[var(--color-accent)]/10">
            {t("awards_count")}
          </span>
        </div>
        <div className="flex flex-col">
          {AWARDS.map((award, i) => (
            <div
              key={i}
              className="group flex flex-col justify-between py-5 border-b border-gray-100 dark:border-gray-800/50 last:border-0 sm:flex-row sm:items-center gap-4 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
            >
              <div className="md:w-3/5">
                <p className="text-base font-medium text-foreground transition-colors group-hover:text-[var(--color-accent)]">
                  {award.title}
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{award.level}</p>
              </div>
              <div className="flex flex-col items-start sm:items-end">
                <p className="text-sm text-gray-600 dark:text-gray-400">{award.detail}</p>
                <p className="font-mono text-xs tracking-wider text-gray-400 dark:text-gray-500 mt-1">
                  {award.year}
                </p>
              </div>
            </div>
          ))}
        </div>
      </AnimateIn>

      {/* Credentials */}
      <span id="credentials" className="block scroll-mt-24" aria-hidden="true" />
      <AnimateIn preset="fadeUp" className="mb-32">
        <h2 className="mb-12 text-sm font-mono tracking-widest text-gray-500 dark:text-gray-400 uppercase">
          {t("credentials_label")}
        </h2>
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 md:grid-cols-3">
          {CERTS.map((cert, i) => (
            <div key={i} className="group flex items-start">
              <span className="text-sm text-gray-600 dark:text-gray-400 transition-colors group-hover:text-foreground">
                {cert}
              </span>
            </div>
          ))}
        </div>
      </AnimateIn>

      {/* Beliefs */}
      <span id="beliefs" className="block scroll-mt-24" aria-hidden="true" />
      <AnimateIn preset="fadeUp" className="mb-32">
        <h2 className="mb-12 text-sm font-mono tracking-widest text-gray-500 dark:text-gray-400 uppercase">
          {t("beliefs_label")}
        </h2>
        <div className="space-y-16 mt-8">
          {beliefs.map((belief, i) => (
            <div key={i} className="max-w-3xl">
              <p className="text-xl md:text-2xl font-light leading-snug text-foreground">
                &ldquo;{belief.quote}&rdquo;
              </p>
              {belief.credit && (
                <p className="mt-6 text-xs font-mono tracking-widest text-gray-500 dark:text-gray-400 uppercase">
                  — {belief.credit}
                </p>
              )}
            </div>
          ))}
        </div>
      </AnimateIn>

      {/* Life */}
      <span id="life" className="block scroll-mt-24" aria-hidden="true" />
      <AnimateIn preset="fadeUp" className="mb-32">
        <h2 className="mb-12 text-sm font-mono tracking-widest text-gray-500 dark:text-gray-400 uppercase">
          {t("life_label")}
        </h2>
        <div className="space-y-12 max-w-3xl">
          <div>
            <h3 className="mb-3 text-[10px] font-mono tracking-widest text-gray-400 uppercase">
              {t("life_music")}
            </h3>
            <p className="text-base leading-relaxed text-gray-600 dark:text-gray-400">
              {MUSIC.join(" · ")}
            </p>
          </div>
          <div>
            <h3 className="mb-3 text-[10px] font-mono tracking-widest text-gray-400 uppercase">
              {t("life_philosophy")}
            </h3>
            <p className="text-base leading-relaxed text-gray-600 dark:text-gray-400">
              {PHILOSOPHY.join(" · ")}
            </p>
          </div>
          <div>
            <h3 className="mb-3 text-[10px] font-mono tracking-widest text-gray-400 uppercase">
              {t("life_games")}
            </h3>
            <p className="text-base leading-relaxed text-gray-600 dark:text-gray-400">
              {GAMES.join(" · ")}
            </p>
          </div>
        </div>
      </AnimateIn>

      {/* Contact */}
      <span id="contact" className="block scroll-mt-24" aria-hidden="true" />
      <AnimateIn preset="fadeUp" className="pt-24 border-t border-gray-100 dark:border-gray-800/50">
        <div className="text-center md:text-left md:flex md:items-center md:justify-between">
          <h2 className="text-2xl font-light tracking-tight text-foreground md:text-4xl mb-8 md:mb-0">
            {t("contact_headline")}
          </h2>
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
            <a
              href="mailto:contact@tsekaluk.dev"
              className="inline-flex h-11 items-center gap-3 rounded-full bg-foreground px-6 text-sm font-medium text-background transition-transform hover:scale-105 hover:bg-foreground/90"
            >
              <Envelope className="h-4 w-4" />
              contact@tsekaluk.dev
            </a>
            <div className="h-11 flex items-center">
              <ResumeDownloadButton label={t("resume_download")} />
            </div>
          </div>
        </div>
      </AnimateIn>
    </section>
  );
}
