#!/usr/bin/env tsx

/**
 * Generate favicon set from logo-inverse.svg using @resvg/resvg-wasm + sharp.
 *
 * Produces (under assetsDir/favicon/):
 *   favicon.svg          — monochrome logomark SVG (recolored for browser tab)
 *   favicon.ico          — multi-size ICO (16 + 32 + 48 px, from PNG via manual ICO write)
 *   apple-touch-icon.png — 180×180 rounded PNG via sharp
 *   android-chrome-192x192.png — 192×192 PNG via resvg-wasm
 *   android-chrome-512x512.png — 512×512 PNG via resvg-wasm
 *
 * Wordmark geometry CANNOT be auto-generated from a name — recolor only.
 * Operators supply replacement wordmark SVGs via brand.config/assets/logo/ →
 * copied by copyCustomAssets.
 *
 * Called from scripts/brand-apply.ts main() after copyCustomAssets().
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
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

/**
 * Render an SVG string to a PNG Buffer at the given width using @resvg/resvg-wasm.
 * Returns null on failure (caller falls back gracefully).
 */
async function svgToPng(svgStr: string, width: number): Promise<Buffer | null> {
  try {
    // resvg-wasm is a named import from the package
    const wasmPkg = await import("@resvg/resvg-wasm");
    const { Resvg, initWasm } = wasmPkg;

    // Resolve the wasm file — the package exports ./index_bg.wasm as a subpath.
    // We use createRequire to get the package directory without relying on
    // the unexported ./package.json subpath.
    const require = createRequire(import.meta.url);
    // Resolve the main entry to find the package location.
    const mainEntry = require.resolve("@resvg/resvg-wasm");
    const wasmPath = join(dirname(mainEntry), "index_bg.wasm");

    if (!existsSync(wasmPath)) {
      warn(`resvg-wasm WASM not found at ${wasmPath} — skipping PNG generation`);
      return null;
    }

    // initWasm is idempotent across multiple calls in the same process.
    try {
      const wasmBuf = readFileSync(wasmPath);
      await initWasm(wasmBuf);
    } catch (_initErr) {
      // Already initialised — safe to ignore "already been initialized" errors.
    }

    const resvg = new Resvg(svgStr, {
      fitTo: { mode: "width", value: width },
    });
    const rendered = resvg.render();
    const pngBytes = rendered.asPng();
    const png = Buffer.from(pngBytes);

    const { default: sharpFn } = (await import("sharp")) as unknown as {
      default: (input: Buffer) => import("sharp").Sharp;
    };

    return await sharpFn(png)
      .resize(width, width, {
        background: { alpha: 0, b: 0, g: 0, r: 0 },
        fit: "contain",
      })
      .png()
      .toBuffer();
  } catch (err) {
    warn(`SVG→PNG failed (width=${width}): ${String(err)}`);
    return null;
  }
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

/**
 * Generate the favicon set from the brand logo SVG.
 *
 * @param assetsDir  Absolute path to packages/design/brand/assets
 */
export async function generateFavicons(assetsDir: string): Promise<void> {
  const faviconDir = join(assetsDir, "favicon");
  const logoInversePath = join(assetsDir, "logo", "logo-inverse.svg");

  if (!existsSync(logoInversePath)) {
    warn(`logo-inverse.svg not found at ${logoInversePath} — skipping favicon generation`);
    return;
  }

  mkdirSync(faviconDir, { recursive: true });

  const svgSource = readFileSync(logoInversePath, "utf-8");

  // ── 1. favicon.svg — monochrome logomark for browser tab ──────────────────
  // The logomark is already white-on-transparent; write a minimal monochrome
  // copy that adds a black background for light-theme browser tabs.
  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 535.71 500" width="32" height="32"><rect width="535.71" height="500" fill="#020617" rx="80"/>${svgSource
    .replace(/<\?xml[^>]*\?>/g, "")
    .replace(/<!-- [^>]* -->/g, "")
    .replace(/<svg[^>]*>/g, "")
    .replace(/<\/svg>/g, "")
    .trim()}</svg>`;
  writeFileSync(join(faviconDir, "favicon.svg"), faviconSvg, "utf-8");
  log("favicon.svg");

  // ── 2. android-chrome-192x192.png & android-chrome-512x512.png ────────────
  const png192 = await svgToPng(svgSource, 192);
  const png512 = await svgToPng(svgSource, 512);

  if (png192) {
    writeFileSync(join(faviconDir, "android-chrome-192x192.png"), png192);
    log("android-chrome-192x192.png");
  } else {
    warn("android-chrome-192x192.png skipped — resvg-wasm unavailable; keeping existing file");
    // Leave existing file in place — same pattern as favicon.ico fallback.
    // Writing Buffer.alloc(0) would produce a corrupt zero-byte PNG that breaks
    // Next.js manifest, PWA install, and Lighthouse audits.
  }

  if (png512) {
    writeFileSync(join(faviconDir, "android-chrome-512x512.png"), png512);
    log("android-chrome-512x512.png");
  } else {
    warn("android-chrome-512x512.png skipped — resvg-wasm unavailable; keeping existing file");
    // Leave existing file in place — same pattern as favicon.ico fallback.
  }

  // ── 3. apple-touch-icon.png — 180×180 rounded corners via sharp ───────────
  const pngForApple = png512 ?? png192;
  if (pngForApple) {
    try {
      // sharp is a devDep of @nebutra/brand — imported dynamically to avoid
      // bundling in the dist (this script is only run at brand:apply time).
      // sharp uses `export = sharp` (CJS-style). With esModuleInterop + bundler
      // resolution the default import works correctly at runtime.
      const { default: sharpFn } = (await import("sharp")) as unknown as {
        default: (input: Buffer) => import("sharp").Sharp;
      };

      // Resize to 180×180 with rounded corners
      const size = 180;
      const cornerRadius = 40;
      const roundedSvgMask = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${cornerRadius}" ry="${cornerRadius}" fill="white"/></svg>`;

      const appleBuffer = await sharpFn(pngForApple)
        .resize(size, size)
        .composite([{ input: Buffer.from(roundedSvgMask), blend: "dest-in" }])
        .png()
        .toBuffer();

      writeFileSync(join(faviconDir, "apple-touch-icon.png"), appleBuffer);
      log("apple-touch-icon.png (rounded 180×180 via sharp)");
    } catch (_sharpErr) {
      // Fallback: flat PNG without rounded corners
      warn("sharp failed — falling back to flat PNG for apple-touch-icon");
      try {
        const { default: sharpFn2 } = (await import("sharp")) as unknown as {
          default: (input: Buffer) => import("sharp").Sharp;
        };
        const appleBuffer = await sharpFn2(pngForApple).resize(180, 180).png().toBuffer();
        writeFileSync(join(faviconDir, "apple-touch-icon.png"), appleBuffer);
        log("apple-touch-icon.png (flat 180×180)");
      } catch (_fallbackErr) {
        warn("apple-touch-icon.png skipped — sharp unavailable");
        writeFileSync(join(faviconDir, "apple-touch-icon.png"), pngForApple);
      }
    }
  } else {
    warn("apple-touch-icon.png skipped — no PNG source available; keeping existing file");
    // Leave existing file in place — writing Buffer.alloc(0) would produce a
    // corrupt zero-byte PNG that breaks PWA install and Lighthouse audits.
  }

  // ── 4. favicon.ico — 16+32+48 multi-size ICO ─────────────────────────────
  const png16 = await svgToPng(svgSource, 16);
  const png32 = await svgToPng(svgSource, 32);
  const png48 = await svgToPng(svgSource, 48);

  if (png16 && png32 && png48) {
    const icoBuffer = buildIco([
      { png: png16, size: 16 },
      { png: png32, size: 32 },
      { png: png48, size: 48 },
    ]);
    writeFileSync(join(faviconDir, "favicon.ico"), icoBuffer);
    log("favicon.ico (16+32+48 multi-size)");
  } else if (png32) {
    // Partial fallback: single-size ICO
    const icoBuffer = buildIco([{ png: png32, size: 32 }]);
    writeFileSync(join(faviconDir, "favicon.ico"), icoBuffer);
    warn("favicon.ico generated as single-size (32px only) — some sizes unavailable");
  } else {
    warn("favicon.ico skipped — resvg-wasm unavailable; keeping existing file");
    // Leave existing favicon.ico in place (not writing an empty file)
  }
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
