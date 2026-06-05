"use client";

import {
  Adobe,
  Anthropic,
  ComfyUI,
  Cursor as CursorIcon,
  Dify,
  Figma,
  Flux,
  Google,
  LangChain,
  Midjourney,
  N8n,
  Notion,
  OpenAI,
  OpenClaw,
  V0,
  Vercel,
  Zapier,
} from "@lobehub/icons";
import { brandSpring } from "@nebutra/brand";
import {
  ArrowRight,
  Brain,
  Briefcase,
  CheckCircleFill,
  Code,
  Compass,
  Globe,
  HeartFill,
  type IconProps,
  Layers,
  Message,
  Sparkles,
  Target,
} from "@nebutra/icons";
import { AnimateIn } from "@nebutra/ui/components";
import { DotPattern } from "@nebutra/ui/primitives";
import Image from "next/image";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useState } from "react";
import { NumberTicker } from "@/components/ui/number-ticker";
import { AnimatePresence, motion, useReducedMotion } from "@/shared/motion";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const CAPABILITY_DATA = [
  { dimension: "Engineering", score: 92 },
  { dimension: "AI", score: 95 },
  { dimension: "Design", score: 88 },
  { dimension: "Growth", score: 85 },
  { dimension: "Consulting", score: 90 },
  { dimension: "Strategy", score: 82 },
];

const SERVICE_ICONS: React.ComponentType<IconProps>[] = [
  Code,
  Brain,
  Layers,
  Globe,
  Briefcase,
  Compass,
];

const SERVICE_KEYS = ["engineering", "ai", "design", "growth", "consulting", "strategy"] as const;

const TIER_KEYS = ["chat", "coffee", "hire", "partner"] as const;

const TIER_ICONS: Record<
  (typeof TIER_KEYS)[number],
  React.ComponentType<IconProps | { className?: string; size?: number }>
> = { chat: Message, coffee: HeartFill, hire: Sparkles, partner: Target };

/* ------------------------------------------------------------------ */
/*  Tech stack data                                                    */
/* ------------------------------------------------------------------ */

interface TechItem {
  name: string;
  slug?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Icon?: React.ComponentType<any>;
}

const TECH_STACKS: Record<(typeof SERVICE_KEYS)[number], TechItem[]> = {
  engineering: [
    { name: "Next.js", slug: "nextdotjs" },
    { name: "React", slug: "react" },
    { name: "TypeScript", slug: "typescript" },
    { name: "Tailwind CSS", slug: "tailwindcss" },
    { name: "Prisma", slug: "prisma" },
    { name: "PostgreSQL", slug: "postgresql" },
    { name: "Vercel", Icon: Vercel },
    { name: "Turborepo", slug: "turborepo" },
  ],
  ai: [
    { name: "Claude", Icon: Anthropic },
    { name: "OpenAI", Icon: OpenAI },
    { name: "Midjourney", Icon: Midjourney },
    { name: "Flux", Icon: Flux },
    { name: "Cursor", Icon: CursorIcon },
    { name: "LangChain", Icon: LangChain },
    { name: "ComfyUI", Icon: ComfyUI },
    { name: "OpenClaw", Icon: OpenClaw },
    { name: "n8n", Icon: N8n },
    { name: "Dify", Icon: Dify },
  ],
  design: [
    { name: "Figma", Icon: Figma },
    { name: "Adobe CC", Icon: Adobe },
    { name: "v0", Icon: V0 },
    { name: "Framer", slug: "framer" },
    { name: "Storybook", slug: "storybook" },
    { name: "Radix UI", slug: "radixui" },
  ],
  growth: [
    { name: "Google Analytics", Icon: Google },
    { name: "PostHog", slug: "posthog" },
    { name: "Product Hunt", slug: "producthunt" },
    { name: "Notion", Icon: Notion },
    { name: "Zapier", Icon: Zapier },
    { name: "Mixpanel", slug: "mixpanel" },
    { name: "X", slug: "x" },
    { name: "WeChat OA", slug: "wechat" },
  ],
  consulting: [
    { name: "Notion", Icon: Notion },
    { name: "Linear", slug: "linear" },
    { name: "Jira", slug: "jira" },
    { name: "LaTeX", slug: "latex" },
    { name: "Python", slug: "python" },
  ],
  strategy: [
    { name: "Y Combinator", slug: "ycombinator" },
    { name: "Notion", Icon: Notion },
    { name: "Google Sheets", slug: "googlesheets" },
    { name: "Stripe", slug: "stripe" },
  ],
};

/* ------------------------------------------------------------------ */
/*  Tech badge                                                         */
/* ------------------------------------------------------------------ */

