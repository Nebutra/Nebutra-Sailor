import Antigravity from "@lobehub/icons/es/Antigravity";
import Apple from "@lobehub/icons/es/Apple";
import CherryStudio from "@lobehub/icons/es/CherryStudio";
import ClaudeCode from "@lobehub/icons/es/ClaudeCode";
import Codex from "@lobehub/icons/es/Codex";
import Cursor from "@lobehub/icons/es/Cursor";
import Dify from "@lobehub/icons/es/Dify";
import Flowith from "@lobehub/icons/es/Flowith";
import Gemini from "@lobehub/icons/es/Gemini";
import LobeHub from "@lobehub/icons/es/LobeHub";
import Lovable from "@lobehub/icons/es/Lovable";
import Lovart from "@lobehub/icons/es/Lovart";
import Midjourney from "@lobehub/icons/es/Midjourney";
import Minimax from "@lobehub/icons/es/Minimax";
import N8n from "@lobehub/icons/es/N8n";
import NotebookLM from "@lobehub/icons/es/NotebookLM";
import Notion from "@lobehub/icons/es/Notion";
import Ollama from "@lobehub/icons/es/Ollama";
import Perplexity from "@lobehub/icons/es/Perplexity";
import Poe from "@lobehub/icons/es/Poe";
import Trae from "@lobehub/icons/es/Trae";
import LogoColor from "@nebutra/brand/assets/logo/logo-color.svg";
import { AnimateIn } from "@nebutra/ui/components";
import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

// ── Metadata ───────────────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.uses" });
  return {
    title: t("headline"),
  };
}

// ── Types ──────────────────────────────────────────────────────────────────
type ToolItem = {
  icon: React.ReactNode;
  name: string;
  desc: string;
  tag?: string;
};

type AITool = {
  icon: React.ReactNode;
  name: string;
  label: string;
};

// ── Data ───────────────────────────────────────────────────────────────────
const EDITORS: ToolItem[] = [
  {
    icon: <ClaudeCode.Avatar size={48} />,
    name: "Claude Code",
    desc: "Primary agentic coding environment. Handles architecture-level tasks.",
    tag: "daily driver",
  },
  {
    icon: <Cursor.Avatar size={48} />,
    name: "Cursor",
    desc: "AI-native editor for focused implementation sprints.",
    tag: "daily driver",
  },
  {
    icon: <Antigravity.Avatar size={48} />,
    name: "Antigravity",
    desc: "Next-gen AI coding experience — still exploring the edges.",
  },
  {
    icon: <Codex.Avatar size={48} />,
    name: "OpenAI Codex",
    desc: "Cloud-based coding agent for async task delegation.",
  },
  {
    icon: <Trae.Avatar size={48} />,
    name: "Trae",
    desc: "ByteDance's AI IDE — useful for certain China-market integrations.",
  },
];

const AI_TOOLS: AITool[] = [
  { icon: <ClaudeCode.Avatar size={48} />, name: "ClaudeCode", label: "Claude Code" },
  { icon: <Cursor.Avatar size={48} />, name: "Cursor", label: "Cursor" },
  { icon: <Gemini.Avatar size={48} />, name: "Gemini", label: "Gemini" },
  { icon: <Codex.Avatar size={48} />, name: "Codex", label: "Codex" },
  { icon: <Midjourney.Avatar size={48} />, name: "Midjourney", label: "Midjourney" },
  { icon: <Perplexity.Avatar size={48} />, name: "Perplexity", label: "Perplexity" },
  { icon: <NotebookLM.Avatar size={48} />, name: "NotebookLM", label: "NotebookLM" },
  { icon: <Notion.Avatar size={48} />, name: "Notion", label: "Notion AI" },
  { icon: <CherryStudio.Avatar size={48} />, name: "CherryStudio", label: "Cherry Studio" },
  { icon: <LobeHub.Avatar size={48} />, name: "LobeHub", label: "LobeChat" },
  { icon: <Ollama.Avatar size={48} />, name: "Ollama", label: "Ollama" },
  { icon: <Flowith.Avatar size={48} />, name: "Flowith", label: "Flowith" },
  { icon: <Minimax.Avatar size={48} />, name: "Minimax", label: "Minimax" },
  { icon: <Lovable.Avatar size={48} />, name: "Lovable", label: "Lovable" },
  { icon: <Lovart.Avatar size={48} />, name: "Lovart", label: "Lovart" },
  { icon: <Poe.Avatar size={48} />, name: "Poe", label: "Poe" },
  { icon: <Dify.Avatar size={48} />, name: "Dify", label: "Dify" },
  { icon: <N8n.Avatar size={48} />, name: "N8n", label: "n8n" },
];

