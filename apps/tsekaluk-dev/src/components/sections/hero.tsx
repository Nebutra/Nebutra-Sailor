"use client";

import { ArrowRight, Star } from "@nebutra/icons";
import { AnimateIn } from "@nebutra/ui/components";
import { DotPattern } from "@nebutra/ui/primitives";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function Hero() {
  const t = useTranslations("hero");

  return (
    <section className="relative pt-12 pb-24 w-full flex flex-col items-center overflow-hidden">
      {/* Halftone Sphere Background (Engineering Aesthetic) */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0 overflow-hidden">
        <DotPattern
          width={14}
          height={14}
          cr={1.2}
          className="[mask-image:radial-gradient(600px_circle_at_65%_25%,white,transparent_100%)] md:[mask-image:radial-gradient(800px_circle_at_75%_35%,white,transparent_100%)] opacity-30 dark:opacity-[0.15] text-gray-900 dark:text-white"
        />
      </div>
      {/* Top Badge */}
      <AnimateIn preset="fade">
        <div className="flex items-center gap-2 mb-10 z-20">
          <div className="flex items-center justify-center">
            <Star className="w-6 h-6 text-gray-900 dark:text-white" />
          </div>
          <span className="text-base text-gray-900 dark:text-white font-normal tracking-tight">
            {t("status")}
          </span>
        </div>
      </AnimateIn>

      {/* Main Headlines */}
      <div className="z-20 flex flex-col items-center text-center w-full px-4 relative mt-4 md:mt-8">
        <AnimateIn preset="fadeUp" delay={0.1}>
          <h1 className="leading-[0.9] text-[clamp(4rem,10vw,8rem)] font-normal text-gray-900 dark:text-white tracking-[-0.04em] z-20 relative">
            {t("greeting")}
          </h1>
        </AnimateIn>
        <AnimateIn preset="fadeUp" delay={0.2}>
          <h2 className="leading-[0.9] text-[clamp(4.5rem,11vw,9rem)] font-normal italic font-serif text-gray-900 dark:text-white tracking-[-0.04em] z-30 -mt-2 md:-mt-4">
            {t("tagline")}
          </h2>
        </AnimateIn>
      </div>

      {/* Central Layout Area Area */}
      <div className="md:mt-0 md:h-[650px] flex flex-col md:block w-full h-auto max-w-7xl mt-8 mr-auto ml-auto relative items-center justify-center">
        <AnimateIn
          preset="fadeUp"
          delay={0.3}
          className="relative z-10 w-full max-w-[85vw] md:max-w-[42vw] lg:max-w-[550px] mx-auto pointer-events-none md:absolute md:-top-16 md:left-1/2 md:-translate-x-1/2"
        >
          <Image
            src="/images/black-nobg.webp"
            alt="Portrait of Tseka Luk, CEO & AI-Native Builder"
            width={550}
            height={733}
            priority
            sizes="(max-width: 768px) 85vw, (max-width: 1024px) 42vw, 550px"
            className="w-full h-auto object-contain [mask-image:linear-gradient(to_bottom,black_40%,transparent_90%)] contrast-105"
          />
        </AnimateIn>

        {/* Left Mid Badge (Desktop) */}
        <AnimateIn
          preset="fade"
          delay={0.4}
          className="hidden md:flex absolute top-[25%] left-4 lg:left-12 z-30 items-center gap-3 px-5 py-2.5 bg-white dark:bg-gray-950 rounded-full border border-gray-200 dark:border-gray-800 shadow-sm transition-transform hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#a3e635] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#84cc16]"></span>
          </span>
          <span className="text-sm font-medium text-gray-900 dark:text-white tracking-wide uppercase">
            AI &amp; System Builder
          </span>
        </AnimateIn>

        {/* Right Mid Text (Desktop) */}
        <AnimateIn
          preset="fade"
          delay={0.5}
          className="hidden md:block absolute top-[35%] right-4 lg:right-12 z-30 max-w-[320px]"
        >
          <p className="text-xl lg:text-2xl text-gray-900 dark:text-white leading-tight tracking-tight font-normal">
            {t("description")}
          </p>
        </AnimateIn>

        {/* Left Bottom Avatars (Desktop) */}
        <AnimateIn
          preset="fadeUp"
          delay={0.6}
          className="hidden md:flex absolute bottom-8 left-4 lg:left-12 z-30 items-center gap-4 max-w-[380px]"
        >
          <div className="flex -space-x-4 shrink-0">
            {["P", "E", "O"].map((initial, i) => (
              <div
                key={i}
                className="w-12 h-12 rounded-full border-[3px] border-white dark:border-gray-900 object-cover shadow-sm bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 font-serif"
              >
                {initial}
              </div>
            ))}
          </div>
          <p className="text-base text-gray-600 dark:text-gray-400 leading-snug">
            {t("social_proof")}
          </p>
        </AnimateIn>

        {/* Right Bottom Button (Desktop) */}
        <AnimateIn
          preset="fadeUp"
          delay={0.7}
          className="hidden md:block absolute bottom-12 right-4 lg:right-12 z-30"
        >
          <Link
            href="/now"
            className="group inline-flex items-center justify-center gap-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-7 py-3.5 rounded-full text-base font-medium transition-[background-color,box-shadow,transform] hover:bg-gray-800 dark:hover:bg-gray-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl motion-reduce:transition-colors motion-reduce:hover:scale-100 motion-reduce:active:scale-100"
          >
            {t("cta_primary")}{" "}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
          </Link>
        </AnimateIn>
      </div>

      {/* Mobile Layout */}
      <div className="flex flex-col gap-10 md:hidden w-full px-6 mt-0 z-30 relative items-center text-center -mt-16">
        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-950 rounded-full border border-gray-200 dark:border-gray-800 shadow-sm w-fit mx-auto mt-6">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#a3e635] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#84cc16]"></span>
          </span>
          <span className="text-xs font-medium text-gray-900 dark:text-white tracking-wide uppercase">
            AI &amp; System Builder
          </span>
        </div>

        <p className="text-lg text-gray-900 dark:text-white leading-snug tracking-tight font-normal max-w-sm mx-auto">
          {t("description")}
        </p>

        <Link
          href="/now"
          className="group inline-flex items-center justify-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-3 rounded-full text-sm font-medium transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-md mx-auto motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100"
        >
          {t("cta_primary")}{" "}
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
        </Link>
      </div>
    </section>
  );
}
