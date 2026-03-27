"use client";

import { motion } from "framer-motion";
import { MessageSquare, Users, Activity } from "lucide-react";

const nodes = [
  { icon: Users, name: "Developers", members: "3.2k" },
  { icon: MessageSquare, name: "Creators", members: "1.8k" },
  { icon: Activity, name: "Researchers", members: "2.1k" },
];

export function OPCMockup() {
  return (
    <div className="w-full h-full flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm bg-background border border-border rounded-2xl overflow-hidden shadow-lg"
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">AI Community Hub</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            12.4k online
          </div>
        </div>
        <div className="p-4 grid gap-3">
          {nodes.map((node, i) => (
            <motion.div
              key={node.name}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.08 }}
              className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3"
            >
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <node.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">{node.name}</div>
                <div className="text-xs text-muted-foreground">{node.members} members</div>
              </div>
              <div className="text-xs text-muted-foreground font-mono">{node.members}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
