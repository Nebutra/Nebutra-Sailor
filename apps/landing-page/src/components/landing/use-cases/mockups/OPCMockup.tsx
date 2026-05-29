"use client";

import { Message as MessageSquare, MagnifyingGlass as Search, Users } from "@nebutra/icons";
import { motion } from "framer-motion";

const channels = ["# General", "# AI-Models", "# Showcase", "# Help"];
const messages = [
  {
    user: "SK",
    name: "Sarah K.",
    time: "2:14 PM",
    text: "Just deployed the new RAG pipeline — latency dropped 40%",
  },
  {
    user: "MR",
    name: "Marco R.",
    time: "2:16 PM",
    text: "Nice! What embedding model are you using?",
  },
  {
    user: "SK",
    name: "Sarah K.",
    time: "2:17 PM",
    text: "Cohere v3 with HNSW index. Happy to share the config.",
  },
  {
    user: "JL",
    name: "Jun L.",
    time: "2:19 PM",
    text: "Would love to see that. We're still on ada-002.",
  },
];
const members = ["Anna W.", "Carlos D.", "Priya S.", "Tom H.", "Yuki M."];

export function OPCMockup() {
  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-2xl h-[420px] bg-background border border-border rounded-[var(--radius-xl)] overflow-hidden shadow-sm flex flex-col"
      >
        {/* Top bar */}
        <div className="px-3 py-2 border-b border-border flex items-center gap-2 shrink-0">
          <div className="h-5 w-5 rounded bg-primary" />
          <span className="text-xs font-semibold text-foreground">AI Community Hub</span>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-1 rounded bg-muted px-2 py-1">
              <Search className="h-3 w-3 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">Search</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Users className="h-3 w-3" /> 12.4k
            </div>
            <div className="h-5 w-5 rounded-full bg-muted" />
          </div>
        </div>
        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {/* Left sidebar */}
          <div className="w-36 border-r border-border p-2 shrink-0 space-y-0.5">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
              Channels
            </div>
            {channels.map((c, i) => (
              <div
                key={c}
                className={`text-[11px] px-2 py-1 rounded ${i === 0 ? "bg-primary/10 text-foreground font-medium" : "text-muted-foreground"}`}
              >
                {c}
              </div>
            ))}
          </div>
          {/* Main chat */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-3 py-1.5 border-b border-border text-[11px] text-muted-foreground flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> General
            </div>
            <div className="flex-1 p-3 space-y-3 overflow-hidden">
              {messages.map((m) => (
                <div key={m.time} className="flex gap-2">
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0 text-[9px] font-bold text-muted-foreground">
                    {m.user}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[11px] font-semibold text-foreground">{m.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{m.time}</span>
                    </div>
                    <div className="text-xs text-foreground/80 mt-0.5">{m.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Right sidebar */}
          <div className="w-32 border-l border-border p-2 shrink-0">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 py-1">
              Online — 5
            </div>
            <div className="space-y-1.5 mt-1">
              {members.map((m) => (
                <div key={m} className="flex items-center gap-1.5 px-1">
                  <div className="relative">
                    <div className="h-4 w-4 rounded-full bg-muted" />
                    <div className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500 border border-background" />
                  </div>
                  <span className="text-[11px] text-foreground truncate">{m}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