function TechBadge({ item }: { item: TechItem }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-1.5 transition-colors hover:border-[var(--color-accent-muted)]">
      {item.Icon ? (
        <item.Icon size={14} />
      ) : item.slug ? (
        <Image
          src={`https://cdn.simpleicons.org/${item.slug}`}
          alt=""
          width={14}
          height={14}
          className="h-3.5 w-3.5 brightness-0 dark:invert"
        />
      ) : null}
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
        {item.name}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stats strip                                                        */
/* ------------------------------------------------------------------ */

function StatsStrip() {
  const t = useTranslations("pricing");
  const stats = t.raw("stats") as {
    value: number;
    suffix: string;
    label: string;
  }[];

  return (
    <AnimateIn preset="fadeUp" delay={0.1} inView>
      <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 py-12">
        {stats.map((stat, i) => (
          <div key={i} className="text-center">
            <div className="flex items-baseline justify-center gap-0.5">
              <NumberTicker
                value={stat.value}
                className="text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white"
              />
              <span className="text-3xl font-bold text-[var(--color-accent-fg)]">
                {stat.suffix}
              </span>
            </div>
            <p className="mt-1 font-mono text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>
    </AnimateIn>
  );
}

/* ------------------------------------------------------------------ */
/*  Tier card                                                          */
/* ------------------------------------------------------------------ */

function TierCard({ tierKey, index }: { tierKey: (typeof TIER_KEYS)[number]; index: number }) {
  const t = useTranslations("pricing");
  const isAccent = tierKey === "hire";
  const TierIcon = TIER_ICONS[tierKey];
  const features = t.raw(`tiers.${tierKey}.features`) as string[];
  const href = t(`tiers.${tierKey}.href`);

  return (
    <AnimateIn preset="fadeUp" delay={index * 0.1} inView>
      <a
        href={href}
        className={`group relative flex flex-col justify-between rounded-3xl border p-8 lg:p-10 transition-[border-color,background-color,box-shadow,transform,filter] duration-500 h-full motion-reduce:transition-colors motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100 ${
          isAccent
            ? "border-[var(--color-accent)] bg-gray-900 dark:bg-gray-900 shadow-[0_20px_60px_var(--color-accent-shadow)] scale-[1.02] hover:scale-[1.04] motion-reduce:scale-100"
            : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950/80 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)]"
        }`}
      >
        {/* Hire card internal glow */}
        {isAccent && (
          <div
            className="absolute inset-0 pointer-events-none rounded-3xl"
            style={{
              background:
                "radial-gradient(ellipse at 30% 0%, hsla(82 84% 56% / 0.12) 0%, transparent 70%)",
            }}
          />
        )}

        <div className="relative z-[1]">
          {/* Icon */}
          <div
            className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 motion-reduce:transition-none motion-reduce:group-hover:scale-100 motion-reduce:group-hover:rotate-0 ${
              isAccent ? "bg-[var(--color-accent)]/15" : "bg-gray-100 dark:bg-gray-800"
            }`}
          >
            <TierIcon
              size={24}
              className={
                isAccent ? "text-[var(--color-accent-fg)]" : "text-gray-600 dark:text-gray-300"
              }
            />
          </div>

          {/* Name */}
          <h3
            className={`text-xl font-bold ${
              isAccent ? "text-white" : "text-gray-900 dark:text-white"
            }`}
          >
            {t(`tiers.${tierKey}.name`)}
          </h3>

          {/* Price */}
          <p
            className={`mt-3 text-4xl font-extrabold tracking-tight ${
              isAccent ? "text-white" : "text-gray-900 dark:text-white"
            }`}
          >
            {t(`tiers.${tierKey}.price`)}
          </p>

          {/* Description */}
          <p
            className={`mt-2 text-sm leading-relaxed ${
              isAccent ? "text-gray-300" : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {t(`tiers.${tierKey}.description`)}
          </p>

          {/* Availability (hire card only) */}
          {isAccent && (
            <div className="mt-3 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              <span className="text-xs text-gray-300">{t("availability")}</span>
            </div>
          )}

          {/* Divider */}
          <div
            className={`my-6 h-px ${isAccent ? "bg-gray-700" : "bg-gray-100 dark:bg-gray-800"}`}
          />

          {/* Features */}
          <ul className="space-y-3">
            {features.map((f, i) => (
              <li
                key={i}
                className={`flex items-start gap-3 text-sm ${
                  isAccent ? "text-gray-300" : "text-gray-600 dark:text-gray-300"
                }`}
              >
                <CheckCircleFill
                  size={16}
                  className={`mt-0.5 shrink-0 ${
                    isAccent ? "text-[var(--color-accent-fg)]" : "text-[var(--color-accent-dark)]"
                  }`}
                />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div
          className={`relative z-[1] mt-8 flex items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold transition-[background-color,box-shadow,filter] duration-300 ${
            isAccent
              ? "bg-[var(--color-accent)] text-gray-900 group-hover:brightness-110 group-hover:shadow-[0_8px_24px_var(--color-accent-shadow)]"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 group-hover:bg-gray-200 dark:group-hover:bg-gray-700"
          }`}
        >
          {t(`tiers.${tierKey}.cta`)}
          <ArrowRight
            size={16}
            className="transition-transform group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
          />
        </div>
      </a>
    </AnimateIn>
  );
}

/* ------------------------------------------------------------------ */
/*  Service Carousel                                                   */
/* ------------------------------------------------------------------ */

const AUTO_PLAY_INTERVAL = 3000;
const PILL_HEIGHT = 60;

function wrap(min: number, max: number, v: number) {
  const rangeSize = max - min;
  return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min;
}

function ServiceCarousel() {
  const t = useTranslations("pricing");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const len = SERVICE_KEYS.length;

  const nextStep = React.useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % len);
  }, []);

  React.useEffect(() => {
    if (isPaused || shouldReduceMotion) return;
    const interval = setInterval(nextStep, AUTO_PLAY_INTERVAL);
    return () => clearInterval(interval);
  }, [nextStep, isPaused, shouldReduceMotion]);

  const activeKey = SERVICE_KEYS[activeIndex];
  const ActiveIcon = SERVICE_ICONS[activeIndex];
  const activeScore = CAPABILITY_DATA[activeIndex];
  const activeTech = TECH_STACKS[activeKey];
  const activeItems = t.raw(`services.${activeKey}.items`) as string[];

  return (
    <div
      className="relative overflow-hidden rounded-[2rem] lg:rounded-[3rem] flex flex-col lg:flex-row min-h-[520px] lg:min-h-[480px] border border-border/40"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ── Left panel: pill selector ── */}
      <div className="w-full lg:w-[38%] relative z-30 flex flex-col items-start justify-center overflow-hidden bg-[var(--color-accent)] dark:bg-[var(--color-accent-dark)]">
        {/* Gradient masks */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[var(--color-accent)] via-[var(--color-accent)]/80 to-transparent z-40 dark:from-[var(--color-accent-dark)] dark:via-[var(--color-accent-dark)]/80 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[var(--color-accent)] via-[var(--color-accent)]/80 to-transparent z-40 dark:from-[var(--color-accent-dark)] dark:via-[var(--color-accent-dark)]/80 pointer-events-none" />

        {/* Mobile: horizontal scroll */}
        <div className="flex lg:hidden w-full overflow-x-auto gap-2 px-6 py-6 scrollbar-hide">
          {SERVICE_KEYS.map((key, idx) => {
            const Icon = SERVICE_ICONS[idx];
            const isActive = idx === activeIndex;
            return (
              <button
                type="button"
                key={key}
                onClick={() => setActiveIndex(idx)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-medium uppercase tracking-wider whitespace-nowrap transition-[background-color,border-color,color,box-shadow] duration-300 border shrink-0 ${
                  isActive
                    ? "bg-gray-900 text-[var(--color-accent)] dark:bg-gray-950 shadow-md border-transparent"
                    : "bg-transparent text-gray-800/70 border-gray-900/10 hover:text-gray-900 hover:border-gray-900/30 dark:text-black/60 dark:border-black/10 dark:hover:text-black dark:hover:border-black/30"
                }`}
              >
                <Icon
                  size={14}
                  className={
                    isActive
                      ? "text-[var(--color-accent)] dark:text-[var(--color-accent)]"
                      : "text-gray-800/50 dark:text-black/40"
                  }
                />
                {t(`services.${key}.name`)}
              </button>
            );
          })}
        </div>

        {/* Desktop: vertical animated list */}
        <div className="hidden lg:flex relative w-full h-full items-center justify-start z-20 pl-10 xl:pl-14">
          {SERVICE_KEYS.map((key, idx) => {
            const Icon = SERVICE_ICONS[idx];
            const isActive = idx === activeIndex;
            const distance = idx - activeIndex;
            const wrappedDistance = wrap(-len / 2, len / 2, distance);

            return (
              <motion.div
                key={key}
                style={{ height: PILL_HEIGHT, width: "fit-content" }}
                animate={{
                  y: wrappedDistance * PILL_HEIGHT,
                  opacity: 1 - Math.abs(wrappedDistance) * 0.2,
                }}
                transition={{
                  ...(shouldReduceMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 90, damping: 22, mass: 1 }),
                }}
                className="absolute flex items-center justify-start"
              >
                <button
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`relative flex items-center gap-3 px-6 py-3 rounded-full transition-[background-color,border-color,color,box-shadow] duration-500 text-left border motion-reduce:transition-none ${
                    isActive
                      ? "bg-gray-900 text-[var(--color-accent)] dark:bg-gray-950 border-transparent z-10 shadow-xl"
                      : "bg-transparent text-gray-800/70 border-gray-900/10 hover:border-gray-900/40 hover:text-gray-900 dark:text-black/60 dark:border-black/10 dark:hover:border-black/30 dark:hover:text-black"
                  }`}
                >
                  <Icon
                    size={16}
                    className={
                      isActive
                        ? "text-[var(--color-accent)] dark:text-[var(--color-accent)]"
                        : "text-gray-800/40 dark:text-black/40"
                    }
                  />
                  <span className="font-medium text-sm tracking-tight whitespace-nowrap uppercase">
                    {t(`services.${key}.name`)}
                  </span>
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Right panel: detail card ── */}
      <div className="flex-1 relative bg-white/50 dark:bg-gray-950/40 flex items-center justify-center p-8 md:p-12 lg:p-14 overflow-hidden border-t lg:border-t-0 lg:border-l border-border/20">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeKey}
            initial={
              shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20, filter: "blur(4px)" }
            }
            animate={
              shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }
            }
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10, filter: "blur(4px)" }}
            transition={shouldReduceMotion ? { duration: 0 } : brandSpring.default}
            className="w-full max-w-lg"
          >
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-accent)]/15">
                <ActiveIcon size={24} className="text-[var(--color-accent-dark)]" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                  {t(`services.${activeKey}.name`)}
                </h4>
                <p className="text-xs font-mono uppercase tracking-widest text-gray-400 dark:text-gray-500 mt-0.5">
                  {activeScore.dimension}
                </p>
              </div>
            </div>

            {/* Score bar */}
            <div className="mb-6">
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">{t("radar_title")}</span>
                <motion.span
                  key={`score-${activeIndex}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums"
                >
                  {activeScore.score}
                </motion.span>
              </div>
              <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[var(--color-accent)] rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${activeScore.score}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Description items */}
            <div className="mb-8">
              <ul className="space-y-2">
                {activeItems.map((item, i) => (
                  <motion.li
                    key={item}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-300"
                  >
                    <CheckCircleFill
                      size={14}
                      className="text-[var(--color-accent-dark)] mt-0.5 shrink-0"
                    />
                    {item}
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Tech stack */}
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
                Tech Stack
              </p>
              <div className="flex flex-wrap gap-2">
                {activeTech.map((tech, i) => (
                  <motion.div
                    key={tech.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <TechBadge item={tech} />
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main section                                                       */
/* ------------------------------------------------------------------ */

export function PricingSection() {
  const t = useTranslations("pricing");

  return (
    <section className="mx-auto max-w-7xl px-6 py-32">
      {/* Header */}
      <div className="text-center mb-20">
        <AnimateIn preset="fade" inView>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mb-4">
            {t("label")}
          </p>
        </AnimateIn>
        <AnimateIn preset="fadeUp" delay={0.1} inView>
          <h2 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white md:text-5xl">
            {t("headline")}
          </h2>
        </AnimateIn>
        <AnimateIn preset="fadeUp" delay={0.15} inView>
          <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            {t("description")}
          </p>
        </AnimateIn>
      </div>

      {/* Tier cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 items-start">
        {TIER_KEYS.map((key, i) => (
          <TierCard key={key} tierKey={key} index={i} />
        ))}
      </div>

      {/* Stats strip */}
      <div className="relative mt-16 border-y border-gray-100 dark:border-gray-800 overflow-hidden">
        <DotPattern
          width={24}
          height={24}
          cr={0.8}
          className="text-gray-400/15 dark:text-gray-500/10 [mask-image:radial-gradient(ellipse_at_center,white_40%,transparent_75%)]"
        />
        <StatsStrip />
      </div>

      {/* Capability showcase */}
      <div className="mt-24 lg:mt-32">
        <AnimateIn preset="fade" inView>
          <div className="flex items-center justify-center gap-4 mb-12">
            <div className="hidden sm:block h-px w-12 bg-gray-200 dark:bg-gray-800" />
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 text-center m-0">
              {t("capabilities_label")}
            </p>
            <div className="hidden sm:block h-px w-12 bg-gray-200 dark:bg-gray-800" />
          </div>
        </AnimateIn>
        <AnimateIn preset="fadeUp" delay={0.1} inView>
          <ServiceCarousel />
        </AnimateIn>
      </div>
    </section>
  );
}
