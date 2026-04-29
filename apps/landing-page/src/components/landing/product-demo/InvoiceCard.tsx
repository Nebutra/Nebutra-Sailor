"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

export function InvoiceCard() {
  const [status, setStatus] = useState<"pending" | "paid">("pending");

  useEffect(() => {
    const timer = setTimeout(() => {
      setStatus("paid");
    }, 4500); // synchronizes with the text log typing animation
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, rotateX: 10 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ delay: 2.2, duration: 0.8, type: "spring", bounce: 0.4 }}
      className="relative w-full max-w-sm mx-auto rounded-2xl bg-white/90 dark:bg-[#111]/90 border border-border/50 shadow-2xl backdrop-blur-xl p-5"
    >
      {/* Top Section */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h4 className="font-sans text-sm font-bold text-foreground">Invoice INV-12X</h4>
          <p className="font-mono text-[10px] text-muted-foreground mt-1">Acme Corporation</p>
        </div>
        <div className="text-right">
          <p className="font-sans text-2xl font-black tracking-tighter text-foreground">
            $4,200<span className="text-muted-foreground/50">.00</span>
          </p>
          <p className="font-mono text-[10px] text-muted-foreground mt-1 tracking-widest uppercase">
            Due Dec 1, 2026
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-border/50 to-transparent my-4" />

      {/* Line Items */}
      <div className="space-y-3 mb-6">
        <div className="flex justify-between text-xs font-medium">
          <span className="text-foreground/80">Enterprise Base Plan</span>
          <span className="text-foreground">$2,000.00</span>
        </div>
        <div className="flex justify-between text-xs font-medium">
          <span className="text-foreground/80">Compute Overage (640 vCPU h)</span>
          <span className="text-foreground">$2,200.00</span>
        </div>
      </div>

      {/* Status Pill */}
      <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Status</span>
        <div className="relative h-7 w-[100px] overflow-hidden rounded-full border border-border/50 bg-muted/50 p-1">
          <motion.div
            layout
            className={`absolute inset-y-1 left-1 right-1 rounded-full flex items-center justify-center shadow-sm ${
              status === "paid"
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400"
            }`}
            animate={
              status === "paid"
                ? {
                    backgroundColor: "rgba(16, 185, 129, 0.1)",
                    borderColor: "rgba(16, 185, 129, 0.2)",
                  }
                : {
                    backgroundColor: "rgba(245, 158, 11, 0.1)",
                    borderColor: "rgba(245, 158, 11, 0.2)",
                  }
            }
          >
            <motion.span
              key={status}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5"
            >
              {status === "paid" && (
                <svg
                  className="w-3 h-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  focusable="false"
                >
                  <motion.polyline
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    points="20 6 9 17 4 12"
                  />
                </svg>
              )}
              {status}
            </motion.span>
          </motion.div>
        </div>
      </div>

      {/* Decorative Glow if Paid */}
      <AnimatePresence>
        {status === "paid" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute -inset-0.5 rounded-2xl border-2 border-emerald-500/30 blur-[4px] pointer-events-none -z-10"
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
