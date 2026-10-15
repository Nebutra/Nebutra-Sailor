/** Read the same scoped settings and public theme resolver as the chart. */
import { resolveTheme, themeToCssVars } from "@363045841yyt/klinechart-core";
import { normalizeSettings, readActiveLayoutSettings } from "@363045841yyt/klinechart-core/config";

export async function initializeProfileTheme() {
  const settings = normalizeSettings(await readActiveLayoutSettings());
  const mode =
    settings.theme === "dark" ||
    (settings.theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches)
      ? "dark"
      : "light";
  const theme = resolveTheme(mode, settings.isAsiaMarket, settings.colorPresetSettings);
  for (const [name, value] of Object.entries(themeToCssVars(theme))) {
    document.body.style.setProperty(name, value);
  }
  document.documentElement.style.colorScheme = mode;
  document.documentElement.classList.toggle("dark", mode === "dark");
}
