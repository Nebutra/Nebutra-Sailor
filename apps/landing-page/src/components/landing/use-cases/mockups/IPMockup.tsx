"use client";

import { motion } from "framer-motion";
import { Clock, Eye } from "lucide-react";

const navItems = ["Blog", "About", "Projects"];
const posts = [
  {
    title: "Building RAG Pipelines at Scale",
    date: "Mar 12",
    read: "8 min",
    excerpt: "A deep dive into chunking strategies and vector store optimization for production...",
  },
  {
    title: "Why We Migrated to Bun",
    date: "Feb 28",
    read: "5 min",
    excerpt: "After six months on Node 20, we switched runtimes. Here's what changed...",
  },
  {
    title: "Design Tokens Done Right",
    date: "Feb 14",
    read: "6 min",
    excerpt: "How semantic tokens and CSS custom properties replaced our Tailwind config...",
  },
];

export function IPMockup() {
  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-2xl h-[420px] bg-background border border-border rounded-xl overflow-hidden shadow-sm flex flex-col"
      >
        {/* Top bar */}
        <div className="px-4 py-2 border-b border-border flex items-center gap-4 shrink-0">
          <span className="text-xs font-bold text-foreground">alexchen.dev</span>
          <div className="flex gap-3 text-[11px] text-muted-foreground">
            {navItems.map((n) => (
              <span key={n}>{n}</span>
            ))}
          </div>
          <div className="ml-auto h-5 w-5 rounded-full bg-muted" />
        </div>
        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {/* Article list */}
          <div className="w-[45%] border-r border-border overflow-hidden">
            <div className="p-3 space-y-1">
              {posts.map((p, i) => (
                <div
                  key={p.title}
                  className={`p-2.5 rounded-lg cursor-default ${i === 0 ? "bg-muted/60 border border-border" : ""}`}
                >
                  <div className="text-[11px] font-semibold text-foreground leading-snug">
                    {p.title}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                    <span className="font-mono">{p.date}</span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {p.read}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                    {p.excerpt}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Preview */}
          <div className="flex-1 p-4 flex flex-col min-w-0">
            <div className="h-28 rounded-lg bg-muted/40 border border-border flex items-center justify-center mb-3 shrink-0">
              <Eye className="h-6 w-6 text-muted-foreground/30" />
            </div>
            <div className="text-sm font-bold text-foreground leading-snug">
              Building RAG Pipelines at Scale
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
              <span className="font-mono">Mar 12, 2026</span>
              <span>·</span>
              <span>8 min read</span>
              <span>·</span>
              <span className="flex items-center gap-0.5">
                <Eye className="h-2.5 w-2.5" /> 2.4k views
              </span>
            </div>
            <div className="mt-3 space-y-2 text-[11px] text-foreground/70 leading-relaxed">
              <p>
                Retrieval-augmented generation has become the go-to pattern for grounding LLM
                outputs in factual data. But moving from a prototype to a production pipeline
                introduces challenges around chunking, embedding selection, and index tuning.
              </p>
              <p>
                In this post, we explore the architecture behind our system that handles 50M+
                queries daily across 200k documents...
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
