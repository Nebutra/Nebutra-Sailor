"use client";

import { Display, Moon, Sun } from "@nebutra/icons";
import { Switch } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

type ThemeMode = "light" | "dark" | "system";

const OPTIONS: ReadonlyArray<{ value: ThemeMode; icon: typeof Sun }> = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Display },
];

export function ThemeModeSegmented() {
  const t = useTranslations("settings.appearance.themeMode");
  const { theme, setTheme } = useTheme();
  const current: ThemeMode = theme === "dark" || theme === "light" ? theme : "system";

  return (
    <Switch
      size="small"
      value={current}
      onValueChange={(value) => setTheme(value)}
      aria-label={t("label")}
    >
      {OPTIONS.map(({ value, icon: Icon }) => (
        <Switch.Control key={value} value={value} label={t(value)} icon={<Icon />} />
      ))}
    </Switch>
  );
}
