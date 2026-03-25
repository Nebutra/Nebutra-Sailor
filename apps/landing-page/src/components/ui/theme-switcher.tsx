"use client";
import { Display as MonitorIcon, Moon as MoonStarIcon, Sun as SunIcon } from "@nebutra/icons";
import { useTheme } from "next-themes";
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
        "relative flex size-10 cursor-pointer items-center justify-center rounded-full transition-all [&_svg]:size-4",
        isActive
          ? "text-[var(--neutral-12)]"
          : "text-[var(--neutral-9)] hover:text-[var(--neutral-12)]",
      )}
      role="radio"
      aria-checked={isActive}
      aria-label={`Switch to ${value} theme`}
      onClick={() => onClick(value)}
    >
      {icon}
      {isActive && (
        <span className="absolute inset-0 rounded-full border border-[var(--neutral-6)]" />
      )}
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
    return <div className="flex h-10 w-[7.5rem]" />;
  }
  return (
    <div
      className="inline-flex items-center overflow-hidden rounded-full bg-[var(--neutral-1)] ring-1 ring-[var(--neutral-6)] ring-inset"
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
