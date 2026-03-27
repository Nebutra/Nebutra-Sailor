"use client";

import { motion } from "framer-motion";

const palette = [
  "bg-primary",
  "bg-primary/60",
  "bg-muted-foreground",
  "bg-muted",
  "bg-border",
];

const typeSizes = [
  { label: "H1", size: "text-lg", weight: "font-bold" },
  { label: "Body", size: "text-xs", weight: "font-normal" },
  { label: "Caption", size: "text-[10px]", weight: "font-normal" },
];

export function DesignMockup() {
  return (
    <div className="w-full h-full flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-xs bg-background border border-border rounded-2xl overflow-hidden shadow-lg"
      >
        {/* Header */}
        <div className="px-5 py-3 border-b border-border">
          <span className="text-xs font-semibold text-foreground">Design System</span>
          <span className="text-[10px] text-muted-foreground ml-2">v2.4.0</span>
        </div>

        <div className="p-5 space-y-5">
          {/* Buttons */}
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Buttons</div>
            <div className="flex gap-2">
              <div className="bg-primary text-primary-foreground text-[10px] font-medium px-3 py-1.5 rounded-lg">Primary</div>
              <div className="bg-muted text-foreground text-[10px] font-medium px-3 py-1.5 rounded-lg border border-border">Secondary</div>
              <div className="bg-muted/50 text-muted-foreground/50 text-[10px] font-medium px-3 py-1.5 rounded-lg border border-border/50">Disabled</div>
            </div>
          </div>

          {/* Color palette */}
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Palette</div>
            <div className="flex gap-1.5">
              {palette.map((c, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 + i * 0.06 }}
                  className={`h-7 w-7 rounded-lg ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Typography */}
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Typography</div>
            <div className="space-y-1.5">
              {typeSizes.map((t) => (
                <div key={t.label} className="flex items-baseline gap-3">
                  <span className="text-[9px] text-muted-foreground font-mono w-8">{t.label}</span>
                  <span className={`${t.size} ${t.weight} text-foreground`}>The quick brown fox</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