// ── Sub-components ─────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-8 flex items-center gap-4">
      <h2 className="font-mono text-xs font-semibold tracking-widest uppercase text-gray-400 dark:text-gray-500">
        {children}
      </h2>
      <div className="h-px flex-1 bg-gradient-to-r from-gray-200 to-transparent dark:from-white/10 dark:to-transparent" />
    </div>
  );
}

function ToolRow({ item }: { item: ToolItem }) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-gray-100 dark:border-white/5 bg-white/40 dark:bg-gray-900/40 p-6 backdrop-blur-xl transition-[background-color,box-shadow,transform] duration-500 hover:bg-white/80 dark:hover:bg-gray-800/80 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgba(255,255,255,0.02)] hover:-translate-y-1 motion-reduce:transition-colors motion-reduce:hover:translate-y-0">
      {/* Subtle hover gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--color-accent)]/0 via-transparent to-[var(--color-accent)]/0 opacity-0 transition-opacity duration-500 group-hover:from-[var(--color-accent)]/5 group-hover:opacity-100 dark:group-hover:from-[var(--color-accent)]/10" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6">
        <div className="shrink-0 transition-transform duration-500 group-hover:scale-110 group-hover:drop-shadow-md motion-reduce:transition-none motion-reduce:group-hover:scale-100">
          {item.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold tracking-tight text-foreground transition-colors group-hover:text-[var(--color-accent)]">
              {item.name}
            </h3>
            {item.tag && (
              <span className="rounded-full bg-[var(--color-accent)]/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest text-[var(--color-accent)] ring-1 ring-inset ring-[var(--color-accent)]/20">
                {item.tag}
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">{item.desc}</p>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default async function UsesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.uses" });

  return (
    <section className="mx-auto max-w-5xl px-6 py-24 md:py-32 outline-none">
      {/* Header */}
      <AnimateIn preset="fadeUp" className="mb-24 md:mb-32">
        <p className="mb-6 text-xs font-mono tracking-widest text-[var(--color-accent)] uppercase">
          {t("label")}
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-6xl max-w-3xl leading-[1.1]">
          {t("headline")}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-gray-500 dark:text-gray-400">
          {t("description")}
        </p>
      </AnimateIn>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
        {/* Left Column (Workstation & Editors) */}
        <div className="md:col-span-7 flex flex-col gap-16 md:gap-24">
          {/* Workstation */}
          <div>
            <AnimateIn preset="fadeUp" delay={0.1}>
              <SectionLabel>{t("section_workstation")}</SectionLabel>
              <div className="group relative overflow-hidden rounded-[2rem] border border-gray-100 dark:border-white/5 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-900/50 p-8 md:p-10 shadow-sm transition-[box-shadow,transform] duration-500 hover:shadow-xl dark:hover:shadow-[0_0_40px_rgba(255,255,255,0.03)] hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                {/* Spotlight hover effect container */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,var(--color-accent)_0%,transparent_60%)] opacity-0 transition-opacity duration-700 group-hover:opacity-5 dark:group-hover:opacity-10 mix-blend-plus-lighter" />

                <div className="relative z-10">
                  <div className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-white dark:bg-gray-800 shadow-[0_2px_10px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.2)] ring-1 ring-gray-950/5 dark:ring-white/10 transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-3 motion-reduce:transition-none motion-reduce:group-hover:scale-100 motion-reduce:group-hover:rotate-0">
                    <Apple size={44} className="text-gray-800 dark:text-gray-100" />
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl mb-2">
                    MacBook Air 15&quot;
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 mb-6">
                    <span className="font-mono text-xs tracking-widest text-gray-400 dark:text-gray-500 uppercase">
                      Apple M4
                    </span>
                    <span className="text-gray-300 dark:text-gray-700">·</span>
                    <span className="font-mono text-xs tracking-widest text-gray-400 dark:text-gray-500 uppercase">
                      24 GB
                    </span>
                    <span className="text-gray-300 dark:text-gray-700">·</span>
                    <span className="font-mono text-xs tracking-widest text-gray-400 dark:text-gray-500 uppercase">
                      macOS 26
                    </span>
                  </div>
                  <p className="text-base leading-relaxed text-gray-500 dark:text-gray-400">
                    The right balance of portability and power for shipping AI-native products. M4
                    handles local model inference without complaint. Highly reliable and silent
                    workstation.
                  </p>
                </div>
              </div>
            </AnimateIn>
          </div>

          {/* Editors */}
          <div>
            <AnimateIn preset="fadeUp" delay={0.2}>
              <SectionLabel>{t("section_editors")}</SectionLabel>
              <div className="flex flex-col gap-4">
                {EDITORS.map((item) => (
                  <ToolRow key={item.name} item={item} />
                ))}
              </div>
            </AnimateIn>
          </div>
        </div>

        {/* Right Column (AI Toolkit & Dogfooding) */}
        <div className="md:col-span-5 flex flex-col gap-16 md:gap-24">
          {/* Dogfooding */}
          <div>
            <AnimateIn preset="fadeUp" delay={0.3}>
              <SectionLabel>{t("section_dogfooding")}</SectionLabel>
              <div className="group relative overflow-hidden rounded-[2rem] border border-[var(--color-accent)]/20 bg-gradient-to-br from-[var(--color-accent)]/5 to-transparent p-8 md:p-10 transition-[box-shadow,transform] duration-500 hover:shadow-[0_20px_40px_-15px_var(--color-accent)] dark:hover:shadow-[0_0_40px_rgba(var(--color-accent-rgb),0.1)] hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                <div className="relative z-10 flex flex-col h-full">
                  <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white dark:bg-gray-800 shadow-[0_2px_10px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.2)] ring-1 ring-gray-950/5 dark:ring-white/10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 motion-reduce:transition-none motion-reduce:group-hover:scale-100 motion-reduce:group-hover:rotate-0">
                    <Image src={LogoColor.src} alt="Nebutra Logo" width={36} height={36} />
                  </div>
                  <h3 className="mb-2 text-xl font-bold tracking-tight text-foreground transition-colors group-hover:text-[var(--color-accent)]">
                    Nebutra-Sailor
                  </h3>
                  <p className="mb-6 font-mono text-xs tracking-widest text-[var(--color-accent)]/80 uppercase">
                    Internal monorepo framework
                  </p>
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    Every new project starts with Nebutra-Sailor — the same monorepo powering this
                    site. Next.js 16, Tailwind v4, Turbo, shared UI + token system. Build once,
                    deploy everywhere. This forces me to maintain the framework by actually living
                    in it.
                  </p>
                </div>
              </div>
            </AnimateIn>
          </div>

          {/* AI Toolkit */}
          <div>
            <AnimateIn preset="fadeUp" delay={0.4}>
              <SectionLabel>{t("section_ai_toolkit")}</SectionLabel>
              <p className="mb-8 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                {t("ai_toolkit_desc")}
              </p>

              <div className="grid grid-cols-3 gap-3">
                {AI_TOOLS.map((tool) => (
                  <div
                    key={tool.name}
                    className="group relative flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100 dark:border-white/5 bg-white/50 dark:bg-gray-900/50 p-4 transition-[background-color,border-color,box-shadow,transform] duration-300 hover:bg-white dark:hover:bg-gray-800 hover:border-[var(--color-accent)]/30 hover:shadow-md hover:-translate-y-1 motion-reduce:transition-colors motion-reduce:hover:translate-y-0"
                  >
                    <div className="transition-transform duration-500 group-hover:scale-125 group-hover:drop-shadow-lg motion-reduce:transition-none motion-reduce:group-hover:scale-100">
                      {tool.icon}
                    </div>
                    <span className="text-center font-mono text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-500 transition-colors group-hover:text-foreground">
                      {tool.label}
                    </span>
                  </div>
                ))}
              </div>
            </AnimateIn>
          </div>
        </div>
      </div>
    </section>
  );
}
