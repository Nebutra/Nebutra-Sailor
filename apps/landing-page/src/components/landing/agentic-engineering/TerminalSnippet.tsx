"use client";

import { layoutWithLines, prepareWithSegments } from "@chenglou/pretext";
import { useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { TerminalToken } from "./data";

interface TerminalSnippetProps {
  tokens: TerminalToken[];
}

export function TerminalSnippet({ tokens }: TerminalSnippetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-10%" });
  const [dimensions, setDimensions] = useState({ width: 0, height: 100 });
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    let debounceTimer: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          setDimensions((prev) => ({ ...prev, width: entry.contentRect.width }));
        }, 50);
      }
    });

    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      clearTimeout(debounceTimer);
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current || dimensions.width === 0 || !isInView) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const padding = 16;
    const lineHeight = 22; // Spacious and clear line height
    const fontSize = 12;
    const fontFamily =
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
    const fontStr = `${fontSize}px ${fontFamily}`;

    const maxWidth = dimensions.width - padding * 2;
    if (maxWidth <= 0) return;

    const fullText = tokens.map((t) => t.text).join("");
    const charMeta: { color: string; glow: string | null }[] = [];

    // Resolve CSS variables for Canvas compatibility
    const resolveColor = (colorStr: string) => {
      if (colorStr.startsWith("var(")) {
        const varName = colorStr.slice(4, -1).trim();
        const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
        // If the variable returns space-separated RGB/HSL numbers (common in Tailwind), we can't just inject it into canvas without hsl() or rgb().
        // For safety, let's wrap it in rgb() if it looks like raw numbers or use it directly if it's hex/rgba.
        if (/^[\d.\s]+$/.test(val) && val.split(" ").length >= 3) {
          // Very basic heuristic for raw tailwind vars, but let's assume valid CSS colors
          return `rgb(${val.replace(/\s+/g, ", ")})`;
        }
        return val || colorStr;
      }
      return colorStr;
    };

    for (const t of tokens) {
      const color = resolveColor(t.color || "rgba(161, 161, 170, 0.8)");
      const glow = t.glowColor ? resolveColor(t.glowColor) : null;
      for (let i = 0; i < t.text.length; i++) {
        charMeta.push({ color, glow });
      }
    }

    try {
      // 1. Math-perfect zero-DOM layout using pretext
      const prepared = prepareWithSegments(fullText, fontStr, { whiteSpace: "pre-wrap" });
      const { lines, height: textHeight } = layoutWithLines(prepared, maxWidth, lineHeight);

      const totalHeight = Math.max(100, textHeight + padding * 2);
      if (dimensions.height !== totalHeight) {
        setDimensions((prev) => ({ ...prev, height: totalHeight }));
      }

      canvas.width = dimensions.width * dpr;
      canvas.height = totalHeight * dpr;
      ctx.scale(dpr, dpr);
      ctx.textBaseline = "top";
      ctx.font = fontStr;

      const charW = ctx.measureText("a").width;

      if (!hasAnimated.current) {
        let currentGlobalChar = 0;
        let animFrameId: number;
        const totalChars = fullText.length;

        const render = () => {
          ctx.clearRect(0, 0, dimensions.width, totalHeight);

          let drawnChars = 0;
          let cursorX = padding;
          let cursorY = padding;

          for (let l = 0; l < lines.length; l++) {
            const line = lines[l];
            for (let c = 0; c < line.text.length; c++) {
              if (drawnChars >= currentGlobalChar) {
                break;
              }

              const char = line.text[c];
              const meta = charMeta[drawnChars];
              const x = padding + c * charW;
              const y = padding + l * lineHeight;

              if (meta?.glow) {
                ctx.shadowColor = meta.glow;
                ctx.shadowBlur = 10;
              } else {
                ctx.shadowColor = "transparent";
                ctx.shadowBlur = 0;
              }

              ctx.fillStyle = meta?.color || "white";
              ctx.fillText(char, x, y);

              cursorX = x + charW;
              cursorY = y;
              drawnChars++;
            }
            if (drawnChars >= currentGlobalChar) break;
            cursorX = padding;
            cursorY = padding + (l + 1) * lineHeight;
          }

          // Trailing AI cursor
          if (currentGlobalChar < totalChars) {
            ctx.shadowColor = "rgba(34,197,94,0.4)";
            ctx.shadowBlur = 8;
            ctx.fillStyle = "rgba(34,197,94,0.9)";
            ctx.fillRect(cursorX, cursorY + 2, charW, fontSize + 2);
          }

          if (currentGlobalChar < totalChars) {
            // Speed: 5 chars per frame creates an aggressive, ultra-fast streaming visual
            currentGlobalChar = Math.min(totalChars, currentGlobalChar + 5);
            animFrameId = requestAnimationFrame(render);
          } else {
            hasAnimated.current = true;
          }
        };

        animFrameId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(animFrameId);
      } else {
        // Fallback static render
        ctx.clearRect(0, 0, dimensions.width, totalHeight);
        let drawnChars = 0;
        for (let l = 0; l < lines.length; l++) {
          const line = lines[l];
          for (let c = 0; c < line.text.length; c++) {
            const char = line.text[c];
            const meta = charMeta[drawnChars];
            const x = padding + c * charW;
            const y = padding + l * lineHeight;

            if (meta?.glow) {
              ctx.shadowColor = meta.glow;
              ctx.shadowBlur = 10;
            } else {
              ctx.shadowColor = "transparent";
              ctx.shadowBlur = 0;
            }

            ctx.fillStyle = meta?.color || "white";
            ctx.fillText(char, x, y);
            drawnChars++;
          }
        }
      }
    } catch (err) {
      console.error("Canvas Layout Error", err);
    }
  }, [dimensions.width, isInView, tokens]);

  return (
    <div className="w-full mt-auto relative z-10 rounded-xl border border-border/50 dark:border-white/5 bg-muted/60 dark:bg-zinc-950/90 shadow-2xl overflow-hidden group-hover:border-border dark:group-hover:border-white/20 transition-colors">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/50 dark:border-white/10 bg-muted/80 dark:bg-black/40">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/80 shadow-[0_2px_4px_rgba(239,68,68,0.3)]" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 shadow-[0_2px_4px_rgba(234,179,8,0.3)]" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/80 shadow-[0_2px_4px_rgba(34,197,94,0.3)]" />
        <div className="ml-2 text-[9px] font-mono tracking-widest text-muted-foreground uppercase">
          bash — ai-agent
        </div>
      </div>

      <div ref={containerRef} className="w-full relative" style={{ height: dimensions.height }}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ width: "100%", height: "100%", display: "block" }}
        />
      </div>
    </div>
  );
}

TerminalSnippet.displayName = "TerminalSnippet";
