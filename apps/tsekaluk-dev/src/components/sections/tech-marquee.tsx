"use client";

import { OpenAI } from "@lobehub/icons";
import Image from "next/image";
import { useId } from "react";

function TechIcon({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={24}
      height={24}
      unoptimized
      className="w-6 h-6 object-contain dark:invert"
    />
  );
}

const si = (slug: string, alt: string) => (
  <TechIcon src={`https://cdn.simpleicons.org/${slug}/000000`} alt={alt} />
);

const TECHNOLOGIES = [
  // AI & Agents
  { name: "Claude Code", icon: si("anthropic", "Claude Code") },
  { name: "Antigravity", icon: si("googlegemini", "Antigravity") },
  { name: "OpenAI Codex", icon: <OpenAI size={24} className="w-6 h-6 dark:text-white" /> },
  { name: "LangChain", icon: si("langchain", "LangChain") },
  { name: "n8n", icon: si("n8n", "n8n") },
  { name: "PyTorch", icon: si("pytorch", "PyTorch") },
  // Frontend
  { name: "Next.js", icon: si("nextdotjs", "Next.js") },
  { name: "React 19", icon: si("react", "React 19") },
  { name: "TypeScript", icon: si("typescript", "TypeScript") },
  { name: "Tailwind v4", icon: si("tailwindcss", "Tailwind CSS") },
  // Backend & Infra
  { name: "Python", icon: si("python", "Python") },
  { name: "PostgreSQL", icon: si("postgresql", "PostgreSQL") },
  { name: "Prisma", icon: si("prisma", "Prisma") },
  { name: "Vercel", icon: si("vercel", "Vercel") },
  { name: "Turborepo", icon: si("turborepo", "Turborepo") },
  // Design & Product
  { name: "Figma", icon: si("figma", "Figma") },
  { name: "Framer", icon: si("framer", "Framer") },
  { name: "Storybook", icon: si("storybook", "Storybook") },
  // Tools
  { name: "PostHog", icon: si("posthog", "PostHog") },
  { name: "Notion", icon: si("notion", "Notion") },
  { name: "Linear", icon: si("linear", "Linear") },
  { name: "Stripe", icon: si("stripe", "Stripe") },
];

export function TechMarquee({ children }: { children?: React.ReactNode }) {
  const id = useId();

  return (
    <section className="w-full relative z-30 pt-24 pb-32 overflow-hidden flex flex-col items-center justify-center">
      {/* Kicker Header */}
      <div className="mx-auto max-w-7xl px-6 w-full mb-12 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="w-2 h-2 rounded-full bg-lime-400/80 animate-pulse ring-4 ring-lime-400/20" />
          <p className="text-xs md:text-[13px] font-semibold tracking-[0.2em] text-gray-500 uppercase">
            Core Infrastructure & Platforms
          </p>
        </div>
      </div>

      {/* Marquee Track */}
      <div
        className="group/marquee w-full max-w-[100vw] overflow-hidden relative flex"
        style={{
          maskImage: "linear-gradient(90deg, transparent, black 15%, black 85%, transparent)",
        }}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
            @keyframes scrollLogos-${id} {
              0% { transform: translateX(0); }
              100% { transform: translateX(calc(-50% - 1rem)); } /* -1rem adjustment for gap */
            }
            .logo-scroll-container-${id} {
              display: flex;
              width: max-content;
              animation: scrollLogos-${id} 50s linear infinite;
              will-change: transform;
            }
            .logo-scroll-container-${id}:hover {
              animation-play-state: paused;
            }
          `,
          }}
        />

        <div className={`logo-scroll-container-${id} flex items-center`}>
          {[1, 2].map((set) => (
            <div key={set} className="flex gap-4 md:gap-6 shrink-0 pl-4 md:pl-6 pr-4 md:pr-6">
              {TECHNOLOGIES.map((tech) => (
                <div
                  key={`${tech.name}-${set}`}
                  className="
                    relative group/pill flex items-center gap-4 px-6 py-4 
                    rounded-2xl shrink-0 cursor-default
                    bg-white dark:bg-[#0A0A0A]
                    border border-gray-100 dark:border-white/[0.04]
                    shadow-[0_4px_30px_rgb(0,0,0,0.03)] dark:shadow-[0_4px_30px_rgb(0,0,0,0.3)]
                    hover:border-gray-300 dark:hover:border-white/10
                    opacity-100 transition-[border-color,opacity,transform] duration-500 ease-out motion-reduce:transition-colors motion-reduce:transform-none
                    group-hover/marquee:opacity-40 hover:!opacity-100 
                    hover:scale-[1.02] hover:-translate-y-1 motion-reduce:hover:scale-100 motion-reduce:hover:translate-y-0
                  "
                >
                  <div className="w-8 h-8 flex items-center justify-center shrink-0 opacity-70 transition-[opacity,transform] duration-300 motion-reduce:transition-opacity group-hover/pill:opacity-100 group-hover/pill:rotate-12 group-hover/pill:scale-110 motion-reduce:group-hover/pill:rotate-0 motion-reduce:group-hover/pill:scale-100">
                    {tech.icon}
                  </div>
                  <span className="text-[15px] font-medium tracking-tight text-gray-700 dark:text-gray-300 transition-colors duration-300 group-hover/pill:text-black dark:group-hover/pill:text-white">
                    {tech.name}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Decorative gradient floor */}
      <div className="absolute bottom-0 w-full h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-white/5 to-transparent z-10" />

      {children}
    </section>
  );
}
