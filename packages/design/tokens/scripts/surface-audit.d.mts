export const HAIRLINE_CONTRAST: { min: number; max: number };
export const MOTION_CEILING: { micro: number; flow: number; reveal: number };

export type Rgb = [number, number, number];

export interface SurfacePalette {
  selector: string;
  mode: "light" | "dark";
  border: string;
  strongValue: string | null;
  borderVsBackground: number;
  borderVsCard: number | null;
  strongVsBackground: number | null;
}

export function hslToRgb(h: number, s: number, l: number): Rgb;
export function luminance(rgb: Rgb): number;
export function contrast(a: Rgb, b: Rgb): number;
export function parseColor(value: string | null | undefined): Rgb | null;
export function cssBlocks(css: string): Array<{ selector: string; body: string }>;
export function declared(body: string, name: string): string | null;
export function palettes(css: string): SurfacePalette[];
export function toPx(value: string | null | undefined): number | null;
