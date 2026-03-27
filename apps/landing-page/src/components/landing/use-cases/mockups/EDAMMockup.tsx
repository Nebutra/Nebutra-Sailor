"use client";

import { motion } from "framer-motion";
import { Image as ImageIcon, LayoutTemplate } from "lucide-react";

const filters = ["All", "Images", "Docs", "Video"];

const assets = [
  { name: "hero-banner.png", size: "2.4 MB", type: "img" as const },
  { name: "brand-guide.pdf", size: "1.1 MB", type: "doc" as const },
  { name: "promo-reel.mp4", size: "48 MB", type: "img" as const },
  { name: "icon-set.svg", size: "320 KB", type: "doc" as const },
  { name: "og-image.png", size: "890 KB", type: "img" as const },
  { name: "whitepaper.pdf", size: "3.2 MB", type: "doc" as const },
];

export function EDAMMockup() {
  return (
    <div className="w-full h-full flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm bg-background border border-border rounded-2xl overflow-hidden shadow-lg"
      >
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-border space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-7 bg-muted rounded-lg flex items-center px-2.5">
              <span className="text-[10px] text-muted-foreground">Search assets...</span>
            </div>
            <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex gap-1.5">
            {filters.map((f, i) => (
              <span
                key={f}
                className={`text-[9px] font-medium px-2 py-0.5 rounded-full ${
                  i === 0
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Asset grid */}
        <div className="p-3 grid grid-cols-2 gap-2">
          {assets.map((a, i) => (
            <motion.div
              key={a.name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="rounded-xl border border-border bg-muted/20 p-3 flex flex-col gap-2"
            >
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                {a.type === "img" ? (
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div>
                <div className="text-[10px] font-medium text-foreground truncate">{a.name}</div>
                <div className="text-[9px] text-muted-foreground font-mono">{a.size}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
