"use client";

import { Moon, Sun } from "@nebutra/icons";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by rendering a placeholder before mount
  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Toggle theme"
        className="rounded-full p-2 text-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1"
        disabled
      >
        <div className="h-4 w-4" />
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="rounded-full p-2 text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={resolvedTheme ?? "system"}
          initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.2 }}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </motion.div>
      </AnimatePresence>
    </button>
  );
}
