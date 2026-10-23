#!/usr/bin/env tsx

/**
 * Generate the favicon set from the colour logo symbol (assets/logo/logo-color.svg).
 *
 * Produces (under assetsDir/favicon/):
 *   favicon.svg                — the symbol, transparent, as an SVG wrapper around a 128px render
 *   favicon.ico                — 16 + 32 + 48 px, transparent, symbol only
 *   apple-touch-icon.png       — 180×180 on paper white (iOS flattens transparency to black)
 *   android-chrome-192x192.png — 192×192 on paper white, symbol inside the maskable safe zone
 *   android-chrome-512x512.png — 512×512, same
 *
 * The source is the colour symbol, never logo-inverse/logo-mono: those are white or black
 * ink on a transparent ground, so an icon drawn from them is blank or the wrong colour.
 * The symbol's two counters (the slanted openings of the N) are left as the artwork draws them:
 * transparent. Nothing is painted into them; the opaque icons simply sit on a paper-white tile.
 *
 * Wordmark geometry CANNOT be auto-generated from a name — recolor only.
 * Operators supply replacement wordmark SVGs via brand.config/assets/logo/ →
 * copied by copyCustomAssets.
 *
 * Called from scripts/brand-apply.ts main() after copyCustomAssets().
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const brandRoot = resolve(__dirname, "..");

// ─── helpers ──────────────────────────────────────────────────────────────────

function log(msg: string): void {
  process.stdout.write(`  ✔︎ ${msg}\n`);
}

function warn(msg: string): void {
  process.stderr.write(`  ⚠ ${msg}\n`);
}

type SharpFn = (input: Buffer, options?: { density?: number }) => import("sharp").Sharp;

async function loadSharp(): Promise<SharpFn> {
  const { default: sharpFn } = (await import("sharp")) as unknown as { default: SharpFn };
  return sharpFn;
}

/**
 * Build a minimal ICO file from one or more PNG buffers.
 *
 * ICO format:
 *   ICONDIR  (6 bytes): reserved(2) + type=1(2) + count(2)
 *   ICONDIRENTRY × count (16 bytes each):
 *     width(1) height(1) colorCount(1) reserved(1)
 *     planes(2) bitCount(2) bytesInRes(4) imageOffset(4)
 *   PNG data concatenated
 *
 * Modern browsers support PNG-in-ICO so we just embed the raw PNGs.
 */
function buildIco(pngs: Array<{ png: Buffer; size: number }>): Buffer {
  const count = pngs.length;
  const headerSize = 6 + count * 16;

  let offset = headerSize;
  const offsets: number[] = [];
  for (const { png } of pngs) {
    offsets.push(offset);
    offset += png.length;
  }

  const totalSize = offset;
  const buf = Buffer.alloc(totalSize, 0);

  // ICONDIR
  buf.writeUInt16LE(0, 0); // reserved
  buf.writeUInt16LE(1, 2); // type = ICO
  buf.writeUInt16LE(count, 4);

  // ICONDIRENTRY entries
  let entryOffset = 6;
  for (let i = 0; i < count; i++) {
    const { png, size } = pngs[i];
    const s = size >= 256 ? 0 : size; // 0 means 256 in ICO spec
    buf.writeUInt8(s, entryOffset + 0); // width
    buf.writeUInt8(s, entryOffset + 1); // height
    buf.writeUInt8(0, entryOffset + 2); // colorCount
    buf.writeUInt8(0, entryOffset + 3); // reserved
    buf.writeUInt16LE(1, entryOffset + 4); // planes
    buf.writeUInt16LE(32, entryOffset + 6); // bitCount
    buf.writeUInt32LE(png.length, entryOffset + 8); // bytesInRes
    buf.writeUInt32LE(offsets[i], entryOffset + 12); // imageOffset
    entryOffset += 16;
  }

  // PNG data
  for (let i = 0; i < count; i++) {
    pngs[i].png.copy(buf, offsets[i]);
  }

  return buf;
}

// ─── main export ──────────────────────────────────────────────────────────────

const PAPER = "#ffffff";

