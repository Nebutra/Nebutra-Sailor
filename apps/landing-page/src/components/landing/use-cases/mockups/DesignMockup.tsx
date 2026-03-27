"use client";

import { motion } from "framer-motion";
import { Eye } from "lucide-react";

const components = ["Button", "Input", "Card", "Dialog", "Badge", "Tabs"];
const variants = [
  { name: "Primary", cls: "bg-primary text-primary-foreground" },
  { name: "Outline", cls: "bg-background text-foreground border border-border" },
  { name: "Ghost", cls: "bg-transparent text-muted-foreground" },
];
const props = [
  { prop: "variant", type: '"primary" | "outline" | "ghost"', def: '"primary"' },
  { prop: "size", type: '"sm" | "md" | "lg"', def: '"md"' },
  { prop: "disabled", type: "boolean", def: "false" },
  { prop: "loading", type: "boolean", def: "false" },
];

export function DesignMockup() {
  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-2xl h-[420px] bg-background border border-border rounded-xl overflow-hidden shadow-sm flex flex-col"
      >
        {/* Top bar */}
        <div className="px-4 py-2 border-b border-border flex items-center gap-2 shrink-0">
          <div className="h-5 w-5 rounded bg-primary" />
          <span className="text-xs font-semibold text-foreground">Design System</span>
          <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
            v2.4.0
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="h-5 w-5 rounded-full bg-muted" />
          </div>
        </div>
        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <div className="w-36 border-r border-border p-2 shrink-0 space-y-0.5">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
              Components
            </div>
            {components.map((c, i) => (
              <div
                key={c}
                className={`text-[11px] px-2 py-1 rounded ${i === 0 ? "bg-primary/10 text-foreground font-medium" : "text-muted-foreground"}`}
              >
                {c}
              </div>
            ))}
          </div>
          {/* Main */}
          <div className="flex-1 p-4 flex flex-col min-w-0 overflow-hidden">
            <div className="text-[11px] font-semibold text-foreground">Button</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Interactive element for triggering actions
            </div>
            {/* Preview */}
            <div className="mt-3 p-4 rounded-lg border border-border bg-muted/20 flex items-center justify-center gap-3">
              {variants.map((v) => (
                <div
                  key={v.name}
                  className={`text-[10px] font-medium px-3 py-1.5 rounded-lg ${v.cls}`}
                >
                  {v.name}
                </div>
              ))}
            </div>
            {/* Props table */}
            <div className="mt-3 border border-border rounded-lg overflow-hidden text-[10px]">
              <div className="grid grid-cols-3 bg-muted/40 px-3 py-1.5 font-semibold text-muted-foreground border-b border-border">
                <span>Prop</span>
                <span>Type</span>
                <span>Default</span>
              </div>
              {props.map((p) => (
                <div
                  key={p.prop}
                  className="grid grid-cols-3 px-3 py-1 border-b border-border last:border-0 text-foreground"
                >
                  <span className="font-mono text-primary">{p.prop}</span>
                  <span className="font-mono text-muted-foreground">{p.type}</span>
                  <span className="font-mono">{p.def}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
