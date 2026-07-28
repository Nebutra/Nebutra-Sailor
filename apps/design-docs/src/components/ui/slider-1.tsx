"use client";

import type React from "react";
import { useSyncExternalStore } from "react";

interface SliderProps {
  onValueChange: React.Dispatch<React.SetStateAction<number>>;
  value: number;
}

function getThemeIsDark() {
  if (typeof window === "undefined") return false;

  const theme = localStorage.getItem("theme") || "system";
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  return theme === "dark";
}

function subscribeTheme(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener("storage", callback);
  media.addEventListener("change", callback);

  return () => {
    window.removeEventListener("storage", callback);
    media.removeEventListener("change", callback);
  };
}

export const Slider = ({ onValueChange, value }: SliderProps) => {
  const isDarkMode = useSyncExternalStore(subscribeTheme, getThemeIsDark, () => false);

  return (
    <div className="w-full">
      <div className="relative flex justify-center items-center mb-4">
        <style>
          {`
 .slider::-webkit-slider-thumb {
 -webkit-appearance: none;
 appearance: none;
 width: 6px;
 height: 14px;
 background: white;
 cursor: pointer;
 border-radius: 1px;
 box-shadow: 0 0 0 1px rgba(0, 0, 0, .21), 0 1px 2px rgba(0, 0, 0, .04);
 transition: box-shadow .2s, background .2s, transform .2s;
 }

 .slider::-moz-range-thumb {
 appearance: none;
 width: 6px;
 height: 14px;
 background: white;
 cursor: pointer;
 border-radius: 1px;
 border: none;
 box-shadow: 0 0 0 1px rgba(0, 0, 0, .21), 0 1px 2px rgba(0, 0, 0, .04);
 transition: box-shadow .2s, background .2s, transform .2s;
 }
 `}
        </style>
        <input
          aria-label="Preview intensity"
          type="range"
          min="1"
          max="100"
          value={value}
          onChange={(event) => onValueChange(parseInt(event.target.value, 10))}
          className="slider w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, hsl(var(--primary)) ${value - 0.5}%, ${isDarkMode ? "hsl(var(--border))" : "hsl(var(--muted))"} ${value - 0.5}%)`,
          }}
        />
      </div>
    </div>
  );
};