interface TileOptions {
  /** Edge of the square canvas, in px. */
  size: number;
  /** The symbol's width as a share of the canvas. */
  fill: number;
  /** Paint the canvas paper white; otherwise it is transparent. */
  paper: boolean;
}

/** The symbol centred on a square canvas. */
async function renderTile(svg: string, { size, fill, paper }: TileOptions): Promise<Buffer> {
  const sharpFn = await loadSharp();
  const width = Math.round(size * fill);
  // Render well above the target so the facets' gradients stay smooth after downscaling.
  const symbol = await sharpFn(Buffer.from(svg), { density: 300 })
    .resize({ width, height: width, fit: "inside" })
    .png()
    .toBuffer();
  const { width: w = width, height: h = width } = await sharpFn(symbol).metadata();
  const tile = sharpFn(symbol).extend({
    background: paper ? PAPER : { r: 0, g: 0, b: 0, alpha: 0 },
    bottom: size - h - Math.floor((size - h) / 2),
    left: Math.floor((size - w) / 2),
    right: size - w - Math.floor((size - w) / 2),
    top: Math.floor((size - h) / 2),
  });
  // The artwork is transparent between its facets; an opaque tile must be flat paper.
  return (paper ? tile.flatten({ background: PAPER }) : tile).png().toBuffer();
}

/**
 * Generate the favicon set from the colour logo symbol.
 *
 * @param assetsDir  Absolute path to packages/design/brand/assets
 */
export async function generateFavicons(assetsDir: string): Promise<void> {
  const faviconDir = join(assetsDir, "favicon");
  const logoColorPath = join(assetsDir, "logo", "logo-color.svg");

  if (!existsSync(logoColorPath)) {
    warn(`logo-color.svg not found at ${logoColorPath} — skipping favicon generation`);
    return;
  }

  mkdirSync(faviconDir, { recursive: true });

  const svg = readFileSync(logoColorPath, "utf-8");

  // ── 1. favicon.svg — the symbol itself is raster-backed artwork, so wrap a render ──
  const svgPng = await renderTile(svg, { size: 128, fill: 1, paper: false });
  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="32" height="32"><image width="64" height="64" href="data:image/png;base64,${svgPng.toString("base64")}"/></svg>`;
  writeFileSync(join(faviconDir, "favicon.svg"), faviconSvg, "utf-8");
  log("favicon.svg");

  // ── 2. android-chrome — maskable, so the symbol stays inside the 80% safe zone ──
  writeFileSync(
    join(faviconDir, "android-chrome-192x192.png"),
    await renderTile(svg, { size: 192, fill: 0.6, paper: true }),
  );
  log("android-chrome-192x192.png");
  writeFileSync(
    join(faviconDir, "android-chrome-512x512.png"),
    await renderTile(svg, { size: 512, fill: 0.6, paper: true }),
  );
  log("android-chrome-512x512.png");

  // ── 3. apple-touch-icon.png — square and opaque; iOS rounds the corners itself ──
  writeFileSync(
    join(faviconDir, "apple-touch-icon.png"),
    await renderTile(svg, { size: 180, fill: 0.66, paper: true }),
  );
  log("apple-touch-icon.png (180×180)");

  // ── 4. favicon.ico — 16+32+48, symbol only, as large as the tab allows ──
  const ico = buildIco(
    await Promise.all(
      [16, 32, 48].map(async (size) => ({
        png: await renderTile(svg, { size, fill: 0.96, paper: false }),
        size,
      })),
    ),
  );
  writeFileSync(join(faviconDir, "favicon.ico"), ico);
  log("favicon.ico (16+32+48 multi-size)");
}

// ─── text-wordmark brands: the icon set from the brand's initial ─────────────

export interface InitialIconOptions {
  /** The brand's name; its first letter is the mark. */
  name: string;
  /** Fill of the rounded square, a hex colour (the brand primary). */
  background: string;
}

/** Black or white, whichever reads better on `hex` (WCAG relative luminance). */
function inkOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "#ffffff";
  const n = Number.parseInt(m[1] as string, 16);
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const l = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return 1.05 / (l + 0.05) >= (l + 0.05) / 0.05 ? "#ffffff" : "#0b0b0f";
}

function escapeXml(text: string): string {
  return text.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/**
 * The mark as SVG: the initial, centred, on a rounded square in the brand
 * colour. `size` is the viewBox; the corner radius and letter scale with it
 * the way TextLogomark does in the UI.
 */
export function initialIconSvg({ name, background }: InitialIconOptions, size = 512): string {
  const initial = escapeXml((name.trim().charAt(0) || "?").toUpperCase());
  const radius = Math.round(size * 0.22);
  const fontSize = Math.round(size * 0.62);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${escapeXml(name)}"><rect width="${size}" height="${size}" rx="${radius}" fill="${background}"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-family="Inter, 'Helvetica Neue', Helvetica, Arial, 'DejaVu Sans', 'Liberation Sans', sans-serif" font-weight="600" font-size="${fontSize}" fill="${inkOn(background)}">${initial}</text></svg>`;
}

