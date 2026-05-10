"use client";

import React, { useEffect, useState } from "react";
import { cn } from "../utils";

export interface SliderProps {
  onValueChange?: (value: number) => void;
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  (
    { className, min = 0, max = 100, step = 1, value, defaultValue, onValueChange, ...props },
    ref,
  ) => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [internalValue, setInternalValue] = useState<number>(defaultValue ?? min);

    const currentValue = value !== undefined ? value : internalValue;

    useEffect(() => {
      let theme: string;
      if (typeof window === "undefined") {
        theme = "system";
      } else {
        theme = localStorage.getItem("theme") || "system";
      }

      if (theme === "system") {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setIsDarkMode(prefersDark);
      } else {
        setIsDarkMode(theme === "dark");
      }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value, 10);
      setInternalValue(val);
      onValueChange?.(val);
    };

    return (
      <div className={cn("w-full relative flex justify-center items-center mt-2 mb-2", className)}>
        <style>
          {`
            .nebutra-native-slider::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 16px;
              height: 16px;
              background: white;
              cursor: pointer;
              border-radius: 50%;
              border: 1px solid rgba(0,0,0,0.1);
              box-shadow: 0 0 0 1px rgba(0, 0, 0, .05), 0 2px 4px rgba(0, 0, 0, .1);
              transition: transform .2s;
            }

            .nebutra-native-slider::-webkit-slider-thumb:hover {
              transform: scale(1.1);
              box-shadow: 0 0 0 1px rgba(0, 0, 0, .1), 0 3px 6px rgba(0, 0, 0, .15);
            }

            .nebutra-native-slider::-moz-range-thumb {
              appearance: none;
              width: 16px;
              height: 16px;
              background: white;
              cursor: pointer;
              border-radius: 50%;
              border: 1px solid rgba(0,0,0,0.1);
              box-shadow: 0 0 0 1px rgba(0, 0, 0, .05), 0 2px 4px rgba(0, 0, 0, .1);
              transition: transform .2s;
            }

            .nebutra-native-slider::-moz-range-thumb:hover {
              transform: scale(1.1);
              box-shadow: 0 0 0 1px rgba(0, 0, 0, .1), 0 3px 6px rgba(0, 0, 0, .15);
            }
          `}
        </style>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentValue}
          onChange={handleChange}
          ref={ref}
          className="nebutra-native-slider w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          style={{
            background: `linear-gradient(to right, var(--color-primary) ${
              ((currentValue - min) / (max - min)) * 100
            }%, ${isDarkMode ? "var(--color-neutral-800)" : "var(--color-neutral-200)"} ${
              ((currentValue - min) / (max - min)) * 100
            }%)`,
          }}
          {...props}
        />
      </div>
    );
  },
);

Slider.displayName = "Slider";
export default Slider;
