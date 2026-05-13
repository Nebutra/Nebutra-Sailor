"use client";

import { layoutWithLines, prepareWithSegments } from "@chenglou/pretext";
import { motion, useInView } from "framer-motion";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

const RAW_CODE = `class ScaleProtocol {
  execute(load: Growth): Strategy {
    if (load.demands === 'Middle Management') {
      return new Error('Bureaucracy Rejected');
    }
    return AI_Agents.orchestrate({
       operations: '100%',
       human_intellect: 'Creation + Strategy'
    });
  }
}`;

export function OrganizationalEvolution() {
  const t = useTranslations("impact");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  useEffect(() => {
    // Only run the extremely fast DOM-less animation when in view
    if (!canvasRef.current || !isInView) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    // We assume fixed dimensions for this aesthetic block
    const rect = { width: canvas.parentElement?.clientWidth || 500, height: 280 };

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.textBaseline = "top";

    let charCount = 0;
    let animationFrameId: number;
    let lastTime = window.performance.now();

    // UI Monospace standard, matching text-sm/text-base
    const fontStr =
      '14px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

    const render = (time: number) => {
      // Advance 1 character every ~30ms
      if (time - lastTime > 30) {
        charCount = charCount + 1;
        lastTime = time;
      }

      const currentText = RAW_CODE.substring(0, charCount);

      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.fillStyle = "#cbd5e1"; // matches var(--neutral-7) / slate-300 — Canvas 2D doesn't support CSS variables
      ctx.font = fontStr;

      if (currentText.length > 0) {
        // High performance Pretext text parsing & layout without DOM reflow
        const prepared = prepareWithSegments(currentText, fontStr, { whiteSpace: "pre-wrap" });
        const { lines } = layoutWithLines(prepared, rect.width - 20, 24);

        for (let i = 0; i < lines.length; i++) {
          ctx.fillText(lines[i].text, 10, i * 24 + 10);
        }

        // Draw the terminal cursor block
        if (lines.length > 0) {
          const lastLine = lines[lines.length - 1];
          ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
          // Blink logic using time modulus
          if (Math.floor(time / 400) % 2 === 0) {
            ctx.fillRect(10 + lastLine.width + 4, (lines.length - 1) * 24 + 10, 8, 14);
          }
        }
      } else {
        // Draw initial blinking cursor
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        if (Math.floor(time / 400) % 2 === 0) {
          ctx.fillRect(10, 10, 8, 14);
        }
      }

      // Keep pulsing the cursor indefinitely, but stop text increments once done
      if (charCount < RAW_CODE.length) {
        animationFrameId = requestAnimationFrame(render);
      } else {
        // Re-render just for the cursor blink if finished
        animationFrameId = requestAnimationFrame(render);
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => cancelAnimationFrame(animationFrameId);
  }, [isInView]);

  return (
    <section className="relative w-full bg-zinc-950 py-24 md:py-32 px-4 md:px-10 overflow-hidden pb-48">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="mx-auto max-w-[1400px] flex flex-col lg:flex-row items-center gap-16">
        <div className="flex-1 w-full lg:w-1/2 pl-0 md:pl-8">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <div className="text-sm text-neutral-500 font-mono mb-6 tracking-widest uppercase">
              {t("org_title")}
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-5xl text-white mb-6">
              {t("org_headline")}
            </h2>
            <p className="text-lg text-neutral-400 max-w-lg leading-relaxed font-serif">
              {t("org_desc")}
            </p>
          </motion.div>
        </div>

        <div className="flex-1 w-full lg:w-1/2" ref={containerRef}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="rounded-[var(--radius-card)] border border-[var(--neutral-6)] bg-zinc-950 overflow-hidden relative"
            style={{ boxShadow: "var(--ring-hairline)" }}
          >
            {/* Window Chrome */}
            <div className="flex items-center px-4 py-3 border-b border-white/10 bg-white/5">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/20" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/20" />
                <div className="w-3 h-3 rounded-full bg-green-500/20" />
              </div>
              <div className="ml-4 text-xs font-mono text-neutral-500">anti-bureaucracy.ts</div>
            </div>

            {/* High Performance Canvas via Pretext */}
            <div className="p-6 md:p-8 overflow-x-auto h-[280px] relative">
              {/* Screen reader visibility only! Fixes A11y Junk Output */}
              <pre className="sr-only">
                <code>{RAW_CODE}</code>
              </pre>

              {/* Actual Visual Renderer avoiding DOM Reflows */}
              <canvas
                ref={canvasRef}
                className="block w-full h-full cursor-text"
                style={{ width: "100%", height: "100%" }}
              />
            </div>

            <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
