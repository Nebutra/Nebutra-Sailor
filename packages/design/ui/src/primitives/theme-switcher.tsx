"use client";

import { motion } from "framer-motion";
import { Monitor, Moon, Sun } from "lucide-react";
import type * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "../utils/cn";

export type ThemeSwitcherValue = "light" | "dark" | "system";

export interface ThemeSwitcherProps {
  /** Current theme value */
  value?: ThemeSwitcherValue;
  /** Default theme value (uncontrolled) */
  defaultValue?: ThemeSwitcherValue;
  /** Callback when theme changes */
  onChange?: (theme: ThemeSwitcherValue) => void;
  /** Additional class names */
  className?: string;
  /** Custom icons for each theme */
  icons?: {
    system?: React.ElementType;
    light?: React.ElementType;
    dark?: React.ElementType;
  };
  /** Labels for accessibility */
  labels?: {
    system?: string;
    light?: string;
    dark?: string;
  };
}

const DEFAULT_ICONS = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

const DEFAULT_LABELS = {
  system: "System theme",
  light: "Light theme",
  dark: "Dark theme",
};

/**
 * ThemeSwitcher - Compact theme toggle for light/dark/system modes
 *
 * Can be used standalone or with next-themes.
 *
 * @example Standalone usage
 * ```tsx
 * const [theme, setTheme] = useState<ThemeSwitcherValue>("system");
 * <ThemeSwitcher value={theme} onChange={setTheme} />
 * ```
 *
 * @example With next-themes
 * ```tsx
 * import { useTheme } from "next-themes";
 *
 * function MyThemeSwitcher() {
 *   const { theme, setTheme } = useTheme();
 *   return (
 *     <ThemeSwitcher
 *       value={theme as ThemeSwitcherValue}
 *       onChange={setTheme}
 *     />
 *   );
 * }
 * ```
 */
export function ThemeSwitcher({
  value,
  defaultValue = "system",
  onChange,
  className,
  icons,
  labels,
}: ThemeSwitcherProps) {
  const [internalValue, setInternalValue] = useState<ThemeSwitcherValue>(defaultValue);
  const [mounted, setMounted] = useState(false);

  const currentValue = value ?? internalValue;

  const mergedIcons = { ...DEFAULT_ICONS, ...icons };
  const mergedLabels = { ...DEFAULT_LABELS, ...labels };

  const themes: Array<{
    key: ThemeSwitcherValue;
    icon: React.ElementType;
    label: string;
  }> = [
    {
      key: "system",
      icon: mergedIcons.system,
      label: mergedLabels.system,
    },
    {
      key: "light",
      icon: mergedIcons.light,
      label: mergedLabels.light,
    },
    {
      key: "dark",
      icon: mergedIcons.dark,
      label: mergedLabels.dark,
    },
  ];

  const handleThemeClick = useCallback(
    (themeKey: ThemeSwitcherValue) => {
      if (value === undefined) {
        setInternalValue(themeKey);
      }
      onChange?.(themeKey);
    },
    [value, onChange],
  );

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={cn(
          "relative isolate flex h-7 rounded-full bg-background p-1 ring-1 ring-border",
          className,
        )}
      >
        {themes.map(({ key }) => (
          <div key={key} className="h-5 w-6 rounded-full" />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative isolate flex h-7 rounded-full bg-background p-1 ring-1 ring-border",
        className,
      )}
    >
      {themes.map(({ key, icon: IconRaw, label }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Icon = IconRaw as any;
        const isActive = currentValue === key;

        return (
          <button
            aria-label={label}
            className="relative h-5 w-6 rounded-full"
            key={key}
            onClick={() => handleThemeClick(key)}
            type="button"
          >
            {isActive && (
              <motion.div
                className="absolute inset-0 rounded-full bg-secondary shadow-sm"
                layoutId="theme-switcher-bg"
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              />
            )}
            <Icon
              className={cn(
                "relative z-10 m-auto h-3.5 w-3.5",
                isActive ? "text-foreground" : "text-muted-foreground",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

ThemeSwitcher.displayName = "ThemeSwitcher";
