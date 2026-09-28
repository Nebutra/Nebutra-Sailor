"use client";

import { useEffect, useState } from "react";
import { type LogoPlate, logoPlateFromPixels } from "../utils/logo-plate";

const SIDE = 64;
const cache = new Map<string, Promise<LogoPlate | null>>();

function measure(src: string): Promise<LogoPlate | null> {
  const known = cache.get(src);
  if (known) return known;
  const pending = new Promise<LogoPlate | null>((resolve) => {
    const img = new Image();
    // Reading pixels needs a CORS-clean image; the asset origin answers with
    // Access-Control-Allow-Origin for the product origins. A logo that cannot be
    // read keeps the neutral plate rather than guessing.
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = SIDE;
        canvas.height = SIDE;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(null);
        const scale = Math.min(SIDE / img.naturalWidth, SIDE / img.naturalHeight);
        const w = img.naturalWidth * scale;
        const h = img.naturalHeight * scale;
        ctx.drawImage(img, (SIDE - w) / 2, (SIDE - h) / 2, w, h);
        resolve(logoPlateFromPixels(ctx.getImageData(0, 0, SIDE, SIDE).data, SIDE));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
  cache.set(src, pending);
  return pending;
}

/**
 * The plate a logo should sit on, computed in the browser from the image itself
 * (utils/logo-plate). Nothing is maintained per logo: a new or replaced logo
 * gets its plate the first time it loads. Returns null until measured, or when
 * the image cannot be read — render a neutral plate in the meantime.
 */
export function useLogoPlate(src: string | null | undefined): LogoPlate | null {
  const [plate, setPlate] = useState<LogoPlate | null>(null);
  useEffect(() => {
    if (!src) return;
    let live = true;
    measure(src).then((p) => {
      if (live) setPlate(p);
    });
    return () => {
      live = false;
    };
  }, [src]);
  return src ? plate : null;
}
