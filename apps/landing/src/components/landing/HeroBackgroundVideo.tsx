"use client";

import { useTheme } from "@nebutra/tokens";

export const HERO_BACKGROUND_VIDEOS = {
  light:
    "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260302_085844_21a8f4b3-dea5-4ede-be16-d53f6973bb14.mp4",
  dark: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260306_074215_04640ca7-042c-45d6-bb56-58b1e8a42489.mp4",
} as const;

/**
 * Decorative theme-aware background video. Lives on the client so it can react
 * to theme toggles, but kept intentionally tiny so the surrounding HeroSection
 * stays an RSC and the H1 lands in the initial HTML payload (LCP candidate).
 *
 * `prefers-reduced-motion` is honored via CSS in globals.css — no JS hook
 * needed, which lets the rule apply before hydration.
 */
export function HeroBackgroundVideo() {
  const { resolvedTheme } = useTheme();
  const themeKey = resolvedTheme === "dark" ? "dark" : "light";
  const videoSource = HERO_BACKGROUND_VIDEOS[themeKey];

  return (
    <div
      aria-hidden="true"
      className="hero-motion-background pointer-events-none absolute inset-x-0 top-0 z-0"
    >
      <video
        key={videoSource}
        aria-hidden="true"
        autoPlay
        className="hero-motion-video"
        disablePictureInPicture
        loop
        muted
        playsInline
        preload="metadata"
        tabIndex={-1}
      >
        <source media="(min-width: 768px)" src={videoSource} type="video/mp4" />
      </video>
      <div className="hero-motion-pattern" />
      <div className="hero-motion-veil" />
    </div>
  );
}
