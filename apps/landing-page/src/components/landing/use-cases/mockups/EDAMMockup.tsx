"use client";

import {
  File,
  GridSquare as Grid,
  Image as ImageIcon,
  ListUnordered as List,
  Plus,
} from "@nebutra/icons";
import { motion } from "framer-motion";

const filters = ["All", "Images", "Documents", "Video"];
const assets = [
  { name: "hero-banner.png", size: "2.4 MB", date: "Mar 12", color: "bg-blue-100" },
  { name: "brand-guide.pdf", size: "1.1 MB", date: "Mar 10", color: "bg-amber-100" },
  { name: "promo-reel.mp4", size: "48 MB", date: "Mar 8", color: "bg-purple-100" },
  { name: "icon-set.svg", size: "320 KB", date: "Mar 5", color: "bg-emerald-100" },
  { name: "og-image.png", size: "890 KB", date: "Feb 28", color: "bg-rose-100" },
  { name: "whitepaper.pdf", size: "3.2 MB", date: "Feb 20", color: "bg-sky-100" },
];

export function EDAMMockup() {
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
          <div className="text-[11px] text-muted-foreground">
            Assets <span className="mx-1">›</span> Marketing <span className="mx-1">›</span>
            <span className="text-foreground font-medium">Q1 Campaign</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Grid className="h-3.5 w-3.5 text-foreground" />
            <List className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Sort: Date</span>
          </div>
        </div>
        {/* Filter row */}
        <div className="px-4 py-2 border-b border-border flex items-center gap-2 shrink-0">
          <div className="flex gap-1.5">
            {filters.map((f, i) => (
              <span
                key={f}
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >
                {f}
              </span>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-medium px-2.5 py-1 rounded-lg">
            <Plus className="h-3 w-3" /> Upload
          </div>
        </div>
        {/* Asset grid */}
        <div className="flex-1 p-3 overflow-hidden">
          <div className="grid grid-cols-3 gap-2 h-full">
            {assets.map((a) => (
              <div
                key={a.name}
                className="rounded-lg border border-border bg-background p-2 flex flex-col gap-1.5"
              >
                <div
                  className={`flex-1 min-h-0 rounded ${a.color} flex items-center justify-center`}
                >
                  {a.name.endsWith(".pdf") ? (
                    <File className="h-5 w-5 text-muted-foreground/40" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
                  )}
                </div>
                <div>
                  <div className="text-[10px] font-medium text-foreground truncate">{a.name}</div>
                  <div className="text-[9px] text-muted-foreground font-mono">
                    {a.size} · {a.date}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Bottom status */}
        <div className="px-4 py-1.5 border-t border-border text-[10px] text-muted-foreground shrink-0">
          6 of 1,247 assets
        </div>
      </motion.div>
    </div>
  );
}
