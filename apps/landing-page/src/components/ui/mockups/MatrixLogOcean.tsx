"use client";

import { layoutWithLines, prepareWithSegments } from "@chenglou/pretext";
import { useEffect, useRef } from "react";

const MOCK_LOGS = [
  "[SUCCESS] Pipeline 'nebutra-sailor:main' completed in 1m 45s",
  "[INFO] Starting container deployment to eks-cluster-use1",
  "[WARN] High memory utilization in @nebutra/api-gateway (85%)",
  "[DEBUG] Checking cache: HIT for /api/v1/workspaces",
  "[INFO] Scaled @nebutra/web deployment to 4 replicas",
  "[SUCCESS] 853 vitest suites passed",
  "[INFO] Pretext calculated zero-DOM layout for 10,000 nodes in 0.01ms",
  "[WARN] Fallback proxy route activated for stripe-webhook",
  "[INFO] Running pgvector index rebuild on 'ecommerce' schema",
  "[SUCCESS] 7 architecture test assertions passed",
  "[DEBUG] Sent rate-limit heartbeat to Redis cluster",
  "[INFO] Triggering Turbopack HMR for 'landing-page'",
  "[SUCCESS] Postgres Edge functions synced successfully",
  "[INFO] Validating OpenAPI specs against zod schemas",
  "[DEBUG] Executing dynamic reflow layout in requestAnimationFrame",
  "[WARN] Rate limiting triggered for IP 192.168.1.1",
  "[INFO] Purging CDN cache for static assets across all regions",
  "[SUCCESS] Zero-downtime database migration completed",
  "[INFO] Scaling down background event processing workers",
];

// Combine logs into a massive single string to fill a column entirely
const MEGA_LOG_STRING =
  MOCK_LOGS.join("\n") +
  "\n" +
  MOCK_LOGS.join("\n") +
  "\n" +
  MOCK_LOGS.join("\n") +
  "\n" +
  MOCK_LOGS.join("\n") +
  "\n" +
  MOCK_LOGS.join("\n");

export function MatrixLogOcean() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    let width = wrapper.clientWidth;
    let height = wrapper.clientHeight;

    const resize = () => {
      width = wrapper.clientWidth;
      height = wrapper.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    // Mouse Tracking for the "Spotlight & Repel" effect
    let mouseX = -1000;
    let mouseY = -1000;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };
    const handleMouseLeave = () => {
      mouseX = -1000;
      mouseY = -1000;
    };

    wrapper.addEventListener("mousemove", handleMouseMove);
    wrapper.addEventListener("mouseleave", handleMouseLeave);

    const fontSize = 11;
    const lineHeight = 18;
    const fontDesc = `${fontSize}px ui-monospace, SFMono-Regular, Consolas, monospace`;
    ctx.font = fontDesc;

    // Use PRETEXT to pre-process the text segmentation ONCE.
    // Extremely efficient: measures chars via canvas exactly one time.
    const prepared = prepareWithSegments(MEGA_LOG_STRING, fontDesc, { whiteSpace: "pre-wrap" });

    // Ensure we can identify Hero logs easily by text content when drawing
    const isHeroLog = (str: string) => str.includes("[SUCCESS]") || str.includes("Pretext");

    let animId: number;

    const render = (time: number) => {
      ctx.clearRect(0, 0, width, height);
      ctx.font = fontDesc;
      ctx.textBaseline = "top";

      const isDark = document.documentElement.classList.contains("dark");

      // Calculate vertical global scroll offset
      // A gentle scroll upwards
      const scrollOffset = (time * 0.015) % (MOCK_LOGS.length * lineHeight * 2);

      // Determine columns based on screen width
      const colPadding = 48;
      const minColWidth = 350;
      const colCount = Math.max(2, Math.floor(width / minColWidth));
      const colBaseWidth = width / colCount;

      for (let i = 0; i < colCount; i++) {
        const colCenterX = i * colBaseWidth + colBaseWidth / 2;
        const distToMouseX = Math.abs(colCenterX - mouseX);
        const distToMouseY = Math.abs(height / 2 - mouseY); // Overall Y proximity

        // 1. Fluid Typography Reflow (Width Compression)
        // If the mouse is horizontally nearby, compress the column width dynamically.
        // Pretext will completely rethink the wrap layout instantly.
        let dynamicWidth = colBaseWidth - colPadding;
        const repelRadius = 300;

        if (mouseX > -500 && distToMouseX < repelRadius) {
          const squeezeNorm = (1 - distToMouseX / repelRadius) ** 2;
          // Squeeze by up to 35% of its width
          dynamicWidth -= squeezeNorm * (dynamicWidth * 0.35);
        }

        // Extremely fast zero-DOM reflow of the massive text block!
        const { lines } = layoutWithLines(prepared, dynamicWidth, lineHeight);

        const startX = i * colBaseWidth + colPadding / 2;

        // Render each line in this column
        for (let l = 0; l < lines.length; l++) {
          const lineY = l * lineHeight - scrollOffset;

          // Optimization: skip rendering if totally off screen
          if (lineY < -lineHeight || lineY > height + lineHeight) {
            continue;
          }

          const lineText = lines[l].text;

          // Spotlight effect (opacity based on distance to mouse)
          // If mouse is outside, everything is dim ambient. If mouse is inside, it becomes a spotlight.
          let alpha = 0.15; // default ambient
          let isSpotlight = false;

          if (mouseX > -500) {
            const distToWordY = Math.abs(lineY + lineHeight / 2 - mouseY);
            const distCenter = Math.sqrt(distToMouseX ** 2 + distToWordY ** 2);
            const spotRadius = 450;
            if (distCenter < spotRadius) {
              const glow = (1 - distCenter / spotRadius) ** 1.5;
              alpha = 0.15 + glow * 0.85; // Up to 1.0 opacity at mouse center
              isSpotlight = true;
            } else {
              alpha = 0.05; // aggressively dim outside spotlight to pop the core
            }
          }

          const hero = isHeroLog(lineText);
          let colorStr = "";
          let glowColor = "transparent";
          const wantsGlow = isSpotlight && hero;

          // Vercel/Cursor Geek Monochrome Palette mapped dynamically
          if (isDark) {
            if (hero) {
              colorStr =
                alpha > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(255,255,255,${alpha * 1.5})`;
              glowColor = "rgba(255,255,255,0.6)";
            } else {
              colorStr = `rgba(255,255,255,${alpha * 0.7})`;
            }
          } else {
            if (hero) {
              colorStr = alpha > 0.5 ? `rgba(9,9,11,${alpha})` : `rgba(9,9,11,${alpha * 1.5})`;
              glowColor = "rgba(9,9,11,0.2)";
            } else {
              colorStr = `rgba(9,9,11,${alpha * 0.7})`;
            }
          }

          if (wantsGlow) {
            ctx.shadowBlur = isDark ? 12 : 6;
            ctx.shadowColor = glowColor;
          } else {
            ctx.shadowBlur = 0;
          }

          ctx.fillStyle = colorStr;
          ctx.fillText(lineText, startX, lineY);
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resize);
      wrapper.removeEventListener("mousemove", handleMouseMove);
      wrapper.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="absolute inset-0 z-0 overflow-hidden opacity-60 pointer-events-auto cursor-crosshair"
      style={{
        maskImage: "linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
      }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: "blur(0.3px)" }}
      />
    </div>
  );
}
