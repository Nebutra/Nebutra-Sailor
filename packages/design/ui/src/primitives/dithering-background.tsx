"use client";

import { Dithering, type DitheringProps } from "@paper-design/shaders-react";
import type * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { BRAND_FALLBACK, getBrandPrimary, getBrandTertiary } from "../utils/brand-colors";
import { cn } from "../utils/cn";

/** Linear RGB mix between two hex colors */
function mixColors(a: string, b: string, t: number): string {
  const ah = a.replace("#", "");
  const bh = b.replace("#", "");
  const ai = parseInt(ah, 16);
  const bi = parseInt(bh, 16);
  const ar = (ai >> 16) & 0xff;
  const ag = (ai >> 8) & 0xff;
  const ab = ai & 0xff;
  const br = (bi >> 16) & 0xff;
  const bg = (bi >> 8) & 0xff;
  const bb = bi & 0xff;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return `#${((1 << 24) + (rr << 16) + (rg << 8) + rb).toString(16).slice(1)}`;
}

function getSystemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

export type ThemeMode = "light" | "dark" | "system";

export interface DitheringThemeConfig {
  /** Background color */
  bg: string;
  /** Shader back color */
  back: string;
  /** Shader front color (base) */
  frontBase: string;
  /** Shader front color (mix target) */
  frontMix: string;
  /** Mix factor for intensity */
  mixFactor: number;
  /** Base animation speed */
  baseSpeed: number;
  /** Speed multiplier for intensity */
  speedMultiplier: number;
  /** Base pixel size */
  basePxSize: number;
  /** Pixel size range for intensity */
  pxSizeRange: number;
  /** Base scale */
  baseScale: number;
  /** Scale range for intensity */
  scaleRange: number;
  /** Glow gradient */
  glow: string;
}

export interface DitheringBackgroundProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "style"> {
  /** Theme mode: "light" | "dark" | "system" */
  themeMode?: ThemeMode;
  /** Visual intensity 0..1 */
  intensity?: number;
  /** Enable subtle parallax on mouse move */
  parallax?: boolean;
  /** Parallax strength in pixels */
  parallaxStrength?: number;
  /** Whether to sync Tailwind dark class */
  syncTailwindDark?: boolean;
  /** Dithering shape */
  shape?: DitheringProps["shape"];
  /** Dithering pattern type */
  type?: DitheringProps["type"];
  /** Custom dark theme config */
  darkConfig?: Partial<DitheringThemeConfig>;
  /** Custom light theme config */
  lightConfig?: Partial<DitheringThemeConfig>;
  /** Show film grain overlay */
  showGrain?: boolean;
  /** Show vignette overlay */
  showVignette?: boolean;
  /** Show top shine overlay */
  showShine?: boolean;
  /** Show glow overlay */
  showGlow?: boolean;
}

/**
 * Build default dark config. Resolves brand CSS vars at call time so the
 * shader receives a raw hex value (it cannot consume `var(...)` directly).
 * Falls back to brand hex literals in SSR / no-DOM environments.
 */
function buildDefaultDarkConfig(): DitheringThemeConfig {
  const primary = getBrandPrimary();
  return {
    bg: "#000000",
    back: "#00000000",
    frontBase: "#001882",
    frontMix: primary,
    mixFactor: 0.35,
    baseSpeed: 0.28,
    speedMultiplier: 0.35,
    basePxSize: 2,
    pxSizeRange: 2,
    baseScale: 1.05,
    scaleRange: 0.15,
    glow: `radial-gradient(60% 40% at 50% 40%, ${primary}1A, transparent 70%)`,
  };
}

function buildDefaultLightConfig(): DitheringThemeConfig {
  const primary = getBrandPrimary();
  const tertiary = getBrandTertiary();
  return {
    bg: "#F7FAFF",
    back: "#00000000",
    frontBase: primary,
    frontMix: tertiary,
    mixFactor: 0.35,
    baseSpeed: 0.22,
    speedMultiplier: 0.28,
    basePxSize: 2,
    pxSizeRange: 2,
    baseScale: 1.03,
    scaleRange: 0.12,
    glow: `radial-gradient(60% 40% at 50% 40%, ${primary}1A, transparent 70%)`,
  };
}

/** Static SSR fallbacks used before client-side hydration. */
const DEFAULT_DARK_CONFIG: DitheringThemeConfig = {
  bg: "#000000",
  back: "#00000000",
  frontBase: "#001882",
  frontMix: BRAND_FALLBACK.primary,
  mixFactor: 0.35,
  baseSpeed: 0.28,
  speedMultiplier: 0.35,
  basePxSize: 2,
  pxSizeRange: 2,
  baseScale: 1.05,
  scaleRange: 0.15,
  glow: `radial-gradient(60% 40% at 50% 40%, ${BRAND_FALLBACK.primary}1A, transparent 70%)`,
};

