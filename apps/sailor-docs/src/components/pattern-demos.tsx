"use client";

import {
  AppleLiquidGlassSwitcher,
  FlickeringGrid,
  HexGrid,
  InteractiveFrostedGlassCard,
  MagicCard,
  StarsCanvas,
  WarpBackground,
} from "@nebutra/ui/primitives";
import { Activity, ShieldCheck } from "lucide-react";

export function HexGridDemo() {
  return (
    <MagicCard
      className="w-full h-[400px] p-0 rounded-3xl border-[var(--neutral-5)] flex flex-col overflow-hidden bg-[var(--neutral-1)] shadow-sm relative"
      gradientColor="var(--neutral-3)"
    >
      {/* The HexGrid - faint, masked to the center */}
      <HexGrid
        size={40}
        color="var(--neutral-8)"
        opacity={0.3}
        glow={true}
        className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,white_10%,transparent_70%)] pointer-events-none"
      />

      {/* Highly readable UI Card */}
      <div className="relative z-10 w-full h-full flex items-center justify-center pointer-events-none">
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col gap-4 min-w-[300px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-inner flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-[#0BF1C3]" />
              </div>
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Authentication
              </span>
            </div>
            <span className="text-[10px] font-mono tracking-wider text-blue-700 dark:text-[#0BF1C3] bg-blue-100 dark:bg-[#0BF1C3]/10 px-2.5 py-1 rounded-full border border-blue-200 dark:border-[#0BF1C3]/20">
              SECURE
            </span>
          </div>
          <div className="space-y-2 mt-2">
            <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400 font-medium mb-1">
              <span>Verification</span>
              <span>Completing...</span>
            </div>
            <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full w-3/4 bg-blue-600 dark:bg-[#0BF1C3] rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </MagicCard>
  );
}

export function DotPatternCardDemo() {
  return (
    <MagicCard
      className="w-full h-[300px] p-0 rounded-3xl border-[var(--neutral-5)] flex flex-col overflow-hidden bg-[var(--neutral-1)] shadow-sm relative"
      gradientColor="var(--neutral-3)"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(0,51,254,0.15)_1px,transparent_1px)] dark:bg-[radial-gradient(circle,rgba(255,255,255,0.15)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(circle_at_center,white_40%,transparent_100%)] pointer-events-none" />

      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center pointer-events-none">
        <div className="flex items-center gap-3 px-5 py-2.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md shadow-lg">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-[#0BF1C3] animate-pulse ring-4 ring-blue-600/20 dark:ring-[#0BF1C3]/20" />
          <span className="text-xs font-semibold tracking-wide text-zinc-800 dark:text-zinc-200">
            System Synced
          </span>
          <span className="text-xs font-mono text-zinc-500 dark:text-zinc-500 pl-3 border-l border-zinc-300 dark:border-zinc-700">
            Just now
          </span>
        </div>
      </div>
    </MagicCard>
  );
}

export function FlickeringGridCardDemo() {
  return (
    <MagicCard
      className="w-full h-[400px] p-0 rounded-3xl border-[var(--neutral-5)] flex flex-col overflow-hidden bg-[var(--neutral-1)] shadow-sm relative"
      gradientColor="var(--neutral-3)"
    >
      <FlickeringGrid
        squareSize={16}
        color="var(--neutral-11)"
        maxOpacity={0.15}
        flickerChance={0.3}
        className="absolute inset-0 [mask-image:radial-gradient(circle_at_center,white_0%,transparent_80%)] pointer-events-none"
      />

      <div className="relative z-10 w-full h-full flex items-center justify-center pointer-events-none">
        <div className="bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 min-w-[280px]">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800/50">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Data Mesh Activity
              </span>
            </div>
            <div className="flex gap-1">
              <div className="w-1 h-3 rounded-full bg-blue-600 dark:bg-blue-500 animate-[pulse_1s_ease-in-out_infinite]" />
              <div className="w-1 h-3 rounded-full bg-blue-400 dark:bg-blue-400 animate-[pulse_1s_ease-in-out_0.2s_infinite]" />
              <div className="w-1 h-3 rounded-full bg-blue-200 dark:bg-blue-300 animate-[pulse_1s_ease-in-out_0.4s_infinite]" />
            </div>
          </div>
          <div className="space-y-2 mt-1">
            <div className="flex justify-between text-xs font-mono items-center">
              <span className="text-zinc-500 dark:text-zinc-400 uppercase tracking-widest text-[10px]">
                US-East-1
              </span>
              <span className="text-zinc-800 dark:text-zinc-200 font-medium">99.9%</span>
            </div>
            <div className="flex justify-between text-xs font-mono items-center">
              <span className="text-zinc-500 dark:text-zinc-400 uppercase tracking-widest text-[10px]">
                EU-West-2
              </span>
              <span className="text-zinc-800 dark:text-zinc-200 font-medium">98.4%</span>
            </div>
          </div>
        </div>
      </div>
    </MagicCard>
  );
}

export function WarpBackgroundDemo() {
  return (
    <div className="w-full h-[400px] rounded-3xl overflow-hidden relative border border-white/5 bg-black shadow-2xl">
      <div className="absolute inset-0 bg-black z-0" />
      <WarpBackground
        perspective={200}
        beamsPerSide={4}
        gridColor="rgba(255, 255, 255, 0.05)"
        className="absolute inset-0 border-0"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/80 z-0 pointer-events-none" />
        <div className="relative z-10 w-full h-full flex items-center justify-center pointer-events-none p-8">
          <div className="max-w-md text-center">
            <h2 className="text-3xl font-medium tracking-tight sm:text-4xl text-white drop-shadow-xl">
              Immersive Experiences
            </h2>
            <p className="mt-4 text-base text-zinc-300 drop-shadow-md">
              Web-GL based distortion effects for deep-focus hero sections and high-impact visual
              storytelling.
            </p>
          </div>
        </div>
      </WarpBackground>
    </div>
  );
}

export function StarsCanvasDemo() {
  return (
    <div className="w-full h-[400px] rounded-3xl overflow-hidden relative border border-white/5 bg-black">
      <StarsCanvas
        maxStars={200}
        hue={210}
        speedMultiplier={0.3}
        position="absolute"
        className="absolute inset-0"
      />
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center pointer-events-none">
        <div className="flex flex-col items-center gap-3">
          <h3 className="text-white font-medium text-2xl tracking-tight">Stellar Depth</h3>
          <p className="text-zinc-300 text-sm max-w-[280px] text-center leading-relaxed">
            Particle-based backgrounds utilizing subtle parallax to create a sense of vast space.
          </p>
        </div>
      </div>
    </div>
  );
}

export function GlassmorphismDemo({ lang = "en" }: { lang?: string }) {
  const texts =
    lang === "zh"
      ? {
          heading: "高级玻璃拟态",
          subheading: "展示我们的高级液态玻璃和磨砂质感，由 SVG 分形噪声驱动。",
          surfaceTitle: "基础玻璃 (Surface Glass)",
          surfaceDesc:
            "极致轻薄的精致处理。使用极低的背景填充 bg-white/[0.02]，柔和的背景模糊 backdrop-blur-[32px]，以及细腻的边框 border-white/[0.08]。",
          elevatedTitle: "悬浮玻璃 (Elevated Glass)",
          elevatedDesc:
            "用于突出的对话框悬浮层。采用更深的基底色 bg-[#0A0A0A]/60，强烈的背景模糊 backdrop-blur-[48px]，青色品牌色边框以及发光阴影。",
        }
      : {
          heading: "Advanced Glassmorphism",
          subheading:
            "Highlighting our premium liquid glass and frosted textures, powered by SVG fractal noise.",
          surfaceTitle: "Surface Glass",
          surfaceDesc:
            "Ultra-thin, delicate treatment. Uses minimal background fill bg-white/[0.02], soft backdrop blur backdrop-blur-[32px], and subtle border border-white/[0.08].",
          elevatedTitle: "Elevated Glass",
          elevatedDesc:
            "For prominent dialogs and floating layers. Uses a deeper base bg-[#0A0A0A]/60, stronger backdrop-blur-[48px], cyan brand border, and a glowing shadow.",
        };

  return (
    <div className="w-full rounded-3xl overflow-hidden relative border border-white/5 bg-[#050505]">
      {/* Background elements to show off the glass blur */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:16px_16px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)] pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0033FE] rounded-full mix-blend-screen filter blur-[128px] opacity-20 animate-pulse" />
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#0BF1C3] rounded-full mix-blend-screen filter blur-[128px] opacity-20 animate-pulse"
          style={{ animationDelay: "2s" }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-12 p-12 max-w-5xl w-full mx-auto">
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-3xl font-medium tracking-tight text-white">{texts.heading}</h2>
          <p className="text-zinc-400 max-w-md">{texts.subheading}</p>
        </div>

        <div className="flex items-center justify-center p-8 border border-white/10 rounded-3xl bg-white/5 shadow-2xl backdrop-blur-md w-full max-w-sm mx-auto">
          <AppleLiquidGlassSwitcher defaultValue="dark" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mt-4">
          <InteractiveFrostedGlassCard
            title={texts.surfaceTitle}
            description={texts.surfaceDesc}
            variant="surface"
            icon={
              <div className="font-mono text-xs font-bold w-full h-full flex items-center justify-center">
                01
              </div>
            }
          />
          <InteractiveFrostedGlassCard
            title={texts.elevatedTitle}
            description={texts.elevatedDesc}
            variant="elevated"
            icon={
              <div className="font-mono text-xs font-bold w-full h-full flex items-center justify-center">
                02
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
}
