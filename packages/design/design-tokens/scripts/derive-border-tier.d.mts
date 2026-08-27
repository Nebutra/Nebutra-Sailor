export interface Oklab {
  L: number;
  a: number;
  b: number;
}

export declare function hexToRgb(hex: string): [number, number, number] | null;
export declare function rgbToHex(rgb: readonly [number, number, number]): string;
export declare function hexToOklab(hex: string): Oklab;
export declare function oklabToHex(lab: Oklab): string;
export declare function oklabL(hex: string): number;
export declare function relativeLuminance(hex: string): number;
export declare function contrastRatio(hexA: string, hexB: string): number;

export declare const BORDER_TIER_T: Record<string, number>;
export declare const SOLID_ANCHOR_MIN_SPAN: number;
export declare const LADDER_MIN_JND: number;

export interface BorderTierDerivation {
  name: string;
  hex: string;
  meta: {
    from: string;
    anchorStep: string;
    anchor: string;
    t: number;
    bright: boolean;
    achromatic: boolean;
    L: number;
  };
}

/** Mutates the passed merged DTCG tree in place; returns the derivation log. */
export declare function deriveBorderTier(tokens: unknown): BorderTierDerivation[];

export declare function assertLadder(scaleName: string, values: Record<string, string>): string[];
