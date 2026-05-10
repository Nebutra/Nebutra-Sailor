"use client";

import { motion } from "framer-motion";
import { Laptop, Moon, Sun } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "dim";

interface ThemeSwitcherProps {
  defaultValue?: Theme;
  value?: Theme;
  onValueChange?: (theme: Theme) => void;
}

const themeOptions: { value: Theme; icon: React.ReactNode; label: string }[] = [
  {
    value: "light",
    label: "Light",
    icon: <Sun className="w-5 h-5" />,
  },
  {
    value: "dark",
    label: "Dark",
    icon: <Moon className="w-5 h-5" />,
  },
  {
    value: "dim",
    label: "System",
    icon: <Laptop className="w-5 h-5" />,
  },
];

export function AppleLiquidGlassSwitcher({
  defaultValue = "light",
  value,
  onValueChange,
}: ThemeSwitcherProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);

  const activeValue = value ?? internalValue;

  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  const handleChange = (newValue: Theme) => {
    if (onValueChange) {
      onValueChange(newValue);
    } else {
      setInternalValue(newValue);
    }
  };

  return (
    <fieldset className="relative inline-flex items-center p-1.5 rounded-full bg-black/40 dark:bg-black/60 border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] backdrop-blur-[20px] overflow-hidden">
      <legend className="sr-only">Choose theme</legend>

      {/* SVG noise filter overlay to emulate the frosted liquid glass texture */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.15] mix-blend-overlay">
        <svg aria-hidden="true" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <filter id="noise">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.8"
              numOctaves="4"
              stitchTiles="stitch"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)" />
        </svg>
      </div>

      <div className="relative z-10 flex w-full">
        {themeOptions.map((option) => {
          const isActive = activeValue === option.value;
          return (
            <label
              key={option.value}
              htmlFor={`theme-switch-${option.value}`}
              className={`relative cursor-pointer p-3 rounded-full transition-colors duration-300 ease-in-out ${
                isActive ? "text-white" : "text-white/50 hover:text-white/80"
              }`}
              title={option.label}
            >
              <span className="sr-only">{option.label}</span>
              <input
                id={`theme-switch-${option.value}`}
                className="sr-only"
                type="radio"
                name="theme"
                value={option.value}
                checked={isActive}
                onChange={() => handleChange(option.value)}
              />

              {isActive && (
                <motion.div
                  layoutId="apple-glass-switcher-active"
                  className="absolute inset-0 rounded-full bg-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_2px_10px_rgba(0,0,0,0.2)] backdrop-blur-md"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 30,
                  }}
                />
              )}

              <span className="relative z-10 flex items-center justify-center">{option.icon}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
