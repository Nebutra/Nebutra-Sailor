"use client";

import { motion } from "framer-motion";
import { BarChart3, Globe, Languages, Search, Sparkles, Zap } from "lucide-react";

const METRICS = [
  { label: "Performance", score: 99, color: "var(--status-success)" },
  { label: "SEO", score: 100, color: "var(--brand-primary)" },
  { label: "Accessibility", score: 98, color: "var(--brand-accent)" },
  { label: "Best Practices", score: 100, color: "var(--brand-tertiary)" },
];

const GEO_SIGNALS = [
  { engine: "ChatGPT Search", status: "Indexed", icon: Sparkles },
  { engine: "Perplexity AI", status: "Cited", icon: Search },
  { engine: "Google SGE", status: "Featured", icon: Globe },
  { engine: "Bing Copilot", status: "Ranked #1", icon: Zap },
];

const SCHEMA_TYPES = [
  "Organization",
  "Product",
  "FAQ",
  "HowTo",
  "SoftwareApplication",
  "BreadcrumbList",
];

const LANGUAGES = ["en", "zh", "ja", "ko", "es", "fr", "de"];

function CircleScore({
  score,
  color,
  label,
  delay,
}: {
  score: number;
  color: string;
  label: string;
  delay: number;
}) {
  const circumference = 2 * Math.PI * 18;
  const offset = circumference - (score / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay }}
      className="flex flex-col items-center gap-1"
    >
      <div className="relative w-12 h-12">
        <svg
          viewBox="0 0 40 40"
          className="w-full h-full -rotate-90"
          aria-hidden="true"
          focusable="false"
        >
          <circle
            cx="20"
            cy="20"
            r="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-border/30"
          />
          <motion.circle
            cx="20"
            cy="20"
            r="18"
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, delay: delay + 0.3, ease: "easeOut" }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-foreground">
          {score}
        </span>
      </div>
      <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
    </motion.div>
  );
}

export function SEOGEOMockup() {
  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-2xl bg-background border border-border rounded-xl overflow-hidden shadow-sm flex flex-col"
      >
        {/* Top bar */}
        <div className="px-3 py-2 border-b border-border flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-red-400/80" />
            <div className="h-2 w-2 rounded-full bg-yellow-400/80" />
            <div className="h-2 w-2 rounded-full bg-green-400/80" />
          </div>
          <div className="ml-2 flex-1 flex items-center gap-1.5 rounded bg-muted px-2.5 py-1">
            <Search className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground font-mono">
              lighthouse://nebutra.com
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-semibold">
            <BarChart3 className="h-3 w-3" />
            Report
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {/* Left: Lighthouse Scores + Schema */}
          <div className="flex-1 p-4 space-y-4">
            {/* Lighthouse Circles */}
            <div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
                Core Web Vitals
              </div>
              <div className="flex items-center justify-between px-2">
                {METRICS.map((m, i) => (
                  <CircleScore
                    key={m.label}
                    score={m.score}
                    color={m.color}
                    label={m.label}
                    delay={i * 0.1}
                  />
                ))}
              </div>
            </div>

            {/* Schema.org Types */}
            <div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Structured Data
              </div>
              <div className="flex flex-wrap gap-1">
                {SCHEMA_TYPES.map((type) => (
                  <motion.span
                    key={type}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.8 }}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary"
                  >
                    <span className="h-1 w-1 rounded-full bg-primary" />
                    {type}
                  </motion.span>
                ))}
              </div>
            </div>

            {/* i18n hreflang */}
            <div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                <Languages className="inline h-3 w-3 mr-1" />
                hreflang Auto-Routing
              </div>
              <div className="flex items-center gap-1">
                {LANGUAGES.map((lang, i) => (
                  <motion.div
                    key={lang}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: 1 + i * 0.05 }}
                    className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono font-bold text-foreground"
                  >
                    {lang}
                  </motion.div>
                ))}
                <span className="text-[10px] text-muted-foreground ml-1">→ auto</span>
              </div>
            </div>
          </div>

          {/* Right: GEO Panel */}
          <div className="w-44 border-l border-border p-3 space-y-3 bg-muted/20">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <Sparkles className="inline h-3 w-3 mr-1" />
              GEO Signals
            </div>
            <div className="space-y-2">
              {GEO_SIGNALS.map((signal, i) => {
                const Icon = signal.icon;
                return (
                  <motion.div
                    key={signal.engine}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.6 + i * 0.12 }}
                    className="flex items-center gap-2 rounded-lg bg-background border border-border/60 px-2 py-1.5"
                  >
                    <Icon className="h-3 w-3 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-semibold text-foreground truncate">
                        {signal.engine}
                      </div>
                      <div className="text-[9px] text-muted-foreground">{signal.status}</div>
                    </div>
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                  </motion.div>
                );
              })}
            </div>

            {/* Mini stats */}
            <div className="rounded-lg bg-background border border-border/60 p-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-muted-foreground">Organic CTR</span>
                <span className="text-[10px] font-bold text-foreground">4.2%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-muted-foreground">AI Citations</span>
                <span className="text-[10px] font-bold text-foreground">89/mo</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-muted-foreground">i18n Pages</span>
                <span className="text-[10px] font-bold text-foreground">7 langs</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
