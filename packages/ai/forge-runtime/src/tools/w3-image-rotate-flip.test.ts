import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  type ImageRotateFlipResult,
  imageRotateFlipTool,
  normalizeAngle,
  parseHexColor,
  RIGHT_ANGLE_EPSILON,
  rotatedBounds,
  w3ImageRotateFlipTools,
} from "./w3-image-rotate-flip";

/* ── fixtures ──────────────────────────────────────────────────────────── */

/**
 * A deliberately asymmetric greyscale image. Every pixel value is distinct, so
 * a mirrored-but-plausible result (the bug class know-how #3 warns about, which
 * is invisible on symmetric images) cannot pass a pixel comparison here.
 */
async function grey(width: number, height: number, values: number[]): Promise<string> {
  const png = await sharp(Buffer.from(values), { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer();
  return png.toString("base64");
}

/** 4×2, values 1..8 reading left-to-right, top-to-bottom. */
const WIDE = () => grey(4, 2, [1, 2, 3, 4, 5, 6, 7, 8]);
/** 2×2, values 10/20/30/40 — small enough to reason about by hand. */
const TINY = () => grey(2, 2, [10, 20, 30, 40]);

/** First channel of every pixel, row-major — enough to compare geometry. */
async function pixels(base64: string): Promise<number[]> {
  const { data, info } = await sharp(Buffer.from(base64, "base64"))
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out: number[] = [];
  for (let i = 0; i < data.length; i += info.channels) out.push(data[i] as number);
  return out;
}

function run(input: unknown): Promise<ImageRotateFlipResult> {
  const parsed = imageRotateFlipTool.inputSchema.parse(input);
  return imageRotateFlipTool.execute(parsed) as Promise<ImageRotateFlipResult>;
}

/* ── declaration ───────────────────────────────────────────────────────── */

describe("image-rotate-flip · declaration", () => {
  it("declares the Editor-root contract the brief fixes", () => {
    expect(imageRotateFlipTool.id).toBe("image/image-rotate-flip");
    expect(imageRotateFlipTool.slug).toBe("image-rotate-flip");
    expect(imageRotateFlipTool.category).toBe("image");
    expect(imageRotateFlipTool.id).toBe(
      `${imageRotateFlipTool.category}/${imageRotateFlipTool.slug}`,
    );
    expect(imageRotateFlipTool.meterId).toBe("forge.image.image_rotate_flip");
    expect(imageRotateFlipTool.sideEffect).toBe("pure");
    expect(imageRotateFlipTool.roots).toContain("editor");
    expect(imageRotateFlipTool.title.zh).not.toBe(imageRotateFlipTool.title.en);
    expect(imageRotateFlipTool.seoKeywords.zh.length).toBeGreaterThan(0);
    expect(imageRotateFlipTool.seoKeywords.en.length).toBeGreaterThan(0);
    // Engine metadata names the specs implemented, not an imaginary library.
    expect(imageRotateFlipTool.engine.upstream).toContain("DC-008");
    expect(imageRotateFlipTool.engine.upstream).toContain("0x0112");
    expect(w3ImageRotateFlipTools).toEqual([imageRotateFlipTool]);
  });

  it("is deterministic: the same input yields byte-identical output", async () => {
    const imageBase64 = await WIDE();
    const a = await run({ imageBase64, angle: 90 });
    const b = await run({ imageBase64, angle: 90 });
    expect(a.imageBase64).toBe(b.imageBase64);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

/* ── schema ────────────────────────────────────────────────────────────── */

describe("image-rotate-flip · schema", () => {
  it("requires image bytes", () => {
    expect(imageRotateFlipTool.inputSchema.safeParse({}).success).toBe(false);
    expect(imageRotateFlipTool.inputSchema.safeParse({ imageBase64: "" }).success).toBe(false);
  });

  it("bounds the angle to -180..180 and rejects a non-number", () => {
    const bad = [181, -181, Number.NaN, Number.POSITIVE_INFINITY, "90"];
    for (const angle of bad) {
      expect(imageRotateFlipTool.inputSchema.safeParse({ imageBase64: "x", angle }).success).toBe(
        false,
      );
    }
    expect(
      imageRotateFlipTool.inputSchema.safeParse({ imageBase64: "x", angle: 2.3 }).success,
    ).toBe(true);
  });

  it("rejects enum values outside the documented sets", () => {
    for (const patch of [
      { fitMode: "stretch" },
      { order: "whatever" },
      { outputFormat: "bmp" },
      { flipHorizontal: "yes" },
    ]) {
      expect(
        imageRotateFlipTool.inputSchema.safeParse({ imageBase64: "x", ...patch }).success,
      ).toBe(false);
    }
  });

  it("rejects an out-of-range quality and a non-hex background", () => {
    for (const patch of [
      { quality: 0 },
      { quality: 101 },
      { quality: 90.5 },
      { background: "red" },
      { background: "#fff" },
    ]) {
      expect(
        imageRotateFlipTool.inputSchema.safeParse({ imageBase64: "x", ...patch }).success,
      ).toBe(false);
    }
  });

  it("defaults every optional field to the brief's contract", () => {
    const parsed = imageRotateFlipTool.inputSchema.parse({ imageBase64: "x" });
    expect(parsed).toMatchObject({
      angle: 0,
      flipHorizontal: false,
      flipVertical: false,
      fitMode: "expand",
      order: "flip-then-rotate",
      quality: 90,
      background: "#ffffff00",
    });
    expect(parsed.outputFormat).toBeUndefined();
  });

  it("parses #RRGGBB and #RRGGBBAA the same way a fill would", () => {
    expect(parseHexColor("#ff8000")).toEqual({ r: 255, g: 128, b: 0, alpha: 1 });
    expect(parseHexColor("#00000000")).toEqual({ r: 0, g: 0, b: 0, alpha: 0 });
  });
});

/* ── know-how #1: right angles are lossless and dimension-swapping ─────── */

describe("image-rotate-flip · know-how #1 (90° multiples resample nothing)", () => {
  it("swaps width and height on 90° and keeps them on 180°", async () => {
    const imageBase64 = await WIDE();
    const q = await run({ imageBase64, angle: 90 });
    expect([q.inputWidth, q.inputHeight]).toEqual([4, 2]);
    expect([q.width, q.height]).toEqual([2, 4]);
    expect(q.lossless).toBe(true);
    expect(q.fitModeApplied).toBe("n/a");
    expect(q.backgroundApplied).toBe(false);

    const half = await run({ imageBase64, angle: 180 });
    expect([half.width, half.height]).toEqual([4, 2]);
    expect(half.lossless).toBe(true);
  });

  it("rotates clockwise: a 2×2 becomes [C A / D B]", async () => {
    const out = await run({ imageBase64: await TINY(), angle: 90 });
    // input [10 20 / 30 40] → clockwise → [30 10 / 40 20]
    expect(await pixels(out.imageBase64)).toEqual([30, 10, 40, 20]);
  });

  it("returns the original pixels after four 90° turns — no interpolation anywhere", async () => {
    const original = await TINY();
    let current = original;
    for (let i = 0; i < 4; i += 1) {
      current = (await run({ imageBase64: current, angle: 90 })).imageBase64;
    }
    expect(await pixels(current)).toEqual(await pixels(original));
  });

  it("snaps an angle within the epsilon onto the exact quarter turn", async () => {
    const imageBase64 = await WIDE();
    const snapped = await run({ imageBase64, angle: 90 - RIGHT_ANGLE_EPSILON / 2 });
    expect(snapped.angleApplied).toBe(90);
    expect(snapped.snappedToRightAngle).toBe(true);
    expect(snapped.lossless).toBe(true);
    expect([snapped.width, snapped.height]).toEqual([2, 4]);

    const notSnapped = await run({ imageBase64, angle: 89.5 });
    expect(notSnapped.angleApplied).toBe(89.5);
    expect(notSnapped.snappedToRightAngle).toBe(false);
    expect(notSnapped.lossless).toBe(false);
  });

  it("normalizes a negative angle onto 0..360 without snapping a real one", () => {
    expect(normalizeAngle(-90)).toEqual({ applied: 270, snapped: false, rightAngle: true });
    expect(normalizeAngle(0)).toEqual({ applied: 0, snapped: false, rightAngle: true });
    expect(normalizeAngle(180)).toEqual({ applied: 180, snapped: false, rightAngle: true });
    expect(normalizeAngle(37)).toEqual({ applied: 37, snapped: false, rightAngle: false });
    expect(normalizeAngle(-2.3).applied).toBeCloseTo(357.7, 6);
  });
});

/* ── know-how #2: a non-90° angle forces a canvas decision ─────────────── */

describe("image-rotate-flip · know-how #2 (fit mode for non-90° angles)", () => {
  it("expand grows the canvas to the rotated bounding box and loses no content", async () => {
    const imageBase64 = await grey(40, 20, new Array(800).fill(120));
    const out = await run({ imageBase64, angle: 37, fitMode: "expand" });
    const bounds = rotatedBounds(40, 20, 37);
    expect([out.width, out.height]).toEqual([bounds.width, bounds.height]);
    expect(out.width).toBeGreaterThan(40);
    expect(out.height).toBeGreaterThan(20);
    expect(out.lossless).toBe(false);
    expect(out.fitModeApplied).toBe("expand");
    expect(out.backgroundApplied).toBe(true);
  });

  it("crop keeps the input dimensions exactly", async () => {
    const out = await run({ imageBase64: await WIDE(), angle: 37, fitMode: "crop" });
    expect([out.width, out.height]).toEqual([4, 2]);
    expect(out.fitModeApplied).toBe("crop");
  });

  it("crop still keeps the input dimensions when the bounding box is smaller on an axis", async () => {
    // A long thin strip near 90° has a bounding box narrower than the input, so
    // a naive centre-extract would fail; the deficit is padded first.
    const strip = await grey(
      12,
      1,
      Array.from({ length: 12 }, (_, i) => i * 20),
    );
    const out = await run({ imageBase64: strip, angle: 80, fitMode: "crop" });
    expect([out.width, out.height]).toEqual([12, 1]);
  });

  it("fit scales the rotated content to stay inside the input box", async () => {
    const out = await run({
      imageBase64: await grey(40, 20, new Array(800).fill(120)),
      angle: 37,
      fitMode: "fit",
    });
    expect(out.width).toBeLessThanOrEqual(40);
    expect(out.height).toBeLessThanOrEqual(20);
    expect(out.fitModeApplied).toBe("fit");
  });

  it("ignores fitMode entirely for a multiple of 90 — the choice cannot arise", async () => {
    const imageBase64 = await WIDE();
    const expand = await run({ imageBase64, angle: 90, fitMode: "expand" });
    const crop = await run({ imageBase64, angle: 90, fitMode: "crop" });
    const fit = await run({ imageBase64, angle: 90, fitMode: "fit" });
    expect(crop.imageBase64).toBe(expand.imageBase64);
    expect(fit.imageBase64).toBe(expand.imageBase64);
    for (const r of [expand, crop, fit]) expect(r.fitModeApplied).toBe("n/a");
  });

  it("computes the rotated bounding box from the rectangle, not from a guess", () => {
    expect(rotatedBounds(4, 2, 90)).toEqual({ width: 2, height: 4 });
    expect(rotatedBounds(4, 2, 180)).toEqual({ width: 4, height: 2 });
    expect(rotatedBounds(10, 10, 45)).toEqual({ width: 14, height: 14 });
  });
});

/* ── know-how #3: flip and rotate do not commute ───────────────────────── */

describe("image-rotate-flip · know-how #3 (flip ∘ rotate is order-dependent)", () => {
  it("produces different pixels for flip-then-rotate and rotate-then-flip", async () => {
    const imageBase64 = await TINY();
    const first = await run({
      imageBase64,
      angle: 90,
      flipHorizontal: true,
      order: "flip-then-rotate",
    });
    const second = await run({
      imageBase64,
      angle: 90,
      flipHorizontal: true,
      order: "rotate-then-flip",
    });
    // [10 20 / 30 40]: mirror first → [20 10 / 40 30] → cw → [40 20 / 30 10]
    expect(await pixels(first.imageBase64)).toEqual([40, 20, 30, 10]);
    // rotate first → [30 10 / 40 20] → mirror → [10 30 / 20 40]
    expect(await pixels(second.imageBase64)).toEqual([10, 30, 20, 40]);
    expect(first.appliedOrder).toBe("flip-then-rotate");
    expect(second.appliedOrder).toBe("rotate-then-flip");
  });

  it("honours the affine identity: rotate-then-flipH equals flipV-then-rotate", async () => {
    // Both compose to the transpose. This is the check that catches an engine
    // applying its own fixed internal order instead of the requested one.
    const imageBase64 = await TINY();
    const a = await run({
      imageBase64,
      angle: 90,
      flipHorizontal: true,
      order: "rotate-then-flip",
    });
    const b = await run({
      imageBase64,
      angle: 90,
      flipVertical: true,
      order: "flip-then-rotate",
    });
    expect(await pixels(a.imageBase64)).toEqual(await pixels(b.imageBase64));
    expect(await pixels(a.imageBase64)).toEqual([10, 30, 20, 40]);
  });

  it("mirrors without rotating when the angle is 0", async () => {
    const imageBase64 = await TINY();
    const h = await run({ imageBase64, flipHorizontal: true });
    const v = await run({ imageBase64, flipVertical: true });
    expect(await pixels(h.imageBase64)).toEqual([20, 10, 40, 30]);
    expect(await pixels(v.imageBase64)).toEqual([30, 40, 10, 20]);
    // A mirror is a pure index permutation: still lossless, still no new canvas.
    expect(h.lossless).toBe(true);
    expect(h.backgroundApplied).toBe(false);
  });
});

/* ── know-how #4: EXIF orientation is resolved before the requested turn ── */

describe("image-rotate-flip · know-how #4 (EXIF Orientation, CIPA DC-008 tag 0x0112)", () => {
  async function orientedJpeg(orientation: number): Promise<string> {
    const buf = await sharp(Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]), {
      raw: { width: 4, height: 2, channels: 1 },
    })
      .withMetadata({ orientation })
      .jpeg({ quality: 100 })
      .toBuffer();
    return buf.toString("base64");
  }

  it("bakes a non-default orientation in before applying the requested angle", async () => {
    // Orientation 6 means "rotate 90° CW to display": the stored grid is 4×2,
    // what the user sees is 2×4, and that is what the angle is measured against.
    const out = await run({ imageBase64: await orientedJpeg(6), angle: 0 });
    expect(out.exifOrientation).toBe(6);
    expect(out.exifOrientationHandled).toBe(true);
    expect([out.inputWidth, out.inputHeight]).toEqual([2, 4]);
    expect([out.width, out.height]).toEqual([2, 4]);
  });

  it("compounds correctly: EXIF 6 plus a requested 90° is a half turn from the stored grid", async () => {
    const out = await run({ imageBase64: await orientedJpeg(6), angle: 90 });
    // 2×4 as displayed, rotated another quarter turn → 4×2.
    expect([out.width, out.height]).toEqual([4, 2]);
    expect(out.exifOrientationHandled).toBe(true);
  });

  it("reports orientation 1 as untouched rather than claiming credit", async () => {
    const out = await run({ imageBase64: await WIDE(), angle: 90 });
    expect(out.exifOrientation).toBe(1);
    expect(out.exifOrientationHandled).toBe(false);
  });

  it("leaves no stale orientation tag on the output", async () => {
    const out = await run({ imageBase64: await orientedJpeg(6), angle: 90 });
    const meta = await sharp(Buffer.from(out.imageBase64, "base64")).metadata();
    expect(meta.orientation ?? 1).toBe(1);
  });
});

/* ── know-how #5: animated input is refused, not silently flattened ────── */

describe("image-rotate-flip · know-how #5 (animated formats)", () => {
  /** A hand-built 2-frame 1×1 GIF89a: header, GCT, two GCE+frame blocks, trailer. */
  const ANIMATED_GIF = Buffer.from([
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0, 0xf0, 0, 0, 0, 0, 0, 255, 255, 255, 0x21, 0xf9,
    0x04, 0x00, 0x0a, 0x00, 0x00, 0x00, 0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0x02, 0x02, 0x44, 0x01,
    0x00, 0x21, 0xf9, 0x04, 0x00, 0x0a, 0x00, 0x00, 0x00, 0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0x02,
    0x02, 0x4c, 0x01, 0x00, 0x3b,
  ]);

  it("the fixture really is animated (guards the test itself)", async () => {
    expect((await sharp(ANIMATED_GIF).metadata()).pages).toBe(2);
  });

  it("refuses a multi-frame image instead of transforming frame one", async () => {
    await expect(run({ imageBase64: ANIMATED_GIF.toString("base64"), angle: 90 })).rejects.toThrow(
      /Animated images/,
    );
  });

  it("accepts a single-frame GIF", async () => {
    const still = await sharp(Buffer.from([9, 9, 9, 9]), {
      raw: { width: 2, height: 2, channels: 1 },
    })
      .gif()
      .toBuffer();
    const out = await run({ imageBase64: still.toString("base64"), angle: 90 });
    expect(out.format).toBe("gif");
  });
});

/* ── know-how #6: lossless geometry is not a lossless file ─────────────── */

describe("image-rotate-flip · know-how #6 (codec loss is a separate claim)", () => {
  it("separates the geometry claim from the codec claim on a JPEG quarter turn", async () => {
    const out = await run({ imageBase64: await WIDE(), angle: 90, outputFormat: "jpeg" });
    expect(out.lossless).toBe(true);
    expect(out.reencodeLossy).toBe(true);
    expect(out.contentType).toBe("image/jpeg");
  });

  it("reports no codec loss for PNG", async () => {
    const out = await run({ imageBase64: await WIDE(), angle: 90, outputFormat: "png" });
    expect(out.lossless).toBe(true);
    expect(out.reencodeLossy).toBe(false);
  });

  it("defaults the output format to the input format", async () => {
    const out = await run({ imageBase64: await WIDE(), angle: 90 });
    expect(out.format).toBe("png");
    expect(out.contentType).toBe("image/png");
    expect(out.bytes).toBeGreaterThan(0);
  });
});

/* ── rejections ────────────────────────────────────────────────────────── */

describe("image-rotate-flip · rejections", () => {
  it("rejects bytes that are not an image", async () => {
    await expect(
      run({ imageBase64: Buffer.from("not an image").toString("base64") }),
    ).rejects.toThrow(/Could not read this file as an image|Unsupported input format/);
  });

  it("rejects an empty payload", async () => {
    await expect(run({ imageBase64: "=" })).rejects.toThrow(/zero bytes/);
  });

  it("rejects a vector input rather than rasterising something unasked", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="4" height="2"/>');
    await expect(run({ imageBase64: svg.toString("base64") })).rejects.toThrow(
      /Unsupported input format/,
    );
  });
});