const DEFAULT_LIGHT_CONFIG: DitheringThemeConfig = {
  bg: "#F7FAFF",
  back: "#00000000",
  frontBase: BRAND_FALLBACK.primary,
  frontMix: BRAND_FALLBACK.tertiary,
  mixFactor: 0.35,
  baseSpeed: 0.22,
  speedMultiplier: 0.28,
  basePxSize: 2,
  pxSizeRange: 2,
  baseScale: 1.03,
  scaleRange: 0.12,
  glow: `radial-gradient(60% 40% at 50% 40%, ${BRAND_FALLBACK.primary}1A, transparent 70%)`,
};

/**
 * DitheringBackground - Theme-aware animated dithering shader background
 *
 * A WebGL-powered dithering background with multiple overlay effects
 * including glow, vignette, film grain, and shine sweep.
 *
 * @example
 * ```tsx
 * <div className="relative min-h-screen">
 *   <DitheringBackground
 *     themeMode="system"
 *     intensity={0.8}
 *     parallax
 *   />
 *   <YourContent className="relative z-10" />
 * </div>
 * ```
 */
export function DitheringBackground({
  themeMode = "system",
  intensity = 0.8,
  parallax = true,
  parallaxStrength = 8,
  syncTailwindDark = true,
  shape = "wave",
  type = "4x4",
  darkConfig,
  lightConfig,
  showGrain = true,
  showVignette = true,
  showShine = true,
  showGlow = true,
  className,
  ...props
}: DitheringBackgroundProps) {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (themeMode === "dark") return true;
    if (themeMode === "light") return false;
    return getSystemPrefersDark();
  });

  // Keep Tailwind dark class in sync
  useEffect(() => {
    if (!syncTailwindDark) return;

    const root = document.documentElement;
    const applyDark = (dark: boolean) => {
      root.classList.toggle("dark", dark);
    };

    if (themeMode === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => {
        setIsDark(e.matches);
        applyDark(e.matches);
      };
      applyDark(getSystemPrefersDark());
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    } else {
      setIsDark(themeMode === "dark");
      applyDark(themeMode === "dark");
    }
  }, [themeMode, syncTailwindDark]);

  // Track hydration so we can swap SSR fallback hex for resolved brand CSS vars.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Derived config based on theme and intensity
  const config = useMemo(() => {
    const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));
    const t = clamp(intensity);

    const defaults = mounted
      ? isDark
        ? buildDefaultDarkConfig()
        : buildDefaultLightConfig()
      : isDark
        ? DEFAULT_DARK_CONFIG
        : DEFAULT_LIGHT_CONFIG;

    const baseConfig = isDark ? { ...defaults, ...darkConfig } : { ...defaults, ...lightConfig };

    return {
      back: baseConfig.back,
      front: mixColors(baseConfig.frontBase, baseConfig.frontMix, t * baseConfig.mixFactor),
      bg: baseConfig.bg,
      speed: baseConfig.baseSpeed + t * baseConfig.speedMultiplier,
      pxSize: Math.round(baseConfig.basePxSize + t * baseConfig.pxSizeRange),
      scale: baseConfig.baseScale + t * baseConfig.scaleRange,
      glow: baseConfig.glow,
    };
  }, [isDark, intensity, darkConfig, lightConfig, mounted]);

  // Optional mouse parallax
  useEffect(() => {
    if (!parallax) return;
    const root = document.getElementById("dithering-bg-parallax");
    if (!root) return;

    const onMove = (e: MouseEvent) => {
      const { innerWidth: w, innerHeight: h } = window;
      const x = (e.clientX / w) * 2 - 1;
      const y = (e.clientY / h) * 2 - 1;
      root.style.setProperty("--parallax-x", `${(-x * parallaxStrength).toFixed(2)}px`);
      root.style.setProperty("--parallax-y", `${(-y * parallaxStrength).toFixed(2)}px`);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [parallax, parallaxStrength]);

  return (
    <div
      id="dithering-bg-parallax"
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 transition-colors duration-500",
        className,
      )}
      style={{
        backgroundColor: config.bg,
        transform: parallax
          ? "translate3d(var(--parallax-x,0), var(--parallax-y,0), 0)"
          : undefined,
        willChange: parallax ? "transform" : undefined,
      }}
      {...props}
    >
      {/* Core dithering shader */}
      <Dithering
        colorBack={config.back}
        colorFront={config.front}
        speed={config.speed}
        shape={shape}
        type={type}
        pxSize={config.pxSize}
        scale={config.scale}
        style={{
          height: "100vh",
          width: "100vw",
        }}
      />

      {/* Soft glow layer (theme-aware) */}
      {showGlow && (
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            backgroundImage: config.glow,
            mixBlendMode: isDark ? "screen" : "multiply",
            opacity: 1,
          }}
        />
      )}

      {/* Subtle vignette for depth */}
      {showVignette && (
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 80% at 50% 50%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.25) 100%)",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Film grain for texture */}
      {showGrain && (
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.25' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.11'/%3E%3C/svg%3E\")",
            backgroundSize: "cover",
            opacity: 0.5,
            mixBlendMode: isDark ? "screen" : "multiply",
          }}
        />
      )}

      {/* Top shine sweep for a premium feel */}
      {showShine && (
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 35%)",
            opacity: isDark ? 0.25 : 0.4,
          }}
        />
      )}
    </div>
  );
}

DitheringBackground.displayName = "DitheringBackground";
