"use client";

import * as React from "react";
import { registerBrandFonts } from "@/components/brand-language-switcher";

/**
 * Hands the server-parsed font map to the switcher.
 *
 * The map comes out of `skins.css` at build time, which only a server module
 * can read; the switcher needs it in the browser before it starts a transition.
 * A component that renders nothing is the smallest honest bridge between the
 * two — no context provider for a value that never changes.
 */
export function BrandFontsRegistrar({ map }: { map: Record<string, string[]> }) {
  // Registered during render rather than in an effect: a click can land before
  // effects flush on a slow first paint, and an empty map at that moment means
  // the first switch is the one that jumps.
  registerBrandFonts(map);
  React.useEffect(() => registerBrandFonts(map), [map]);
  return null;
}
