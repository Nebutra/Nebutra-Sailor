"use client";

import { useCallback, useEffect, useRef } from "react";
import { cn } from "../utils/cn";

// ══════════════════════════════════════════════════════════════════════════════
// LetterGlitch - Canvas-based glitch text animation
// ══════════════════════════════════════════════════════════════════════════════

interface LetterGlitchProps {
  glitchColors: string[];
  glitchSpeed?: number;
  centerVignette?: boolean;
  outerVignette?: boolean;
  smooth?: boolean;
  characters?: string;
  className?: string;
}

function LetterGlitch({
  glitchColors,
  glitchSpeed = 50,
  centerVignette = false,
  outerVignette = true,
  smooth = true,
  characters = ".,:;-*#",
  className = "",
}: LetterGlitchProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const letters = useRef<
    Array<{
      char: string;
      color: string;
      targetColor: string;
      colorProgress: number;
    }>
  >([]);
  const grid = useRef({ columns: 0, rows: 0 });
  const context = useRef<CanvasRenderingContext2D | null>(null);
  const lastGlitchTime = useRef(Date.now());

  const fontSize = 16;
  const charWidth = 10;
  const charHeight = 20;

  // Store props in refs so callbacks always see current values without re-triggering effects
  const glitchColorsRef = useRef(glitchColors);
  glitchColorsRef.current = glitchColors;
  const glitchSpeedRef = useRef(glitchSpeed);
  glitchSpeedRef.current = glitchSpeed;
  const smoothRef = useRef(smooth);
  smoothRef.current = smooth;
  const charactersRef = useRef(characters);
  charactersRef.current = characters;

  const getRandomChar = useCallback(() => {
    const syms = Array.from(charactersRef.current);
    return syms[Math.floor(Math.random() * syms.length)];
  }, []);

  const getRandomColor = useCallback(() => {
    const colors = glitchColorsRef.current;
    return colors[Math.floor(Math.random() * colors.length)];
  }, []);

  const hexToRgb = useCallback((hex: string) => {
    const shorthand = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthand, (_m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1] ?? "0", 16),
          g: parseInt(result[2] ?? "0", 16),
          b: parseInt(result[3] ?? "0", 16),
        }
      : null;
  }, []);

  const interpolateColor = useCallback(
    (s: { r: number; g: number; b: number }, e: { r: number; g: number; b: number }, f: number) =>
      `rgb(${Math.round(s.r + (e.r - s.r) * f)}, ${Math.round(s.g + (e.g - s.g) * f)}, ${Math.round(s.b + (e.b - s.b) * f)})`,
    [],
  );

  const calculateGrid = useCallback(
    (w: number, h: number) => ({
      columns: Math.ceil(w / charWidth),
      rows: Math.ceil(h / charHeight),
    }),
    [],
  );

  const initializeLetters = useCallback(
    (columns: number, rows: number) => {
      grid.current = { columns, rows };
      letters.current = Array.from({ length: columns * rows }, () => ({
        char: getRandomChar() || " ",
        color: getRandomColor() || "#000",
        targetColor: getRandomColor() || "#000",
        colorProgress: 1,
      }));
    },
    [getRandomChar, getRandomColor],
  );

  const drawLetters = useCallback(() => {
    if (!context.current || !canvasRef.current) return;
    const ctx = context.current;
    const { width, height } = canvasRef.current.getBoundingClientRect();
    ctx.clearRect(0, 0, width, height);
    ctx.font = `${fontSize}px monospace`;
    ctx.textBaseline = "top";
    letters.current.forEach((letter, i) => {
      const x = (i % grid.current.columns) * charWidth;
      const y = Math.floor(i / grid.current.columns) * charHeight;
      ctx.fillStyle = letter.color;
      ctx.fillText(letter.char, x, y);
    });
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = parent.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    if (context.current) context.current.setTransform(dpr, 0, 0, dpr, 0, 0);
    const { columns, rows } = calculateGrid(rect.width, rect.height);
    initializeLetters(columns, rows);
    drawLetters();
  }, [calculateGrid, initializeLetters, drawLetters]);

  const updateLetters = useCallback(() => {
    const updateCount = Math.max(1, Math.floor(letters.current.length * 0.05));
    for (let i = 0; i < updateCount; i++) {
      const idx = Math.floor(Math.random() * letters.current.length);
      if (!letters.current[idx]) continue;
      letters.current[idx].char = getRandomChar() || " ";
      letters.current[idx].targetColor = getRandomColor() || "#000";
      if (!smoothRef.current) {
        letters.current[idx].color = letters.current[idx].targetColor;
        letters.current[idx].colorProgress = 1;
      } else {
        letters.current[idx].colorProgress = 0;
      }
    }
  }, [getRandomChar, getRandomColor]);

  const handleSmooth = useCallback(() => {
    let redraw = false;
    letters.current.forEach((l) => {
      if (l.colorProgress < 1) {
        l.colorProgress += 0.05;
        if (l.colorProgress > 1) l.colorProgress = 1;
        const s = hexToRgb(l.color);
        const e = hexToRgb(l.targetColor);
        if (s && e) {
          l.color = interpolateColor(s, e, l.colorProgress);
          redraw = true;
        }
      }
    });
    if (redraw) drawLetters();
  }, [hexToRgb, interpolateColor, drawLetters]);

  const animate = useCallback(() => {
    const now = Date.now();
    if (now - lastGlitchTime.current >= glitchSpeedRef.current) {
      updateLetters();
      drawLetters();
      lastGlitchTime.current = now;
    }
    if (smoothRef.current) handleSmooth();
    animationRef.current = requestAnimationFrame(animate);
  }, [updateLetters, drawLetters, handleSmooth]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    context.current = canvas.getContext("2d");
    resizeCanvas();
    animate();
    let resizeTimeout: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        resizeCanvas();
        animate();
      }, 100);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, [animate, resizeCanvas]);

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      <canvas ref={canvasRef} className="block h-full w-full" />
      {outerVignette && (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(0,0,0,0)_60%,rgba(0,0,0,1)_100%)]" />
      )}
      {centerVignette && (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(0,0,0,0.8)_0%,rgba(0,0,0,0)_60%)]" />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FallbackCard - Placeholder card with glitch animation
