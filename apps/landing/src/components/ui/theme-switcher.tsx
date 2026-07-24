"use client";
import { Display as MonitorIcon, Moon as MoonStarIcon, Sun as SunIcon } from "@nebutra/icons";
import { useTheme } from "@nebutra/tokens";
import type { JSX } from "react";
import { useMount } from "@/hooks/useMount";
import { cn } from "@/lib/utils";

function ThemeOption({
  icon,
  value,
  isActive,
  onClick,
}: {
  icon: JSX.Element;
  value: "light" | "system" | "dark";
  isActive?: boolean;
  onClick: (value: "light" | "system" | "dark") => void;
}) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: ARIA pattern
    <button
      type="button"
      className={cn(
        "relative flex size-11 cursor-pointer items-center justify-center rounded-full transition-[background-color,color,box-shadow,transform] [&_svg]:size-4",
        isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
      role="radio"
      aria-checked={isActive}
      aria-label={`Switch to ${value} theme`}
      onClick={() => onClick(value)}
    >
      {icon}
      {isActive && <span className="absolute inset-0 rounded-full border border-border" />}
    </button>
  );
}
const THEME_OPTIONS = [
  { icon: <SunIcon />, value: "light" as const },
  { icon: <MonitorIcon />, value: "system" as const },
  { icon: <MoonStarIcon />, value: "dark" as const },
];
function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const isMounted = useMount();
  const currentTheme = theme ?? "system";
  if (!isMounted) {
    return <div className="flex h-11 w-[8.25rem]" />;
  }
  return (
    <div
      className="inline-flex items-center overflow-hidden rounded-full bg-background ring-1 ring-[hsl(var(--border))] ring-inset"
      role="radiogroup"
      aria-label="Select color theme"
    >
      {THEME_OPTIONS.map((option) => (
        <ThemeOption
          key={option.value}
          icon={option.icon}
          value={option.value}
          isActive={currentTheme === option.value}
          onClick={setTheme}
        />
      ))}
    </div>
  );
}

export { ThemeSwitcher };
