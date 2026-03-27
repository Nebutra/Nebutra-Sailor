"use client";

import { motion } from "framer-motion";
import {
  Activity,
  ChevronRight,
  Image as ImageIcon,
  LayoutTemplate,
  MessageSquare,
  Sparkles,
  Terminal,
  Users,
} from "lucide-react";
import { GlobeStickers } from "@/components/ui/globe-stickers";

export function OPCMockup() {
  return (
    <div className="relative w-full h-full max-w-2xl mx-auto flex items-center justify-center px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--primary)_0%,transparent_60%)] opacity-10 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-12 w-full">
        {/* Hub Node */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mx-auto bg-background/80 backdrop-blur-xl border border-primary/30 p-6 rounded-3xl shadow-[0_0_40px_rgba(var(--primary-rgb),0.2)] flex items-center gap-4 min-w-[280px] sm:min-w-[320px]"
        >
          <div className="h-14 w-14 bg-primary/20 rounded-2xl flex items-center justify-center shrink-0">
            <MessageSquare className="h-7 w-7 text-primary" />
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">AI Community Hub</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span> 12.4k
              Online Users
            </div>
          </div>
        </motion.div>

        {/* Nodes */}
        <div className="flex justify-between px-12 w-full relative">
          {/* SVG Connecting Lines could go here, simulating with CSS */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[70%] h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent -z-10 -mt-6 rounded-full" />

          {[1, 2, 3].map((i, idx) => (
            <motion.div
              key={i}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 + idx * 0.1 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="h-16 w-16 rounded-full border-4 border-background shadow-xl overflow-hidden bg-muted flex items-center justify-center hover:scale-110 transition-transform cursor-pointer">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="h-2 w-16 bg-muted-foreground/30 rounded-full"></div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function IPMockup() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="w-full max-w-md bg-background border border-border/50 rounded-[2rem] overflow-hidden shadow-2xl relative"
      >
        <div className="h-32 bg-gradient-to-br from-primary/20 via-purple-500/10 to-transparent relative">
          <div className="absolute -bottom-10 left-8 h-20 w-20 rounded-2xl border-4 border-background bg-muted overflow-hidden flex items-center justify-center shadow-lg">
            <Terminal className="h-10 w-10 text-muted-foreground" />
          </div>
        </div>
        <div className="pt-16 px-8 pb-8">
          <div className="h-6 w-48 bg-foreground/90 rounded-md mb-3"></div>
          <div className="h-3 w-64 bg-muted-foreground/50 rounded-md mb-8"></div>

          <div className="flex gap-3 mb-8">
            <div className="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
              142k Followers
            </div>
            <div className="px-4 py-1.5 rounded-full bg-muted text-muted-foreground text-xs font-bold">
              Tech Lead
            </div>
          </div>

          <div className="space-y-4">
            {[60, 85, 45].map((w, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-8 w-8 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="h-3 bg-primary/20 rounded-full flex-1 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${w}%` }}
                    transition={{ duration: 1, delay: 0.5 + i * 0.2 }}
                    className="h-full bg-primary rounded-full"
                  ></motion.div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function MultimodalMockup() {
  return (
    <div className="w-full h-full max-w-xl mx-auto flex flex-col justify-end p-8 pb-16 gap-6">
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="flex gap-4"
      >
        <div className="h-10 w-10 rounded-full bg-muted shrink-0 flex items-center justify-center">
          <Users className="h-5 w-5 text-muted-foreground text-opacity-50" />
        </div>
        <div className="bg-muted/50 border border-border/50 p-4 rounded-2xl rounded-tl-sm text-sm lg:text-base text-muted-foreground leading-relaxed max-w-[80%]">
          Generate a high-res cybernetic landscape with deep volumetric lighting and neon accents.
        </div>
      </motion.div>

      <motion.div
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex gap-4 justify-end items-end mt-4"
      >
        <div className="bg-primary/5 border border-primary/20 p-2 rounded-2xl rounded-tr-sm w-72 h-48 sm:w-80 sm:h-56 relative overflow-hidden group shadow-2xl shadow-primary/10">
          {/* Generating Scanner Effect */}
          <motion.div
            animate={{ y: ["0%", "100%", "0%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-1 bg-primary/80 shadow-[0_0_15px_rgba(var(--primary-rgb),1)] z-10"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/40 via-blue-500/40 to-emerald-500/40 opacity-50 mix-blend-overlay" />
          <ImageIcon className="absolute inset-0 m-auto h-12 w-12 text-primary/30" />
        </div>
        <div className="h-10 w-10 rounded-full bg-primary shrink-0 flex items-center justify-center shadow-lg shadow-primary/30">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
      </motion.div>
    </div>
  );
}

export function EnterpriseMockup() {
  return (
    <div className="w-full h-full max-w-2xl mx-auto aspect-[4/3] bg-background border border-border/50 shadow-2xl rounded-3xl overflow-hidden flex flex-col">
      <div className="h-14 border-b border-border/50 bg-muted/10 px-6 flex items-center gap-6">
        <div className="flex gap-2">
          <div className="h-3 w-3 rounded-full bg-red-400"></div>
          <div className="h-3 w-3 rounded-full bg-amber-400"></div>
          <div className="h-3 w-3 rounded-full bg-emerald-400"></div>
        </div>
        <div className="h-6 w-64 bg-muted rounded-md mx-auto" />
      </div>
      <div className="flex flex-1">
        <div className="w-20 border-r border-border/50 bg-muted/10 p-4 flex flex-col gap-6 items-center">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-10 h-10 rounded-xl bg-muted border border-border/50 transition-colors hover:bg-primary/10 hover:border-primary/30"
            />
          ))}
        </div>
        <div className="flex-1 p-8 space-y-8">
          <div className="flex gap-6">
            <div className="flex-1 h-28 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 shadow-sm" />
            <div className="flex-1 h-28 rounded-2xl bg-muted/30 border border-border/50" />
            <div className="flex-1 h-28 rounded-2xl bg-muted/30 border border-border/50" />
          </div>
          <div className="h-48 rounded-2xl bg-muted/20 border border-border/50 flex items-end p-6 gap-3">
            {[40, 70, 45, 90, 65, 80, 50, 100, 30].map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: 0.1 * i, duration: 0.5 }}
                className="flex-1 bg-primary/40 hover:bg-primary/60 transition-colors rounded-t-md relative group"
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {h}%
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ExportMockup() {
  return (
    <div className="w-full h-full max-w-md lg:max-w-lg mx-auto flex items-center justify-center p-4">
      <GlobeStickers speed={0.005} className="w-full" />
    </div>
  );
}

export function DesignMockup() {
  return (
    <div className="w-full h-full flex items-center justify-center py-12">
      <div className="relative w-full max-w-md aspect-square flex items-center justify-center">
        {/* Component 1: Button */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="absolute top-[10%] left-[5%] bg-primary text-primary-foreground px-8 py-4 rounded-full font-bold shadow-2xl shadow-primary/20 flex items-center gap-3 text-lg hover:scale-105 transition-transform cursor-pointer"
        >
          Primary Action <ChevronRight className="h-5 w-5" />
        </motion.div>

        {/* Component 2: Input */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="absolute top-[40%] right-[5%] bg-background border border-border shadow-2xl px-6 py-4 rounded-2xl w-64 flex items-center gap-3 hover:-translate-y-1 transition-transform"
        >
          <div className="h-5 w-5 bg-muted-foreground/30 rounded-full shrink-0" />
          <div className="h-2.5 w-32 bg-muted-foreground/20 rounded-full" />
        </motion.div>

        {/* Component 3: Toggle */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute bottom-[20%] left-[20%] bg-background border border-border shadow-2xl p-6 rounded-3xl flex items-center justify-between w-72 hover:border-primary/50 transition-colors"
        >
          <div className="h-3 w-24 bg-foreground rounded-full" />
          <div className="h-8 w-14 bg-primary rounded-full p-1.5 flex justify-end cursor-pointer">
            <div className="h-5 w-5 bg-background rounded-full shadow-md" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function EDAMMockup() {
  return (
    <div className="w-full h-full max-w-2xl mx-auto flex flex-col justify-center gap-6 px-8">
      <div className="flex items-center justify-between mb-6">
        <div className="h-6 w-48 bg-foreground/90 rounded-md" />
        <LayoutTemplate className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <motion.div
            key={i}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className="aspect-square bg-muted/30 border border-border/50 rounded-[2rem] p-6 flex flex-col justify-between group cursor-pointer hover:border-primary/50 hover:bg-primary/5 hover:shadow-xl hover:shadow-primary/5 transition-all"
          >
            <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
              {i % 2 === 0 ? (
                <ImageIcon className="h-7 w-7" />
              ) : (
                <LayoutTemplate className="h-7 w-7" />
              )}
            </div>
            <div className="space-y-2.5">
              <div className="h-3 w-24 bg-foreground/80 rounded-full" />
              <div className="h-2 w-16 bg-muted-foreground/50 rounded-full" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
