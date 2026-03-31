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
  "[INFO] Pretext calculated zero-DOM layout for 10,000 nodes in 0.04ms",
  "[WARN] Fallback proxy route activated for stripe-webhook",
  "[INFO] Running pgvector index rebuild on 'ecommerce' schema",
  "[SUCCESS] 7 architecture test assertions passed",
  "[DEBUG] Sent rate-limit heartbeat to Redis cluster",
  "[INFO] Triggering Turbopack HMR for 'landing-page'",
  "[SUCCESS] Postgres Edge functions synced successfully",
  "[INFO] Validating OpenAPI specs against zod schemas",
];

interface LogNode {
  text: string;
  width: number;
  x: number;
  y: number;
  speed: number;
  zDepth: number; // 0 (bg) to 1 (fg)
  isHeroLog: boolean;
}

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

    const fontSize = 11;
    const fontDesc = `${fontSize}px ui-monospace, SFMono-Regular, Consolas, monospace`;
    ctx.font = fontDesc;

    // Use PRETEXT to perfectly pre-measure widths.
    // This removes the need for DOM measurement or canvas re-measuring in the loop
    const logPoolInfo = MOCK_LOGS.map((log) => {
      const prepared = prepareWithSegments(log, fontDesc);
      const { lines } = layoutWithLines(prepared, 2000, 20);
      return { text: log, width: lines[0]?.width || ctx.measureText(log).width };
    });

    const numNodes = 120; // Massive amount of logs
    const nodes: LogNode[] = [];

    for (let i = 0; i < numNodes; i++) {
      const logInfo = logPoolInfo[Math.floor(Math.random() * logPoolInfo.length)];
      const zDepth = Math.random();
      const isHeroLog = logInfo.text.includes("[SUCCESS]") || logInfo.text.includes("Pretext");

      nodes.push({
        text: logInfo.text,
        width: logInfo.width,
        x: Math.random() * width,
        y: Math.random() * height * 2 - height, // spread out
        speed: 0.15 + zDepth * 1.2,
        zDepth,
        isHeroLog,
      });
    }

    let scrollY = window.scrollY;
    let lastScrollY = scrollY;

    const handleScroll = () => {
      scrollY = window.scrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    let animId: number;
    let prevTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min((time - prevTime) / 16.66, 2);
      prevTime = time;

      const scrollDelta = scrollY - lastScrollY;
      lastScrollY += scrollDelta * 0.1;

      ctx.clearRect(0, 0, width, height);

      ctx.font = fontDesc;
      ctx.textBaseline = "top";

      // Dynamically read theme once per frame to perfectly support next-themes toggling
      const isDark = document.documentElement.classList.contains("dark");

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];

        let yDelta = n.speed * dt;
        yDelta += scrollDelta * (0.1 + n.zDepth * 0.4);

        n.y += yDelta;

        if (n.y > height + 50) {
          n.y = -50;
          n.x = Math.random() * width;
        } else if (n.y < -100) {
          n.y = height + 50;
          n.x = Math.random() * width;
        }

        n.x -= 0.1 * n.zDepth * dt;
        if (n.x < -n.width) {
          n.x = width;
        }

        // Vercel/Cursor aesthetics depending on current live theme
        const baseAlpha = 0.05 + n.zDepth * 0.3;
        let colorStr = "";
        let glowColor = "transparent";
        const wantsGlow = n.zDepth > 0.85 && n.isHeroLog;

        if (isDark) {
          if (n.isHeroLog) {
            colorStr =
              n.zDepth > 0.8 ? "rgba(255,255,255,0.95)" : `rgba(255,255,255,${baseAlpha * 1.8})`;
            glowColor = "rgba(255,255,255,0.8)";
          } else {
            colorStr = `rgba(255,255,255,${baseAlpha})`;
          }
        } else {
          if (n.isHeroLog) {
            // In light mode, use ultra crisp nearly-black text for readability
            colorStr = n.zDepth > 0.8 ? "rgba(9,9,11,0.95)" : `rgba(9,9,11,${baseAlpha * 2.2})`;
            glowColor = "rgba(9,9,11,0.3)";
          } else {
            colorStr = `rgba(9,9,11,${baseAlpha * 1.5})`;
          }
        }

        if (wantsGlow) {
          ctx.shadowBlur = isDark ? 8 : 4; // Thinner shadow glow in light mode
          ctx.shadowColor = glowColor;
        } else {
          ctx.shadowBlur = 0;
          ctx.shadowColor = "transparent";
        }

        ctx.fillStyle = colorStr;
        ctx.fillText(n.text, n.x, n.y);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="absolute inset-0 z-0 overflow-hidden opacity-50 dark:opacity-40 pointer-events-none"
      style={{
        maskImage: "linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
      }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: "blur(0.5px)" }} // Tiny blur adds cinematic tech depth
      />
    </div>
  );
}
