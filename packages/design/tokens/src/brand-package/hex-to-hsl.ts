/** Convert #rgb / #rrggbb to HSL channel triple "H S% L%" for shadcn-style vars. */
export function hexToHslChannels(hex: string): string {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (h.length !== 6 || !/^[0-9a-fA-F]+$/.test(h)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  const r = Number.parseInt(h.slice(0, 2), 16) / 255;
  const g = Number.parseInt(h.slice(2, 4), 16) / 255;
  const b = Number.parseInt(h.slice(4, 6), 16) / 255;
  return srgbToHslChannels(r, g, b);
}

function srgbToHslChannels(r: number, g: number, b: number): string {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let s = 0;
  let hue = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        hue = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        hue = (b - r) / d + 2;
        break;
      default:
        hue = (r - g) / d + 4;
    }
    hue /= 6;
  }
  const H = Math.round(hue * 360);
  const S = Math.round(s * 100);
  const L = Math.round(l * 100);
  return `${H} ${S}% ${L}%`;
}

/** Already a shadcn-style channel triple? e.g. "228 85% 56%" */
const HSL_CHANNELS_RE = /^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/;

/**
 * Normalize any common color input to HSL channel triple "H S% L%".
 * Accepts: #hex, "H S% L%", hsl()/hsla(), rgb()/rgba().
 */
export function colorToHslChannels(color: string): string {
  const t = color.trim();
  if (!t) throw new Error("Empty color");

  const channels = t.match(HSL_CHANNELS_RE);
  if (channels) {
    return `${Math.round(Number(channels[1]))} ${Math.round(Number(channels[2]))}% ${Math.round(Number(channels[3]))}%`;
  }

  // Parse hsl()/rgb() without open-ended \s* quantifiers (ReDoS-safe).
  const hslPrefix = t.match(/^hsla?\(/i);
  if (hslPrefix) {
    const inner = t.slice(hslPrefix[0].length).split(")")[0] ?? "";
    const nums = inner.match(/[\d.]+/g) ?? [];
    if (nums.length >= 3) {
      return `${Math.round(Number(nums[0]))} ${Math.round(Number(nums[1]))}% ${Math.round(Number(nums[2]))}%`;
    }
  }

  const rgbPrefix = t.match(/^rgba?\(/i);
  if (rgbPrefix) {
    const inner = t.slice(rgbPrefix[0].length).split(")")[0] ?? "";
    const nums = inner.match(/[\d.]+/g) ?? [];
    if (nums.length >= 3) {
      return srgbToHslChannels(Number(nums[0]) / 255, Number(nums[1]) / 255, Number(nums[2]) / 255);
    }
  }

  if (t.startsWith("#") || /^[0-9a-fA-F]{3,8}$/.test(t)) {
    return hexToHslChannels(t.startsWith("#") ? t : `#${t}`);
  }

  throw new Error(`Unsupported color: ${color}`);
}

/** Prefer {@link colorToHslChannels}; hex-only name kept for call sites. */
export function tryHexToHsl(hex: string | undefined, fallback: string): string {
  return tryColorToHsl(hex, fallback);
}

export function tryColorToHsl(color: string | undefined, fallback: string): string {
  if (!color) return fallback;
  try {
    return colorToHslChannels(color);
  } catch {
    return fallback;
  }
}
