"use client";

import { brandMotion } from "@nebutra/brand";
import {
  CheckCircle as CheckCircle2,
  Database,
  NetworkDevice as Network,
  Servers as Server,
  Shield,
  User,
} from "@nebutra/icons";
import { AnimatedBeam, AnimatedList, FlickeringGrid, MagicCard } from "@nebutra/ui/primitives";
import { useEffect, useRef, useState } from "react";
import { motion, type Transition, useReducedMotion } from "@/shared/motion";

const emergeLoopTransition: Transition = {
  duration: brandMotion.emerge.transition.duration,
  ease: [...brandMotion.brandEasing.brand] as [number, number, number, number],
  repeat: Infinity,
  repeatType: "reverse",
  repeatDelay: 2,
};

export function MotionDemos() {
  const [isClient, setIsClient] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  // Refs for AnimatedBeam (Flow Demo)
  const containerRef = useRef<HTMLDivElement>(null);
  const fromRef = useRef<HTMLDivElement>(null);
  const toRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  return (
    <div className="my-12 flex flex-col gap-6 w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* ------------------------------------------------------------
                    1. EMERGE (涌现)
                    Metaphor: Data materializing from the cloud / Database entry
                ------------------------------------------------------------ */}
        <MagicCard
          className="h-full p-0 rounded-3xl border-border flex flex-col overflow-hidden bg-background shadow-sm"
          gradientColor="hsl(var(--muted))"
        >
          <div className="h-64 w-full bg-muted relative flex items-center justify-center border-b border-border overflow-hidden p-6">
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-[size:32px_32px] opacity-[0.03] dark:opacity-[0.05]" />

            <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden [mask-image:linear-gradient(to_bottom,white_30%,transparent_100%)]">
              <motion.div
                className="w-12 h-12 rounded-2xl bg-background shadow-md border border-border flex items-center justify-center z-10 shrink-0 mt-4 mb-2"
                initial={shouldReduceMotion ? false : "initial"}
                whileInView="animate"
                viewport={{ once: false, amount: 0.5 }}
                variants={{
                  initial: { ...brandMotion.emerge.initial, y: -10 },
                  animate: {
                    ...brandMotion.emerge.animate,
                    y: 0,
                    transition: shouldReduceMotion ? { duration: 0 } : emergeLoopTransition,
                  },
                }}
              >
                <Database className="w-5 h-5 text-primary dark:text-[var(--brand-accent)]" />
              </motion.div>

              <AnimatedList delay={800} className="w-full relative z-10">
                <div className="flex flex-row items-center gap-3 p-3 bg-card rounded-xl shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_2px_4px_rgba(0,0,0,0.02)] border border-border w-full max-w-[220px] mx-auto backdrop-blur-sm">
                  <div className="h-8 w-8 rounded-full bg-chart-1/10 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-chart-1" />
                  </div>
                  <div className="flex flex-col gap-1.5 w-full flex-1">
                    <div className="h-2 w-16 bg-neutral-4 rounded-full" />
                    <div className="h-1.5 w-12 bg-neutral-3 rounded-full" />
                  </div>
                </div>
                <div className="flex flex-row items-center gap-3 p-3 bg-card rounded-xl shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_2px_4px_rgba(0,0,0,0.02)] border border-border w-full max-w-[220px] mx-auto backdrop-blur-sm">
                  <div className="h-8 w-8 rounded-full bg-chart-2/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-chart-2" />
                  </div>
                  <div className="flex flex-col gap-1.5 w-full flex-1">
                    <div className="h-2 w-20 bg-neutral-4 rounded-full" />
                    <div className="h-1.5 w-16 bg-neutral-3 rounded-full" />
                  </div>
                </div>
              </AnimatedList>
            </div>
          </div>

          <div className="p-6 flex flex-col gap-3 flex-1 min-h-[180px] bg-card">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-foreground/10 bg-foreground/5 text-[10px] font-bold font-mono">
                1
              </span>
              <h3 className="text-xl font-semibold text-foreground tracking-tight">
                Emerge <span className="text-muted-foreground font-normal">涌现</span>
              </h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed flex-1">
              Data materializing from the cloud. Used for structural UI mounts, modals, and content
              entering the viewport from a zero-state.
            </p>
            <div className="flex items-center gap-2 mt-auto">
              <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1.5 rounded-md border border-border">
                duration: 0.6s
              </code>
              <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1.5 rounded-md border border-border">
                [0.16, 1, 0.3, 1]
              </code>
            </div>
          </div>
        </MagicCard>

        {/* ------------------------------------------------------------
                    2. FLOW (流动)
                    Metaphor: Data streaming through pipelines / Network transfer
                ------------------------------------------------------------ */}
        <MagicCard
          className="h-full p-0 rounded-3xl border-border flex flex-col overflow-hidden bg-background shadow-sm"
          gradientColor="hsl(var(--muted))"
        >
          <div className="h-64 w-full bg-muted relative flex items-center justify-center p-8 border-b border-border overflow-hidden">
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-[size:32px_32px] opacity-[0.03] dark:opacity-[0.05]" />

            {/* Horizontal Pipeline Metaphor utilizing AnimatedBeam */}
            <div
              ref={containerRef}
              className="relative w-full max-w-[240px] flex items-center justify-between z-10 h-full"
            >
              <div
                ref={fromRef}
                className="w-12 h-12 rounded-2xl border border-border bg-background flex items-center justify-center relative z-20 shadow-sm mt-8"
              >
                <Server className="w-5 h-5 text-muted-foreground" />
              </div>

              <div
                ref={toRef}
                className="w-12 h-12 rounded-2xl border border-border bg-background flex items-center justify-center relative z-20 shadow-sm mb-8"
              >
                <Shield className="w-5 h-5 text-foreground" />
              </div>

              <AnimatedBeam
                containerRef={containerRef}
                fromRef={fromRef}
                toRef={toRef}
                curvature={25}
                pathWidth={2}
                pathOpacity={0.15}
                gradientStartColor="hsl(var(--primary))"
                gradientStopColor="var(--brand-accent)"
                duration={2}
              />
            </div>
          </div>

          <div className="p-6 flex flex-col gap-3 flex-1 min-h-[180px] bg-card">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-foreground/10 bg-foreground/5 text-[10px] font-bold font-mono">
                2
              </span>
              <h3 className="text-xl font-semibold text-foreground tracking-tight">
                Flow <span className="text-muted-foreground font-normal">流动</span>
              </h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed flex-1">
              Data streaming horizontally through pipes. Applied to panel slides, navigation, drawer
              transitions and sequential data loads.
            </p>
            <div className="flex items-center gap-2 mt-auto">
              <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1.5 rounded-md border border-border">
                duration: 0.4s
              </code>
              <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1.5 rounded-md border border-border">
                [0, 0, 0.2, 1]
              </code>
            </div>
          </div>
        </MagicCard>

        {/* ------------------------------------------------------------
                    3. PULSE (脉动)
                    Metaphor: System alive, heartbeat, active processing
                ------------------------------------------------------------ */}
        <MagicCard
          // Pulse is the one always-dark card in the trio: `dark` scopes the dark token values.
          className="dark h-full p-0 rounded-3xl border-border flex flex-col overflow-hidden bg-card shadow-sm lg:col-span-2 xl:col-span-1"
          gradientColor="#1a1a1a"
          gradientFrom="var(--brand-accent)"
          gradientTo="hsl(var(--primary))"
        >
          <div className="h-64 w-full bg-background relative flex flex-col items-center justify-center p-8 border-b border-border overflow-hidden">
            {/* High-tech Flickering Grid Background */}
            <div className="absolute inset-0 z-0">
              <FlickeringGrid
                color="var(--brand-accent)"
                maxOpacity={0.15}
                flickerChance={0.1}
                squareSize={3}
                gridGap={5}
                className="[mask-image:radial-gradient(circle_at_center,white_0%,transparent_70%)]"
              />
            </div>

            {/* Central Active Node */}
            <div className="relative z-10 flex items-center justify-center">
              {/* Inner Glow Map Wrapper */}
              <motion.div
                className="absolute inset-0 rounded-full bg-[var(--brand-accent)] blur-2xl opacity-20"
                animate={
                  shouldReduceMotion
                    ? { opacity: 0.2, scale: 1 }
                    : {
                        scale: [0.8, 1.2, 0.8],
                        opacity: [0.2, 0.4, 0.2],
                      }
                }
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : {
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }
                }
              />

              {/* Core Element */}
              <motion.div
                className="w-16 h-16 rounded-2xl bg-muted/80 backdrop-blur-sm border border-border/50 shadow-[0_0_15px_rgba(11,241,195,0.15)] flex items-center justify-center relative z-20"
                animate={shouldReduceMotion ? { scale: 1 } : { scale: [1, 1.02, 1] }}
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : {
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }
                }
              >
                <Network className="w-6 h-6 text-[var(--brand-accent)]" />
              </motion.div>
            </div>

            {/* Status Label */}
            <div className="absolute bottom-6 flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-background/50 backdrop-blur-md z-10 shadow-lg">
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-[var(--brand-accent)]"
                animate={shouldReduceMotion ? { opacity: 1 } : { opacity: [1, 0.3, 1] }}
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                }
              />
              <span className="text-[11px] font-mono text-neutral-11 uppercase tracking-wider">
                System Live
              </span>
            </div>
          </div>

          <div className="p-6 flex flex-col gap-3 flex-1 min-h-[180px] bg-card">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-bold font-mono text-neutral-11">
                3
              </span>
              <h3 className="text-xl font-semibold text-foreground tracking-tight">
                Pulse <span className="text-muted-foreground font-normal">脉动</span>
              </h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed flex-1">
              System breathing and alive. The only infinite animation in the system, reserved for
              ambient background nodes, server statuses, and live locators.
            </p>
            <div className="flex items-center gap-2 mt-auto">
              <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1.5 rounded-md border border-border">
                duration: 3s
              </code>
              <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1.5 rounded-md border border-border">
                Infinity
              </code>
            </div>
          </div>
        </MagicCard>
      </div>
    </div>
  );
}
