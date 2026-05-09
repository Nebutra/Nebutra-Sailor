"use client";

import { motion, useReducedMotion } from "framer-motion";
import { MoveRight } from "lucide-react";
import { useTranslations } from "next-intl";

export function FrictionlessRouting() {
  const t = useTranslations("impact");
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative w-full bg-zinc-950 py-32 md:py-48 px-4 md:px-10 overflow-hidden">
      {/* Super-neural network mesh visualization */}
      <div className="absolute inset-0 z-0">
        <motion.div
          animate={{
            scale: shouldReduceMotion ? 1 : [1, 1.1, 1],
            opacity: shouldReduceMotion ? 0.2 : [0.1, 0.3, 0.1],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--cyan-9)]/10 rounded-full blur-[150px]"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <div className="text-sm text-neutral-500 font-mono mb-6 tracking-widest uppercase">
            {t("route_title")}
          </div>

          <h2 className="text-3xl font-bold tracking-tight sm:text-5xl text-white mb-6">
            {t("route_headline")}
          </h2>
          <p className="mx-auto text-lg text-neutral-400 max-w-3xl leading-relaxed font-serif">
            {t("route_desc")}
          </p>
        </motion.div>

        {/* Neural Network Flow Data Points */}
        <div className="mt-24 max-w-3xl mx-auto flex flex-col gap-8 md:gap-12">
          <RoutingPath
            source="Capital (资本)"
            target="Code (代码)"
            targetDesc="Direct hit, no middleman logic"
            delay={0.2}
          />
          <RoutingPath
            source="Story (愿景)"
            target="Execution (人才)"
            targetDesc="Matched on semantic resonance"
            delay={0.4}
          />
          <RoutingPath
            source="Trust (信任)"
            target="Architecture (架构)"
            targetDesc="Immutable architecture proofs over prestige"
            delay={0.6}
          />
        </div>
      </div>
    </section>
  );
}

function RoutingPath({
  source,
  target,
  targetDesc,
  delay,
}: {
  source: string;
  target: string;
  targetDesc: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.8, delay }}
      className="flex flex-col md:flex-row items-center justify-between gap-4 w-full p-6 md:p-8 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.04] transition-colors"
    >
      <div className="text-xl md:text-2xl font-bold text-white w-full md:w-1/3 text-center md:text-left">
        {source}
      </div>

      <div className="flex-1 flex justify-center py-2 md:py-0 w-full md:w-auto relative">
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[var(--cyan-7)]/50 to-transparent hidden md:block" />
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          whileInView={{ x: 20, opacity: 1 }}
          viewport={{ once: true }}
          transition={{
            duration: 1.5,
            delay: delay + 0.5,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
          className="bg-zinc-950 p-2 rounded-full relative z-10"
        >
          <MoveRight className="w-5 h-5 text-[var(--cyan-9)] rotate-90 md:rotate-0" />
        </motion.div>
      </div>

      <div className="w-full md:w-1/3 text-center md:text-right flex flex-col items-center md:items-end">
        <div className="text-xl md:text-2xl font-bold text-white mb-1">{target}</div>
        <div className="text-xs text-neutral-500 font-mono tracking-wider">{targetDesc}</div>
      </div>
    </motion.div>
  );
}
