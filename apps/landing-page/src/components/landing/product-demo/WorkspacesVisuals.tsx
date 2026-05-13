"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

/** Animated Toggle Role Switcher */
export function RoleSwitcher() {
  const [role, setRole] = useState<"Viewer" | "Admin">("Viewer");

  useEffect(() => {
    const timer1 = setTimeout(() => setRole("Admin"), 3200); // Trigger when logs mention provision limits
    return () => clearTimeout(timer1);
  }, []);

  return (
    <div className="flex items-center gap-4 bg-background dark:bg-[var(--neutral-2)] border border-border/50 rounded-xl p-3 shadow-elevation-high">
      {/* Fake User Avatar */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-500 to-fuchsia-500 ring-2 ring-background overflow-hidden relative">
          <svg
            viewBox="0 0 24 24"
            fill="white"
            className="absolute bottom-[-4px] w-8 h-8 opacity-80 left-0"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </div>
        <div>
          <p className="text-[11px] font-bold text-foreground">alice@startup.dev</p>
          <p className="text-[9px] text-muted-foreground font-mono">ID: usr_x89a</p>
        </div>
      </div>

      <div className="h-4 w-px bg-border/40 mx-1" />

      {/* Role Switcher Pill */}
      <div className="relative flex rounded-full bg-muted/50 border border-border/50 p-0.5">
        <div className="absolute inset-0 bg-transparent flex">
          {["Viewer", "Admin"].map((r) => (
            <div key={r} className="flex-1 w-16" />
          ))}
        </div>

        {/* The active background layout */}
        <div className="absolute inset-y-0.5 left-0.5 right-0.5 flex z-0">
          {role === "Viewer" ? (
            <motion.div
              layoutId="roleIndicator"
              className="w-16 h-full bg-white dark:bg-zinc-800 rounded-full shadow-sm border border-black/5 dark:border-white/5"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          ) : (
            <>
              <div className="w-16 h-full" />
              <motion.div
                layoutId="roleIndicator"
                className="w-16 h-full bg-primary rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            </>
          )}
        </div>

        <button
          type="button"
          className={`relative z-10 w-16 px-2 py-1 text-[10px] font-bold tracking-wider uppercase transition-colors duration-300 ${role === "Viewer" ? "text-foreground" : "text-muted-foreground"}`}
        >
          Viewer
        </button>
        <button
          type="button"
          className={`relative z-10 w-16 px-2 py-1 text-[10px] font-bold tracking-wider uppercase transition-colors duration-300 ${role === "Admin" ? "text-primary-foreground" : "text-muted-foreground"}`}
        >
          Admin
        </button>
      </div>
    </div>
  );
}

/** Animated Tenant Diagram */
export function TenantDiagram() {
  return (
    <div className="w-full flex items-center justify-center p-4">
      <div className="flex gap-4 items-center">
        {/* DB Source */}
        <div className="w-16 h-16 rounded-2xl bg-muted/40 border border-border/50 flex items-center justify-center shadow-inner relative">
          <svg
            className="w-6 h-6 text-muted-foreground"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
          </svg>
          {/* Animated ripple circle */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0.8 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
            className="absolute inset-0 rounded-2xl border border-primary/40 pointer-events-none"
          />
        </div>

        {/* Connections */}
        <div className="flex flex-col gap-6 justify-center">
          {/* Line 1 */}
          <div className="flex items-center gap-2">
            <div className="w-12 h-px bg-gradient-to-r from-border/50 to-primary/50 relative overflow-hidden">
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                className="w-4 h-full bg-primary absolute top-0 left-0 blur-[2px]"
              />
            </div>
            <div className="px-3 py-1.5 rounded-lg border border-primary/20 bg-primary/10 text-primary text-[10px] font-mono tracking-wide shadow-sm">
              Schema: Acme
            </div>
          </div>

          {/* Line 2 */}
          <div className="flex items-center gap-2 -ml-4">
            <div className="w-16 h-px bg-gradient-to-r from-border/50 to-emerald-500/50 relative overflow-hidden">
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ repeat: Infinity, duration: 1.5, delay: 0.75, ease: "linear" }}
                className="w-4 h-full bg-emerald-500 absolute top-0 left-0 blur-[2px]"
              />
            </div>
            <div className="px-3 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono tracking-wide shadow-sm">
              Schema: Globex
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
