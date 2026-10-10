"use client";
// @primitive-exempt: Fumadocs shell chrome outside @nebutra/ui, the counterpart of the KCQ public pages' own theme control (apps/kcq/src/public/components/theme-control.vue).

/**
 * Colour mode, shared with the KCQ public pages: the same `kcq:theme` key and the same rule
 * (system follows prefers-color-scheme; an explicit choice persists). The public pages' inline
 * theme script applies it before first paint; this button cycles System → Light → Dark.
 */
import { useEffect, useState } from "react";
import type { Lang } from "@/lib/i18n";
import { UI } from "@/lib/i18n";
import { MoonIcon, SunIcon, SystemIcon } from "./icons";

type Preference = "system" | "light" | "dark";
const KEY = "kcq:theme";
const ORDER: Preference[] = ["system", "light", "dark"];

function read(): Preference {
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

function apply(preference: Preference) {
  const dark =
    preference === "dark" ||
    (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const root = document.documentElement;
  const mode = dark ? "dark" : "light";
  if (root.dataset.theme === mode) return;
  // One recalculation with transitions off, so the page swaps at once instead of cross-fading.
  const pause = document.createElement("style");
  pause.textContent = "*,*::before,*::after{transition:none!important}";
  document.head.appendChild(pause);
  root.dataset.theme = mode;
  window.getComputedStyle(root).opacity;
  pause.remove();
}

export function ThemeToggle({ lang }: { lang: Lang }) {
  const [preference, setPreference] = useState<Preference>("system");
  useEffect(() => {
    setPreference(read());
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (read() === "system") apply("system");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  const t = UI[lang];
  const next = ORDER[(ORDER.indexOf(preference) + 1) % ORDER.length] ?? "system";
  const label = `${t.theme}: ${t.themes[preference]}`;
  const Icon = preference === "light" ? SunIcon : preference === "dark" ? MoonIcon : SystemIcon;
  return (
    <button
      type="button"
      className="kcq-icon-button"
      aria-label={label}
      onClick={() => {
        try {
          if (next === "system") localStorage.removeItem(KEY);
          else localStorage.setItem(KEY, next);
        } catch {
          // Blocked storage: the choice still applies to this page view.
        }
        setPreference(next);
        apply(next);
      }}
    >
      <Icon />
    </button>
  );
}
