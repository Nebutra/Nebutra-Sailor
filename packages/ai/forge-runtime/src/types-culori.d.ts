/** Minimal ambient types for culori@4 (package ships JS only). */
declare module "culori" {
  export type Color = Record<string, unknown> | string;

  export function parse(color: string): Color | undefined;
  export function converter(mode: string): (color: Color | string) => Color | undefined;
  export function formatHex(color: Color | string): string;
  export function formatRgb(color: Color | string): string;
  export function formatHsl(color: Color | string): string;
  export function formatCss(color: Color | string): string;
  export function differenceCiede2000(
    kL?: number,
    kC?: number,
    kH?: number,
  ): (a: Color | string, b: Color | string) => number;
}
