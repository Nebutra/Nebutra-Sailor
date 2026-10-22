/**
 * Palette → something a repo can take: CSS custom properties, or a DTCG token
 * file. Both carry OKLCH as the source value; the DTCG form also keeps the hex
 * the OKLCH was gamut-mapped to, for tools that only read sRGB.
 */

import { formatOklch, hexToOklch } from "./oklch";
import { type Palette, STEP_ROLES, type Step, solidInk } from "./scale";

const NAME_RE = /^[a-z][a-z0-9-]*$/u;

function assertName(name: string): void {
  if (!NAME_RE.test(name)) {
    throw new Error(`export: name must be lowercase letters, digits and hyphens, got "${name}"`);
  }
}

function block(selector: string, name: string, steps: Step[]): string {
  const lines = steps.map((step) => `  --${name}-${step.step}: ${formatOklch(step.oklch)};`);
  lines.push(`  --${name}-contrast: ${formatOklch(hexToOklch(solidInk(steps)))};`);
  return `${selector} {\n${lines.join("\n")}\n}`;
}

/**
 * `:root` carries light, `.dark` carries dark — the selector this site's theme
 * switch toggles. `--<name>-contrast` is the label colour for the solid (step 9).
 */
export function toCssVariables(palette: Palette, name: string): string {
  assertName(name);
  return `${block(":root", name, palette.light)}\n\n${block(".dark", name, palette.dark)}\n`;
}

const round = (value: number, digits: number) => Number.parseFloat(value.toFixed(digits));

function dtcgColor(hex: string) {
  const { l, c, h } = hexToOklch(hex);
  return {
    colorSpace: "oklch",
    components: [round(l, 4), round(c, 4), round(c < 0.0005 ? 0 : h, 2)],
    hex,
  };
}

function dtcgGroup(steps: Step[]) {
  return Object.fromEntries(
    steps.map((step) => [
      String(step.step),
      {
        $value: dtcgColor(step.hex),
        $description: `${STEP_ROLES[step.step - 1]?.label ?? ""}.`,
      },
    ]),
  );
}

/**
 * DTCG (Design Tokens Community Group) format. `$value` is the structured colour
 * object — `colorSpace` plus `components` — with `hex` alongside as the fallback
 * the format defines for exactly this.
 */
export function toDtcg(palette: Palette, name: string): string {
  assertName(name);
  const tree = {
    [name]: {
      $type: "color",
      light: dtcgGroup(palette.light),
      dark: dtcgGroup(palette.dark),
      contrast: {
        light: {
          $value: dtcgColor(solidInk(palette.light)),
          $description: "Label colour on the solid step, light mode.",
        },
        dark: {
          $value: dtcgColor(solidInk(palette.dark)),
          $description: "Label colour on the solid step, dark mode.",
        },
      },
    },
  };
  return `${JSON.stringify(tree, null, 2)}\n`;
}
