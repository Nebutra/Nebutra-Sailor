"use client";

import { Image as ImageIcon, PaperAirplane as Send, Sparkles } from "@nebutra/icons";
import { AnimateIn } from "../../AnimateIn";

const convos = [
  { title: "Cybernetic landscape", time: "2m ago" },
  { title: "Code review: auth flow", time: "1h ago" },
  { title: "Summarize Q1 report", time: "3h ago" },
  { title: "Logo concepts", time: "Yesterday" },
];
const messages = [
  {
    role: "user" as const,
    text: "Generate a cybernetic landscape with volumetric lighting and neon accents",
  },
  { role: "ai" as const, text: "Here is your generated image:", hasImage: true },
  { role: "user" as const, text: "Can you make the sky more purple and add floating particles?" },
];

export function MultimodalMockup() {
  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <AnimateIn
        preset="fadeUp"
        className="w-full max-w-2xl h-[420px] bg-background border border-border rounded-[var(--radius-xl)] overflow-hidden shadow-sm flex flex-col"
      >
        {/* Top bar */}
        <div className="px-3 py-2 border-b border-border flex items-center gap-2 shrink-0">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Multimodal AI</span>
          <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
            GPT-5.4
          </span>
          <div className="ml-auto h-5 w-5 rounded-full bg-muted" />
        </div>
        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <div className="w-40 border-r border-border p-2 shrink-0 space-y-0.5">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
              Conversations
            </div>
            {convos.map((c, i) => (
              <div
                key={c.title}
                className={`px-2 py-1.5 rounded text-[11px] ${i === 0 ? "bg-muted font-medium text-foreground" : "text-muted-foreground"}`}
              >
                <div className="truncate">{c.title}</div>
                <div className="text-[9px] font-mono text-muted-foreground">{c.time}</div>
              </div>
            ))}
          </div>
          {/* Chat */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 p-3 space-y-3 overflow-hidden">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2 ${m.role === "ai" ? "" : "justify-end"}`}>
                  {m.role === "ai" && (
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <Sparkles className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] space-y-1.5 ${m.role === "user" ? "items-end" : ""}`}
                  >
                    <div
                      className={`px-3 py-2 rounded-[var(--radius-xl)] text-xs text-foreground ${m.role === "user" ? "bg-muted/60 border border-border rounded-tr-sm" : "bg-primary/5 border border-primary/20 rounded-tl-sm"}`}
                    >
                      {m.text}
                    </div>
                    {m.hasImage && (
                      <div className="h-24 w-40 rounded-[var(--radius-lg)] bg-muted/40 border border-border flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  {m.role === "user" && <div className="h-6 w-6 rounded-full bg-muted shrink-0" />}
                </div>
              ))}
            </div>
            {/* Input */}
            <div className="px-3 py-2 border-t border-border flex items-center gap-2 shrink-0">
              <div className="flex-1 h-8 bg-muted rounded-[var(--radius-lg)] flex items-center px-3">
                <span className="text-[11px] text-muted-foreground">Message AI...</span>
              </div>
              <div className="h-8 w-8 rounded-[var(--radius-lg)] bg-primary flex items-center justify-center">
                <Send className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
            </div>
          </div>
        </div>
      </AnimateIn>
    </div>
  );
}