/**
 * Whether the rendered PNG actually shows a letter: the centre of the icon must
 * contain pixels of the ink colour. Rendering text needs a system font; on a
 * machine without one the square would come out blank.
 */
async function hasGlyph(png: Buffer, size: number): Promise<boolean> {
  const { default: sharpFn } = (await import("sharp")) as unknown as {
    default: (input: Buffer) => import("sharp").Sharp;
  };
  const { data, info } = await sharpFn(png).raw().toBuffer({ resolveWithObject: true });
  const [r0, g0, b0] = [data[0], data[1], data[2]];
  let differing = 0;
  const from = Math.floor(size * 0.3);
  const to = Math.ceil(size * 0.7);
  for (let y = from; y < to; y++) {
    for (let x = from; x < to; x++) {
      const i = (y * info.width + x) * info.channels;
      if (Math.abs(data[i] - r0) + Math.abs(data[i + 1] - g0) + Math.abs(data[i + 2] - b0) > 96)
        differing++;
    }
  }
  return differing > (to - from) ** 2 * 0.04;
}

/**
 * The favicon set for a brand with no logo of its own (brand.logo ===
 * "wordmark"): its initial on a rounded square in the brand colour, in the
 * same files generateFavicons writes. Returns false (and writes nothing) when
 * the letter cannot be rendered.
 */
export async function generateInitialFavicons(
  assetsDir: string,
  options: InitialIconOptions,
): Promise<boolean> {
  const { default: sharpFn } = (await import("sharp")) as unknown as {
    default: (input: Buffer) => import("sharp").Sharp;
  };
  const faviconDir = join(assetsDir, "favicon");
  mkdirSync(faviconDir, { recursive: true });

  const render = async (size: number) =>
    sharpFn(Buffer.from(initialIconSvg(options, size)))
      .png()
      .toBuffer();

  const png512 = await render(512);
  if (!(await hasGlyph(png512, 512))) {
    warn("no font could render the brand initial — keeping the existing favicon set");
    return false;
  }

  writeFileSync(join(faviconDir, "favicon.svg"), initialIconSvg(options, 32), "utf-8");
  log("favicon.svg (brand initial)");
  writeFileSync(join(faviconDir, "android-chrome-512x512.png"), png512);
  writeFileSync(join(faviconDir, "android-chrome-192x192.png"), await render(192));
  log("android-chrome-192x192.png, android-chrome-512x512.png");
  writeFileSync(join(faviconDir, "apple-touch-icon.png"), await render(180));
  log("apple-touch-icon.png");
  const ico = buildIco([
    { png: await render(16), size: 16 },
    { png: await render(32), size: 32 },
    { png: await render(48), size: 48 },
  ]);
  writeFileSync(join(faviconDir, "favicon.ico"), ico);
  log("favicon.ico (16+32+48)");
  return true;
}

// ─── CLI entrypoint ────────────────────────────────────────────────────────────

const IS_MAIN =
  typeof process !== "undefined" &&
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (IS_MAIN) {
  const assetsDir = join(brandRoot, "assets");
  process.stdout.write("[generate-favicons] Generating favicon set...\n");
  generateFavicons(assetsDir)
    .then(() => {
      process.stdout.write("[generate-favicons] Done.\n");
    })
    .catch((err) => {
      process.stderr.write(`[generate-favicons] Error: ${String(err)}\n`);
      process.exitCode = 1;
    });
}
