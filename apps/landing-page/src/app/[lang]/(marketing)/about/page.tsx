import { LogomarkSVG } from "@nebutra/brand";
import { ArrowRight } from "@nebutra/icons";
import { Button } from "@nebutra/ui/primitives";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FooterMinimal, Navbar } from "@/components/landing";
import { Link } from "@/i18n/navigation";

import type { Locale } from "@/i18n/routing";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);

  const t = await getTranslations({ locale: lang as Locale, namespace: "legalPages.about" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function AboutPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);

  const t = await getTranslations({ locale: lang as Locale, namespace: "legalPages.about" });

  const valueImages = [
    "/images/about/agi-premium.png",
    "/images/about/security-premium.png",
    "/images/about/ergonomics-premium.png",
    "/images/about/scale-premium.png",
  ];

  return (
    <main id="main-content" className="flex flex-col min-h-screen bg-background">
      <Navbar />

      {/* 1. Hero Section (Asymmetrical Text + Abstract Art) */}
      <section className="pt-32 md:pt-48 pb-20 overflow-hidden">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            {/* Text Content */}
            <div className="flex-1 w-full text-left">
              <span className="text-sm font-bold tracking-[0.2em] uppercase text-muted-foreground mb-8 block">
                {t("title").split("—")[0].trim()}
              </span>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-balance mb-8">
                {t("heading")}
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-xl">
                {t("subheading")}
              </p>
            </div>
            {/* Image */}
            <div className="flex-1 w-full">
              <div className="relative aspect-square md:aspect-[4/3] rounded-3xl overflow-hidden bg-muted/30 shadow-2xl">
                <Image
                  src="/images/about/hero-premium.png"
                  alt="Abstract Art"
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-700"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Massive Mission Text & Office Photo */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="max-w-4xl mx-auto text-center mb-16 md:mb-24">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-balance leading-[1.4] text-foreground">
              {t("missionTitle")}:{" "}
              <span className="text-muted-foreground font-normal">{t("missionP1")}</span>
            </h2>
          </div>

          <div className="relative w-full aspect-video max-h-[700px] overflow-hidden rounded-[2.5rem] shadow-2xl group">
            <Image
              src="/images/about/office.png"
              alt="Office Collaboration"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-1000 ease-out"
            />
          </div>
        </div>
      </section>

      {/* 3. OpenAI Style Jobs Opportunity Block */}
      <section className="py-20 bg-background border-y border-border/50">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <div className="inline-flex items-center justify-center mb-8">
            <LogomarkSVG className="h-16 w-16 text-foreground" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-6">{t("jobsTitle")}</h2>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 text-balance">
            {t("jobsDescription")}
          </p>
          <Button
            size="lg"
            className="rounded-full px-8 font-semibold h-14 bg-foreground text-background hover:bg-foreground/90 hover:scale-105 transition-transform"
          >
            {t("jobsButton")} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* 4. Values Bento Grid (4 Columns) */}
      <section className="py-32 bg-background relative">
        <div className="container mx-auto px-4 max-w-[1400px]">
          <div className="mb-20 text-center md:text-left">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              {t("valuesTitle")}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[0, 1, 2, 3].map((i) => {
              const titleRaw = t(`values.${i}.title` as any);
              const parts = titleRaw.split(" (");
              const zhText = parts[0];
              const enText = parts.length > 1 ? parts[1].replace(")", "") : "";

              return (
                <div
                  key={i}
                  className="group relative bg-muted/20 border border-border/50 rounded-3xl overflow-hidden hover:shadow-2xl hover:border-border transition-all duration-500 flex flex-col h-full"
                >
                  {/* Top Image Slab */}
                  <div className="relative aspect-square w-full bg-muted/30 overflow-hidden">
                    <Image
                      src={valueImages[i]}
                      alt={zhText}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                  {/* Content Slab */}
                  <div className="p-8 flex-1 flex flex-col justify-start">
                    <h4 className="text-xl font-bold tracking-tight mb-2 text-foreground group-hover:text-primary transition-colors">
                      {zhText}
                    </h4>
                    {enText && (
                      <p className="text-[10px] font-mono tracking-widest uppercase text-primary/60 mb-4">
                        {enText}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                      {t(`values.${i}.description` as any)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. Organization & Architecture Philosophy (50/50 Split) */}
      <section className="py-24 md:py-32 overflow-hidden bg-muted/30 border-t border-border/50">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
            {/* Left: Text */}
            <div className="flex-1 w-full text-left order-2 lg:order-1">
              <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-8">
                {t("companyInfoTitle")}
              </h2>
              <div className="space-y-6 text-[1.1rem] text-muted-foreground leading-relaxed max-w-xl">
                <p>{t("missionP2")}</p>
                <div className="pt-8 mt-8 border-t border-border/50 grid grid-cols-2 gap-8">
                  <div>
                    <h5 className="text-[11px] font-bold tracking-[0.2em] uppercase text-foreground mb-3">
                      {t("companyInfo.legalName")}
                    </h5>
                    <p className="text-muted-foreground font-mono text-sm">WUXI NEBUTRA</p>
                  </div>
                  <div>
                    <h5 className="text-[11px] font-bold tracking-[0.2em] uppercase text-foreground mb-3">
                      {t("companyInfo.founded")}
                    </h5>
                    <p className="text-muted-foreground font-mono text-sm">EST. 2025</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Right: Landscape Image */}
            <div className="flex-1 w-full order-1 lg:order-2">
              <div className="relative aspect-square md:aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-2xl">
                <Image
                  src="/images/about/landscape.png"
                  alt="Organization Philosophy"
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-1000"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Massive Footer Join Us CTA */}
      <section className="py-32 md:py-48 bg-background">
        <div className="container mx-auto px-4 text-center max-w-4xl">
          <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <span className="text-sm font-bold tracking-widest uppercase text-primary">
              {lang === "zh" ? "加入我们的愿景" : "Join Our Vision"}
            </span>
          </div>
          <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-balance mb-12">
            {lang === "zh"
              ? "加入我们，共创科技未来"
              : "Join us to co-create the technological future"}
          </h2>
          <Link href="/contact">
            <Button
              size="lg"
              className="rounded-full h-16 w-56 text-lg font-bold shadow-xl border-border bg-foreground text-background hover:scale-105 transition-transform"
            >
              {t("ctaButton")}
            </Button>
          </Link>
        </div>
      </section>

      <FooterMinimal />
    </main>
  );
}
