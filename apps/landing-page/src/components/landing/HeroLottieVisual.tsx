"use client";

import dynamic from "next/dynamic";

const DotLottie = dynamic(
  async () => (await import("@lottiefiles/dotlottie-react")).DotLottieReact,
  {
    ssr: false,
    loading: () => (
      <div className="h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,var(--blue-5),transparent_70%)] blur-xl" />
    ),
  },
);

export function HeroLottieVisual() {
  return (
    <div className="relative mx-auto flex w-full max-w-md items-center justify-center rounded-[var(--radius-card)] border border-(--blue-7)/40 bg-(--neutral-1)/70 p-6 shadow-brand-lg backdrop-blur-sm dark:bg-black/30">
      <div
        className="absolute inset-0 rounded-[var(--radius-card)]"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--blue-9) 8%, transparent), color-mix(in srgb, var(--cyan-9) 12%, transparent))",
        }}
      />
      <div className="relative h-72 w-72">
        <DotLottie src="/animations/hero.lottie" loop autoplay className="h-full w-full" />
      </div>
    </div>
  );
}

HeroLottieVisual.displayName = "HeroLottieVisual";
