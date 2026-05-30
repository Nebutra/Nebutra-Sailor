"use client";

import { DottedWorldMap } from "@nebutra/ui/primitives";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { createPublicDocsUrl } from "@/lib/docs-links";
import { AnimateIn } from "./AnimateIn";

const CDN_NODES = [
  { x: 25, y: 30, label: "US-West" },
  { x: 15, y: 38, label: "US-East" },
  { x: 42, y: 22, label: "EU-West" },
  { x: 48, y: 28, label: "EU-Central" },
  { x: 75, y: 32, label: "Asia-Pacific" },
  { x: 82, y: 40, label: "Singapore" },
  { x: 65, y: 18, label: "EU-East" },
  { x: 20, y: 60, label: "SA-East" },
  { x: 55, y: 52, label: "MEA" },
  { x: 90, y: 55, label: "AU-East" },
  { x: 100, y: 38, label: "JP-East" },
] as const;

/**
 * GlobalEdgeMap — ML-7.2
 *
 * World map with animated CDN edge nodes. Uses semantic tokens for theme compat.
 */
export function GlobalEdgeMap() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <article
      className="group relative flex h-full flex-col rounded-[var(--radius-panel)] border border-[var(--neutral-6)] bg-background/60 dark:bg-zinc-950/60 p-8 md:p-10 transition-all hover:border-primary/40 overflow-hidden"
      style={{ boxShadow: "var(--ring-hairline)" }}
    >
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Radial glow behind map */}
      <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/[0.04] dark:bg-primary/[0.08] blur-[80px] rounded-full pointer-events-none" />

      <div className="relative z-10 flex flex-col h-full">
        <AnimateIn preset="emerge" inView>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_var(--color-primary)]"></div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              GLOBAL EDGE NETWORK
            </p>
          </div>
          <p
            className="text-2xl font-semibold text-foreground mb-2"
            style={{ letterSpacing: "var(--tracking-heading)" }}
          >
            Instant worldwide.
          </p>
          <p className="text-[15px] text-muted-foreground mb-8 leading-relaxed">
            Edge middleware routing traffic across 11 global regions instantly.
          </p>
        </AnimateIn>

        {/* Map container */}
        <div className="flex-1 relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--neutral-6)] bg-background/40 dark:bg-[var(--neutral-2)]/80 min-h-[250px] shadow-inner mb-6">
          {/* Faux Terminal Header */}
          <div className="absolute top-0 inset-x-0 flex items-center px-4 h-10 border-b border-border/60 bg-muted/50 dark:bg-zinc-950/80 z-20">
            <div className="flex gap-1.5">
              <div className="w-2 h-2 rounded-full bg-border/80 dark:bg-zinc-700/80"></div>
              <div className="w-2 h-2 rounded-full bg-border/80 dark:bg-zinc-700/80"></div>
              <div className="w-2 h-2 rounded-full bg-border/80 dark:bg-zinc-700/80"></div>
            </div>
            <div className="ml-4 flex-1 text-center pr-6">
              <span className="text-[10px] font-mono font-medium text-muted-foreground/80 dark:text-zinc-500 tracking-wider">
                edge-router status --live
              </span>
            </div>
          </div>

          <div className="pt-12 pb-8 h-full">
            {/* Dotted world map base */}
            <DottedWorldMap
              dotRadius={0.25}
              dotColor="var(--color-primary)" // Allow the primitive to inherit a slightly opaque primary color
              backgroundColor="transparent"
              className="w-full h-auto opacity-20 dark:opacity-40"
            />

            {/* Animated CDN nodes */}
            <div className="absolute inset-0 pt-12 pb-8">
              {CDN_NODES.map((node, i) => (
                <div
                  key={node.label}
                  className="absolute"
                  style={{
                    left: `${(node.x / 120) * 100}%`,
                    top: `${(node.y / 60) * 100}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  {!shouldReduceMotion && (
                    <motion.div
                      className="absolute rounded-full border border-primary/20 dark:border-primary/40"
                      initial={{ width: 4, height: 4, opacity: 0.8, x: "-50%", y: "-50%" }}
                      animate={{ width: 32, height: 32, opacity: 0 }}
                      transition={{
                        duration: 3,
                        delay: i * 0.4,
                        repeat: Infinity,
                        repeatDelay: 2,
                        ease: "easeOut",
                      }}
                      style={{ left: "50%", top: "50%" }}
                    />
                  )}
                  <div
                    className="absolute w-4 h-4 rounded-full bg-primary/10 dark:bg-primary/30 blur-[2px] dark:blur-[4px] -translate-x-1/2 -translate-y-1/2"
                    style={{ left: "50%", top: "50%" }}
                  />
                  <motion.div
                    className="w-2 h-2 rounded-full bg-primary shadow-[0_0_4px_var(--color-primary)] dark:shadow-[0_0_8px_var(--color-primary)]"
                    initial={{ opacity: 0.6 }}
                    animate={shouldReduceMotion ? { opacity: 1 } : { opacity: [0.6, 1, 0.6] }}
                    transition={
                      shouldReduceMotion
                        ? { duration: 0 }
                        : {
                            duration: 2,
                            delay: i * 0.3,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Bottom stats bar */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-background/90 dark:from-[#0a0a0a]/90 via-background/50 dark:via-[#0a0a0a]/50 to-transparent pt-12 pb-3 px-4 z-20-[2px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="text-base font-semibold text-foreground dark:text-zinc-100 tabular-nums"
                  style={{ letterSpacing: "var(--tracking-tight)" }}
                >
                  11
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                  Regions
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="text-base font-semibold text-foreground dark:text-zinc-100 tabular-nums"
                  style={{ letterSpacing: "var(--tracking-tight)" }}
                >
                  ~50ms
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                  P99
                </span>
              </div>
              <div className="flex items-center gap-2 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#34d399]" />
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-widest font-bold">
                  Live
                </span>
              </div>
            </div>
          </div>
        </div>

        <Link
          href={createPublicDocsUrl("monitoring/overview")}
          className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors group/link"
        >
          See performance logs
          <span className="text-primary transition-transform group-hover/link:translate-x-1">
            →
          </span>
        </Link>
      </div>
    </article>
  );
}

GlobalEdgeMap.displayName = "GlobalEdgeMap";
