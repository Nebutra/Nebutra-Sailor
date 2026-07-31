"use client";

import { DeviceDesktop as Monitor, Moon, Sun } from "@nebutra/icons";
import { useTheme } from "@nebutra/tokens";
import { Button, ToggleGroup, ToggleGroupItem } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
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
          compact ? "h-8 w-8 rounded-full bg-neutral-3" : "h-8 w-[156px] rounded-full bg-neutral-3"
        }
      />
    );
  }

  if (compact) {
    const Icon = ICON_FOR_THEME[active];
    const next = NEXT_THEME[active];
    return (
      <Button
        type="button"
        variant="ghost"
        shape="circle"
        size="sm"
        aria-label="Toggle theme"
        title={`${t(active)} → ${t(next)}`}
        onClick={() => setTheme(next)}
        className={className ?? "text-neutral-11 hover:bg-neutral-3 hover:text-neutral-12"}
      >
        <Icon className="h-4 w-4" />
      </Button>
    );
  }

  const choices: ThemeChoice[] = ["system", "light", "dark"];
  return (
    <ToggleGroup
      type="single"
      variant="pill"
      value={active}
      onValueChange={(value) => setTheme(value as ThemeChoice)}
      aria-label="Theme"
      className={cn("border border-neutral-7 bg-neutral-1 p-0.5", className)}
    >
      {choices.map((choice) => {
        const Icon = ICON_FOR_THEME[choice];
        return (
          <ToggleGroupItem
            key={choice}
            value={choice}
            variant="pill"
            aria-label={t(choice)}
            className="gap-1.5 px-3 py-1 text-xs hover:bg-neutral-2"
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            <span>{t(choice)}</span>
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
