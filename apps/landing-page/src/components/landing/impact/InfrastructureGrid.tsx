"use client";

import { motion } from "framer-motion";
import { Boxes, CircleDollarSign, GitGraph, Rocket } from "lucide-react";
import { useTranslations } from "next-intl";
import type React from "react";
import { useRef, useState } from "react";

export function InfrastructureGrid() {
  const t = useTranslations("impact");

  return (
    <section className="relative w-full bg-black py-24 md:py-32 px-4 md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 flex flex-col items-center justify-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="text-sm text-neutral-500 font-mono mb-6 tracking-widest"
          >
            {t("infra_title")}
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="bg-gradient-to-br from-white to-neutral-500 bg-clip-text text-transparent text-3xl font-bold tracking-tight sm:text-5xl"
          >
            {t("infra_headline")}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-4 max-w-3xl text-lg text-neutral-400 font-serif leading-relaxed"
          >
            {t("infra_desc")}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[320px]">
          {/* Card 1: The Builder Core */}
          <BentoCard className="md:col-span-2 lg:col-span-2 md:row-span-1 border-white/10 bg-white/5 overflow-hidden group">
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_100%_0%,rgba(120,119,198,0.1)_0%,rgba(0,0,0,0)_50%)] transition-transform duration-700 ease-out group-hover:scale-110" />
            <div className="relative z-10 flex h-full flex-col justify-between p-8">
              <Boxes className="h-8 w-8 text-neutral-300" />
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">{t("infra_1_title")}</h3>
                <p className="text-neutral-400 font-serif">{t("infra_1_desc")}</p>
              </div>
            </div>
          </BentoCard>

          {/* Card 2: The Launchpad */}
          <BentoCard className="md:col-span-2 lg:col-span-2 md:row-span-1 border-white/10 bg-white/5 group relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.02)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%] animate-[shimmer_8s_infinite_linear]" />
            <div className="relative z-10 flex h-full flex-col justify-between p-8">
              <Rocket className="h-8 w-8 text-neutral-300" />
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">{t("infra_2_title")}</h3>
                <p className="text-neutral-400 font-serif">{t("infra_2_desc")}</p>
              </div>
            </div>
          </BentoCard>

          {/* Card 3: Sleptons Router */}
          <BentoCard className="md:col-span-2 lg:col-span-2 md:row-span-1 border-white/10 bg-white/5 group overflow-hidden">
            <div className="relative z-10 flex h-full flex-col justify-between p-8">
              <GitGraph className="h-8 w-8 text-neutral-300" />
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">{t("infra_3_title")}</h3>
                <p className="text-neutral-400 font-serif">{t("infra_3_desc")}</p>
              </div>
            </div>
            <div className="absolute right-0 bottom-0 top-0 w-1/3 translate-x-4 opacity-10 mix-blend-screen hidden md:block">
              <div className="w-[300px] h-[300px] absolute right-[-50px] top-[0px] bg-indigo-500/30 blur-[80px] rounded-full" />
            </div>
          </BentoCard>

          {/* Card 4: Algorithmic Capital */}
          <BentoCard className="md:col-span-2 lg:col-span-2 md:row-span-1 border-white/10 bg-white/5 group">
            <div className="relative z-10 flex h-full flex-col justify-between p-8">
              <CircleDollarSign className="h-8 w-8 text-neutral-300" />
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">{t("infra_4_title")}</h3>
                <p className="text-neutral-400 font-serif">{t("infra_4_desc")}</p>
              </div>
            </div>
          </BentoCard>
        </div>
      </div>
    </section>
  );
}

function BentoCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current || isFocused) return;
    const div = divRef.current;
    const rect = div.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleFocus = () => {
    setIsFocused(true);
    setOpacity(1);
  };
  const handleBlur = () => {
    setIsFocused(false);
    setOpacity(0);
  };
  const handleMouseEnter = () => {
    setOpacity(1);
  };
  const handleMouseLeave = () => {
    setOpacity(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5 }}
      ref={divRef}
      onMouseMove={handleMouseMove}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative rounded-3xl transition-colors ${className}`}
    >
      {/* Mobile touch fallback glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-10 rounded-3xl sm:hidden block"
        style={{
          background: `radial-gradient(400px circle at 50% 50%, rgba(255,255,255,0.15), transparent 60%)`,
        }}
      />

      {/* Precision mouse hover glow */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 rounded-3xl hidden sm:block"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(255,255,255,0.08), transparent 40%)`,
        }}
      />
      {children}
    </motion.div>
  );
}
