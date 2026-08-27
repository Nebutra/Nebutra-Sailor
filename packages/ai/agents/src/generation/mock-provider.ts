/**
 * Deterministic mock generation provider.
 *
 * Always available (`envKey: null`) so CI and flag-gated demos never need a
 * paid secret. Output is a stable, content-addressed SVG `data:` URI: the same
 * prompt + size always yields byte-identical bytes, which makes canvas
 * placement and websocket-sync tests deterministic.
 *
 * Wiring a real provider (Replicate / OpenAI images / Volces) later is purely
 * additive — register it with a non-null `envKey` and it takes priority over
 * `mock` in the fallback chain whenever its key is present.
 */

import type {
  GenerationContext,
  GenerationProvider,
  GenerationResult,
  ImageGenerationRequest,
  VideoGenerationRequest,
} from "./types";

/** FNV-1a — small, stable, no deps. Used to derive a deterministic hue. */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function svgDataUri(label: string, prompt: string, w: number, h: number): string {
  const hue = hash(prompt) % 360;
  const hue2 = (hue + 40) % 360;
  // Wrap the prompt to ~32 chars/line, max 4 lines, so the placeholder
  // visibly carries its prompt (useful when eyeballing a canvas demo).
  const words = prompt.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    if ((cur + " " + word).trim().length > 32) {
      lines.push(cur.trim());
      cur = word;
    } else {
      cur = `${cur} ${word}`;
    }
    if (lines.length === 4) break;
  }
  if (cur && lines.length < 4) lines.push(cur.trim());

  const tspans = lines
    .map((ln, i) => `<tspan x="50%" dy="${i === 0 ? 0 : 26}">${escapeXml(ln)}</tspan>`)
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="hsl(${hue} 70% 55%)"/>
<stop offset="1" stop-color="hsl(${hue2} 70% 45%)"/>
</linearGradient></defs>
<rect width="${w}" height="${h}" fill="url(#g)"/>
<text x="50%" y="14%" fill="rgba(255,255,255,.7)" font-family="sans-serif" font-size="20" text-anchor="middle">${escapeXml(label)}</text>
<text x="50%" y="46%" fill="#fff" font-family="sans-serif" font-size="22" font-weight="600" text-anchor="middle">${tspans}</text>
</svg>`;

  // base64 keeps the URI well-formed regardless of prompt characters.
  const b64 =
    typeof btoa === "function"
      ? btoa(unescape(encodeURIComponent(svg)))
      : Buffer.from(svg, "utf8").toString("base64");
  return `data:image/svg+xml;base64,${b64}`;
}

export const mockGenerationProvider: GenerationProvider = {
  name: "mock",
  envKey: null,
  capabilities: ["image", "video"],

  async generateImage(
    req: ImageGenerationRequest,
    _ctx: GenerationContext,
  ): Promise<GenerationResult> {
    const width = req.width ?? 1024;
    const height = req.height ?? 1024;
    return {
      modality: "image",
      mimeType: "image/svg+xml",
      url: svgDataUri("mock · image", req.prompt, width, height),
      width,
      height,
      providerName: "mock",
      model: req.model ?? "mock-image-1",
      usage: { units: 1 },
    };
  },

  async generateVideo(
    req: VideoGenerationRequest,
    _ctx: GenerationContext,
  ): Promise<GenerationResult> {
    const width = req.width ?? 1280;
    const height = req.height ?? 720;
    const seconds = req.durationSeconds ?? 5;
    // No real codec in mock mode — return a poster frame the canvas can embed.
    return {
      modality: "video",
      mimeType: "image/svg+xml",
      url: svgDataUri(`mock · video · ${seconds}s`, req.prompt, width, height),
      width,
      height,
      providerName: "mock",
      model: req.model ?? "mock-video-1",
      usage: { units: seconds },
    };
  },
};
