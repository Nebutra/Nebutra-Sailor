"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useTranslations } from "next-intl";
import { useRef } from "react";

export function ImpactHero() {
  const t = useTranslations("impact");
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.8]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 1], [0, 150]);

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-[100vh] pt-32 pb-16 w-full flex-col items-center justify-center overflow-hidden bg-zinc-950 text-white"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(120,119,198,0.15)_0%,rgba(0,0,0,0)_50%)] pointer-events-none" />

      <motion.div
        style={{ scale, opacity, y }}
        className="z-10 flex flex-col items-center justify-center gap-8 px-4 text-center md:px-10 max-w-5xl"
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold tracking-[0.2em] text-white/70 uppercase"
        >
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {t("hero_eyebrow")}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-5xl font-black tracking-tighter sm:text-7xl md:text-8xl leading-[1.1]"
        >
          <span className="block pb-2 text-white">{t("hero_title")}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl text-lg md:text-xl lg:text-2xl font-medium tracking-tight text-neutral-400 mt-2"
        >
          {t("hero_subtitle")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="mt-12 text-sm text-neutral-500 font-mono"
        >
          {t("phil_title")}
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.9 }}
          className="max-w-3xl text-base md:text-lg text-neutral-300 leading-relaxed font-serif"
        >
          {t("phil_desc")}
        </motion.p>
      </motion.div>

      {/* Decorative vertical lines and motion grids */}
      <div className="pointer-events-none absolute inset-0 flex justify-center opacity-20">
        <div className="h-full w-[1px] bg-gradient-to-b from-transparent via-white/50 to-transparent" />
        <div className="absolute left-[15%] h-full w-[1px] bg-gradient-to-b from-transparent via-white/10 to-transparent" />
        <div className="absolute right-[15%] h-full w-[1px] bg-gradient-to-b from-transparent via-white/10 to-transparent" />
      </div>
    </div>
  );
}
