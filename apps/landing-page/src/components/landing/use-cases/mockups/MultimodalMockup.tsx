"use client";

import { motion } from "framer-motion";
import { Sparkles, Users, Image as ImageIcon } from "lucide-react";

export function MultimodalMockup() {
  return (
    <div className="w-full h-full flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm bg-background border border-border rounded-2xl overflow-hidden shadow-lg flex flex-col"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Multimodal AI</span>
          <span className="ml-auto text-[10px] text-muted-foreground font-mono">GPT-4o</span>
        </div>

        {/* Chat area */}
        <div className="flex-1 p-4 space-y-3">
          {/* User message */}
          <div className="flex gap-2.5">
            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Users className="h-3 w-3 text-muted-foreground" />
            </div>
            <div className="bg-muted/60 border border-border rounded-xl rounded-tl-sm px-3 py-2 text-xs text-foreground max-w-[80%]">
              Generate a cybernetic landscape with volumetric lighting
            </div>
          </div>

          {/* AI response */}
          <div className="flex gap-2.5 justify-end">
            <div className="space-y-2 max-w-[80%]">
              <div className="bg-primary/5 border border-primary/20 rounded-xl rounded-tr-sm px-3 py-2 text-xs text-foreground">
                Here is your generated image:
              </div>
              <div className="w-full h-28 rounded-lg bg-muted/40 border border-border flex items-center justify-center relative overflow-hidden">
                <motion.div
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5"
                />
                <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
              </div>
            </div>
            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center shrink-0">
              <Sparkles className="h-3 w-3 text-primary-foreground" />
            </div>
          </div>

          {/* Typing indicator */}
          <div className="flex gap-2.5">
            <div className="h-6 w-6" />
            <div className="flex gap-1 px-3 py-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50"
                />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
