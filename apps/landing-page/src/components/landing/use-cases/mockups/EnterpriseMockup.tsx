"use client";

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";

const navLinks = ["Products", "Solutions", "Pricing", "Docs"];

export function EnterpriseMockup() {
  return (
    <div className="w-full h-full flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-background border border-border rounded-2xl overflow-hidden shadow-lg"
      >
        {/* Nav bar */}
        <div className="px-4 py-2.5 border-b border-border flex items-center gap-4">
          <div className="h-5 w-5 rounded bg-primary" />
          <div className="flex gap-3 text-[10px] text-muted-foreground">
            {navLinks.map((l) => (
              <span key={l}>{l}</span>
            ))}
          </div>
          <div className="ml-auto h-5 px-2.5 rounded bg-primary flex items-center">
            <span className="text-[9px] text-primary-foreground font-medium">Sign Up</span>
          </div>
        </div>

        {/* Hero */}
        <div className="px-6 pt-6 pb-4 text-center border-b border-border">
          <div className="text-sm font-bold text-foreground leading-tight">
            Build the future of
            <br />
            enterprise software
          </div>
          <div className="text-[10px] text-muted-foreground mt-2 max-w-[200px] mx-auto">
            Scalable infrastructure for modern teams
          </div>
          <div className="mt-3 inline-flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-medium px-3 py-1.5 rounded-lg">
            Get Started <ChevronRight className="h-3 w-3" />
          </div>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-3 gap-px bg-border">
          {["Security", "Analytics", "Scale"].map((f, i) => (
            <motion.div
              key={f}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="bg-background px-3 py-4 text-center"
            >
              <div className="h-6 w-6 rounded-md bg-muted mx-auto mb-2" />
              <div className="text-[10px] font-medium text-foreground">{f}</div>
              <div className="text-[8px] text-muted-foreground mt-0.5">Enterprise-grade</div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
