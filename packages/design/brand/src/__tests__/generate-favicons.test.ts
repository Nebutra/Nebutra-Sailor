import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateFavicons } from "../../scripts/generate-favicons";

// vitest runs with cwd = packages/design/brand (the package root)
const brandRoot = resolve(process.cwd());
const brandAssetsDir = join(brandRoot, "assets");

// PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// ICO magic bytes: 00 00 01 00
const ICO_MAGIC = Buffer.from([0x00, 0x00, 0x01, 0x00]);

function hasPngMagic(buf: Buffer): boolean {
  return buf.length >= 8 && buf.subarray(0, 8).equals(PNG_MAGIC);
}

function hasIcoMagic(buf: Buffer): boolean {
  return buf.length >= 4 && buf.subarray(0, 4).equals(ICO_MAGIC);
}

async function expectPngDimensions(path: string, width: number, height: number): Promise<void> {
  const { default: sharpFn } = (await import("sharp")) as unknown as {
    default: (input: string) => import("sharp").Sharp;
  };
  const metadata = await sharpFn(path).metadata();
  expect(metadata.width, `${path} must be ${width}px wide`).toBe(width);
  expect(metadata.height, `${path} must be ${height}px tall`).toBe(height);
}

describe("generateFavicons", { timeout: 30_000 }, () => {
  let tmpAssetsDir: string;

  beforeEach(() => {
    // Create a temp assets dir with a copy of logo-inverse.svg
    tmpAssetsDir = join(tmpdir(), `brand-favicon-test-${Date.now()}`);
    const logoDir = join(tmpAssetsDir, "logo");
    mkdirSync(logoDir, { recursive: true });

    // Copy real logo-inverse.svg into the temp dir
    const realLogoPath = join(brandAssetsDir, "logo/logo-inverse.svg");
    if (existsSync(realLogoPath)) {
      copyFileSync(realLogoPath, join(logoDir, "logo-inverse.svg"));
    }
  });

  afterEach(() => {
    rmSync(tmpAssetsDir, { recursive: true, force: true });
  });

  it("generates android-chrome-192x192.png with PNG magic bytes", async () => {
    await generateFavicons(tmpAssetsDir);

    const pngPath = join(tmpAssetsDir, "favicon/android-chrome-192x192.png");
    expect(existsSync(pngPath), "android-chrome-192x192.png must exist").toBe(true);

    const buf = readFileSync(pngPath);
    expect(buf.length, "android-chrome-192x192.png must be non-empty").toBeGreaterThan(0);
    expect(
      hasPngMagic(buf),
      "android-chrome-192x192.png must start with PNG magic bytes 89 50 4E 47",
    ).toBe(true);
    await expectPngDimensions(pngPath, 192, 192);
  });

  it("generates android-chrome-512x512.png with PNG magic bytes", async () => {
    await generateFavicons(tmpAssetsDir);

    const pngPath = join(tmpAssetsDir, "favicon/android-chrome-512x512.png");
    expect(existsSync(pngPath), "android-chrome-512x512.png must exist").toBe(true);

    const buf = readFileSync(pngPath);
    expect(buf.length, "android-chrome-512x512.png must be non-empty").toBeGreaterThan(0);
    expect(
      hasPngMagic(buf),
      "android-chrome-512x512.png must start with PNG magic bytes 89 50 4E 47",
    ).toBe(true);
    await expectPngDimensions(pngPath, 512, 512);
  });

  it("generates apple-touch-icon.png at 180×180", async () => {
    await generateFavicons(tmpAssetsDir);

    const applePath = join(tmpAssetsDir, "favicon/apple-touch-icon.png");
    expect(existsSync(applePath), "apple-touch-icon.png must exist").toBe(true);

    const buf = readFileSync(applePath);
    expect(buf.length, "apple-touch-icon.png must be non-empty").toBeGreaterThan(0);
    expect(
      hasPngMagic(buf),
      "apple-touch-icon.png must be a valid PNG (magic bytes 89 50 4E 47)",
    ).toBe(true);

    await expectPngDimensions(applePath, 180, 180);
  });

  it("generates favicon.ico with ICO magic bytes and size < 285478 bytes", async () => {
    await generateFavicons(tmpAssetsDir);

    const icoPath = join(tmpAssetsDir, "favicon/favicon.ico");
    expect(existsSync(icoPath), "favicon.ico must exist").toBe(true);

    const buf = readFileSync(icoPath);
    expect(buf.length, "favicon.ico must be non-empty").toBeGreaterThan(0);
    expect(hasIcoMagic(buf), "favicon.ico must start with ICO magic bytes 00 00 01 00").toBe(true);

    // Must be smaller than the original placeholder favicon.ico (285,478 bytes)
    expect(
      buf.length,
      "favicon.ico must be < 285478 bytes (original placeholder was 285478 bytes)",
    ).toBeLessThan(285_478);
  });

  it("generates favicon.svg that starts with <svg", async () => {
    await generateFavicons(tmpAssetsDir);

    const svgPath = join(tmpAssetsDir, "favicon/favicon.svg");
    expect(existsSync(svgPath), "favicon.svg must exist").toBe(true);

    const content = readFileSync(svgPath, "utf-8").trim();
    expect(
      content.startsWith("<svg"),
      "favicon.svg must start with <svg (monochrome logomark SVG)",
    ).toBe(true);
  });

  it("skips gracefully when logo-inverse.svg is missing", async () => {
    // Remove the logo dir entirely
    rmSync(join(tmpAssetsDir, "logo"), { recursive: true, force: true });

    // Should not throw
    await expect(generateFavicons(tmpAssetsDir)).resolves.not.toThrow();
    // Favicon dir may or may not be created, but no crash
  });
});
