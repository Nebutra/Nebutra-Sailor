/**
 * Code themes held to WCAG AA: GitHub's light and dark-dimmed themes with every token colour
 * nudged until it reaches 4.6:1 against the code-block ground in its mode (the lightest light
 * ground and the lightest dark ground the KCQ tokens produce). Hue is kept; only lightness moves.
 */

import type { ThemeRegistration } from "shiki";
import githubDarkDimmed from "shiki/themes/github-dark-dimmed.mjs";
import githubLight from "shiki/themes/github-light.mjs";

const TARGET = 4.6;

function channels(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.replace(/./g, (c) => c + c) : h.slice(0, 6);
  return [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16)) as [
    number,
    number,
    number,
  ];
}

function luminance([r, g, b]: [number, number, number]): number {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: [number, number, number], b: [number, number, number]): number {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

function toHex(rgb: number[]): string {
  return `#${rgb
    .map((v) =>
      Math.round(Math.max(0, Math.min(255, v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function fix(color: string | undefined, ground: string, toward: 0 | 255): string | undefined {
  if (!color || !/^#[0-9a-f]{3,8}$/i.test(color)) return color;
  let rgb = channels(color);
  const bg = channels(ground);
  for (let step = 0; step < 40 && contrast(rgb, bg) < TARGET; step += 1) {
    rgb = rgb.map((v) => v + (toward - v) * 0.06) as [number, number, number];
  }
  return toHex(rgb);
}

function accessible(
  theme: ThemeRegistration,
  ground: string,
  toward: 0 | 255,
  name: string,
): ThemeRegistration {
  return {
    ...theme,
    name,
    colors: {
      ...theme.colors,
      "editor.foreground": fix(theme.colors?.["editor.foreground"], ground, toward) ?? "",
    },
    tokenColors: (theme.tokenColors ?? []).map((rule) => ({
      ...rule,
      settings: { ...rule.settings, foreground: fix(rule.settings?.foreground, ground, toward) },
    })),
  };
}

export const codeThemes = {
  light: accessible(githubLight as ThemeRegistration, "#F5F5F7", 0, "kcq-light"),
  dark: accessible(githubDarkDimmed as ThemeRegistration, "#1E1F24", 255, "kcq-dark"),
};
