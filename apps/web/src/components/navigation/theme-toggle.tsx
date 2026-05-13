"use client";

import { DeviceDesktop as Monitor, Moon, Sun } from "@nebutra/icons";
import { useTheme } from "@nebutra/tokens";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type ThemeChoice = "system" | "light" | "dark";

interface ThemeToggleProps {
  /**
   * When true, renders a single icon-only button that cycles through
   * system → light → dark. Useful inside a sidebar header.
   */
  compact?: boolean;
  className?: string;
}

const NEXT_THEME: Record<ThemeChoice, ThemeChoice> = {
  system: "light",
  light: "dark",
  dark: "system",
};

const ICON_FOR_THEME: Record<ThemeChoice, typeof Monitor> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

export function ThemeToggle({ compact = false, className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("theme");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const active = (mounted ? (theme as ThemeChoice | undefined) : undefined) ?? "system";

  if (!mounted) {
    return (
      <div
        data-testid="theme-toggle-skeleton"
        aria-hidden
        className={
          compact
            ? "h-8 w-8 rounded-full bg-neutral-3 dark:bg-white/5"
            : "h-8 w-[156px] rounded-full bg-neutral-3 dark:bg-white/5"
        }
      />
    );
  }

  if (compact) {
    const Icon = ICON_FOR_THEME[active];
    const next = NEXT_THEME[active];
    return (
      <button
        type="button"
        aria-label="Toggle theme"
        title={`${t(active)} → ${t(next)}`}
        onClick={() => setTheme(next)}
        className={
          className ??
          "inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-11 transition-colors hover:bg-neutral-3 hover:text-neutral-12 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
        }
      >
        <Icon className="h-4 w-4" />
      </button>
    );
  }

  const choices: ThemeChoice[] = ["system", "light", "dark"];
  return (
    // biome-ignore lint/a11y/useSemanticElements: segmented toggle is a button group, not a radiogroup or fieldset
    <div
      role="group"
      aria-label="Theme"
      className={
        className ??
        "inline-flex items-center gap-0.5 rounded-full border border-neutral-7 bg-neutral-1 p-0.5 dark:border-white/10 dark:bg-white/5"
      }
    >
      {choices.map((choice) => {
        const Icon = ICON_FOR_THEME[choice];
        const isActive = active === choice;
        return (
          <button
            key={choice}
            type="button"
            aria-pressed={isActive}
            aria-label={t(choice)}
            onClick={() => setTheme(choice)}
            className={[
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-offset-1",
              isActive
                ? "bg-blue-2 text-blue-11 dark:bg-white/15 dark:text-white"
                : "text-neutral-11 hover:bg-neutral-2 hover:text-neutral-12 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white",
            ].join(" ")}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            <span>{t(choice)}</span>
          </button>
        );
      })}
    </div>
  );
}
