"use client";

import { motion } from "framer-motion";
import { Terminal } from "lucide-react";

const stats = [
  { label: "Followers", value: "142k" },
  { label: "Posts", value: "328" },
  { label: "Engagement", value: "8.4%" },
];

const skills = [
  { label: "System Design", pct: 85 },
  { label: "TypeScript", pct: 92 },
  { label: "Cloud Infra", pct: 68 },
];

export function IPMockup() {
  return (
    <div className="w-full h-full flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-xs bg-background border border-border rounded-2xl overflow-hidden shadow-lg"
      >
        <div className="h-20 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent relative">
          <div className="absolute -bottom-6 left-5 h-12 w-12 rounded-xl border-2 border-background bg-muted flex items-center justify-center shadow-md">
            <Terminal className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
        <div className="pt-10 px-5 pb-5">
          <div className="text-sm font-semibold text-foreground">Alex Chen</div>
          <div className="text-xs text-muted-foreground mt-0.5">Senior Tech Lead</div>
          <div className="flex gap-4 mt-4 pb-4 border-b border-border">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-sm font-bold text-foreground">{s.value}</div>
                <div className="text-[10px] text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-3">
            {skills.map((s, i) => (
              <div key={s.label} className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="text-foreground font-mono">{s.pct}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${s.pct}%` }}
                    transition={{ duration: 0.8, delay: 0.3 + i * 0.15 }}
                    className="h-full bg-primary rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
