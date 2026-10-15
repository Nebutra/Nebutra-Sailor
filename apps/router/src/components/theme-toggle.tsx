"use client";

import { DeviceDesktop as Monitor, Moon, Sun } from "@nebutra/icons";
import { useTheme } from "@nebutra/tokens";
import { Button } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type ThemeChoice = "system" | "light" | "dark";

const NEXT_THEME: Record<ThemeChoice, ThemeChoice> = {
  system: "light",
  light: "dark",
  dark: "system",
};

const ICON_FOR_THEME = { system: Monitor, light: Sun, dark: Moon } as const;

/**
 * Header theme control — the compact form of apps/web's ThemeToggle: one icon
 * button cycling system → light → dark. The stored choice is only known in the
 * browser, so a same-size placeholder holds the slot until mount.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("chrome.theme");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <span aria-hidden className={cn("inline-block size-8 shrink-0", className)} />;
  }

  const active = (theme as ThemeChoice | undefined) ?? "system";
  const Icon = ICON_FOR_THEME[active];
  const next = NEXT_THEME[active];
  return (
    <Button
      type="button"
      variant="ghost"
      shape="circle"
      size="sm"
      aria-label={t("toggle", { current: t(active), next: t(next) })}
      onClick={() => setTheme(next)}
      className={cn("size-8 shrink-0 text-muted-foreground hover:text-foreground", className)}
    >
      <Icon aria-hidden className="size-4" />
    </Button>
  );
}