// ══════════════════════════════════════════════════════════════════════════════

export interface FallbackCardProps {
  /** Additional CSS classes */
  className?: string;
  /** Message to display */
  message?: string;
  /** Show monitor icon */
  showIcon?: boolean;
  /** Show glitch animation */
  showGlitch?: boolean;
  /** Color theme */
  theme?: "dark" | "light";
  /** Card height */
  height?: number | string;
}

/**
 * FallbackCard - A placeholder card with animated glitch text effect
 *
 * @example
 * ```tsx
 * <FallbackCard
 *   message="Preview not available"
 *   theme="dark"
 *   showGlitch
 *   showIcon
 * />
 * ```
 */
export function FallbackCard({
  className,
  message = "Preview not available",
  showIcon = true,
  showGlitch = true,
  theme = "dark",
  height = 400,
}: FallbackCardProps) {
  const glitchColors =
    theme === "dark"
      ? ["#78b4ff", "#a0c4ff", "#c7d2fe", "#e0e7ff", "#f0f4ff"]
      : ["#374151", "#6b7280", "#9ca3af", "#d1d5db"];

  const baseBg = theme === "dark" ? "bg-black text-white/90" : "bg-white text-black/80";

  return (
    <div
      className={cn(
        "relative flex w-full flex-col items-center justify-center overflow-hidden rounded-[var(--radius-2xl)] border shadow-md",
        baseBg,
        className,
      )}
      style={{ height }}
    >
      {showGlitch && (
        <div className="absolute inset-0 z-10 opacity-25">
          <LetterGlitch glitchColors={glitchColors} characters="₀₁. " />
        </div>
      )}

      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            theme === "dark"
              ? "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(120, 180, 255, 0.25), transparent 70%), #000000"
              : "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(55,65,81,0.2), transparent 70%), #ffffff",
        }}
      />

      <div className="relative z-20 flex flex-col items-center justify-center p-6">
        {showIcon && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="mb-3 h-10 w-10 opacity-70"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <rect x="2" y="4" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="20" x2="16" y2="20" />
          </svg>
        )}
        <p className="text-center text-sm font-bold">{message}</p>
      </div>
    </div>
  );
}

FallbackCard.displayName = "FallbackCard";

export type { LetterGlitchProps };
export { LetterGlitch };
