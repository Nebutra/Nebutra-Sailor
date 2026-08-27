import { describe, expect, it } from "vitest";
import {
  countPhotoshopFields,
  countXmpProperties,
  detectFormat,
  type ExifStripResult,
  exifStripTool,
  MAX_BASE64_CHARS,
  MAX_INPUT_BYTES,
  stripImageMetadata,
  w3ExifStripTools,
} from "./w3-exif-strip";

/* ── fixtures: every byte is built here, so what a case asserts is visible ─ */

function u16be(n: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16BE(n, 0);
  return b;
}

interface TiffEntry {
  tag: number;
  type: number;
  count: number;
  /** SHORT and LONG values are inline; anything else is a decoy offset. */
  value: number;
}

/**
 * Little-endian TIFF, to exercise the byte order the tool does *not* write.
 * IFD0 → optional GPS sub-IFD → optional IFD1 + thumbnail, in that order.
 */
function tiffLE(opts: {
  ifd0: TiffEntry[];
  gps?: TiffEntry[];
  ifd1?: TiffEntry[];
  thumbnail?: Buffer;
}): Buffer {
  const ifd0 = [...opts.ifd0];
  const gpsCount = opts.gps ? opts.gps.length : 0;
  const ifd0Count = ifd0.length + (opts.gps ? 1 : 0);
  const ifd0At = 8;
  const ifd0Size = 2 + ifd0Count * 12 + 4;
  const gpsAt = ifd0At + ifd0Size;
  const gpsSize = opts.gps ? 2 + gpsCount * 12 + 4 : 0;
  const ifd1At = gpsAt + gpsSize;

  const thumb = opts.thumbnail ?? null;
  const extraIfd1 = opts.ifd1 ?? [];
  const ifd1: TiffEntry[] = thumb
    ? [
        ...extraIfd1,
        { tag: 0x0103, type: 3, count: 1, value: 6 },
        { tag: 0x0201, type: 4, count: 1, value: 0 },
        { tag: 0x0202, type: 4, count: 1, value: thumb.length },
      ]
    : extraIfd1;
  const ifd1Size = ifd1.length > 0 ? 2 + ifd1.length * 12 + 4 : 0;
  const thumbAt = ifd1At + ifd1Size;
  const total = thumbAt + (thumb ? thumb.length : 0);
  const out = Buffer.alloc(total);

  out.write("II", 0, "ascii");
  out.writeUInt16LE(42, 2);
  out.writeUInt32LE(ifd0At, 4);

  const writeEntries = (at: number, entries: TiffEntry[], next: number) => {
    out.writeUInt16LE(entries.length, at);
    entries.forEach((e, k) => {
      const p = at + 2 + k * 12;
      out.writeUInt16LE(e.tag, p);
      out.writeUInt16LE(e.type, p + 2);
      out.writeUInt32LE(e.count, p + 4);
      if (e.type === 3) out.writeUInt16LE(e.value, p + 8);
      else out.writeUInt32LE(e.value, p + 8);
    });
    out.writeUInt32LE(next, at + 2 + entries.length * 12);
  };

  const ifd0Entries = opts.gps ? [...ifd0, { tag: 0x8825, type: 4, count: 1, value: gpsAt }] : ifd0;
  writeEntries(ifd0At, ifd0Entries, ifd1.length > 0 ? ifd1At : 0);
  if (opts.gps) writeEntries(gpsAt, opts.gps, 0);
  if (ifd1.length > 0) {
    const withOffset = ifd1.map((e) => (e.tag === 0x0201 ? { ...e, value: thumbAt } : e));
    writeEntries(ifd1At, withOffset, 0);
  }
  if (thumb) thumb.copy(out, thumbAt);
  return out;
}

function jpegSegment(marker: number, payload: Buffer): Buffer {
  return Buffer.concat([Buffer.from([0xff, marker]), u16be(2 + payload.length), payload]);
}

/** Distinctive entropy bytes, so "the pixels were not touched" is checkable. */
const SCAN_BYTES = Buffer.from([0x9a, 0x37, 0xc1, 0x05, 0x7e, 0xff, 0x00, 0x42]);

function jpegFile(segments: Buffer[]): Buffer {
  const sos = Buffer.concat([
    Buffer.from([0xff, 0xda]),
    u16be(8),
    Buffer.from([0x01, 0x01, 0x00, 0x00, 0x3f, 0x00]),
    SCAN_BYTES,
    Buffer.from([0xff, 0xd9]),
  ]);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), ...segments, sos]);
}

const XMP_XML =
  '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"' +
  ' xmlns:dc="http://purl.org/dc/elements/1.1/"><rdf:Description rdf:about=""' +
  ' dc:creator="Ada" dc:title="Roof"><photoshop:City>Oslo</photoshop:City></rdf:Description></rdf:RDF></x:xmpmeta>';

/** One 8BIM resource holding the IPTC-NAA block with two IIM datasets. */
function photoshopPayload(): Buffer {
  const datasets = Buffer.concat([
    Buffer.from([0x1c, 0x02, 0x78]),
    u16be(4),
    Buffer.from("Oslo", "ascii"),
    Buffer.from([0x1c, 0x02, 0x19]),
    u16be(3),
    Buffer.from("sky", "ascii"),
  ]);
  const size = Buffer.alloc(4);
  size.writeUInt32BE(datasets.length, 0);
  const pad = datasets.length % 2 === 1 ? Buffer.from([0]) : Buffer.alloc(0);
  return Buffer.concat([
    Buffer.from("8BIM", "ascii"),
    u16be(0x0404),
    Buffer.from([0x00, 0x00]),
    size,
    datasets,
    pad,
  ]);
}

const THUMBNAIL = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0xaa, 0xbb, 0xcc, 0xff, 0xd9]);

/** IFD0(Make, Orientation) + GPS pointer → GPS(2) + IFD1(1 decoy + 3 thumbnail). */
function richExifTiff(orientation: number): Buffer {
  return tiffLE({
    ifd0: [
      { tag: 0x010f, type: 2, count: 4, value: 0x00504f53 },
      { tag: 0x0112, type: 3, count: 1, value: orientation },
    ],
    gps: [
      { tag: 0x0002, type: 5, count: 3, value: 0 },
      { tag: 0x0004, type: 5, count: 3, value: 0 },
    ],
    ifd1: [{ tag: 0x011a, type: 4, count: 1, value: 72 }],
    thumbnail: THUMBNAIL,
  });
}

const ICC_PAYLOAD = Buffer.concat([
  Buffer.from("ICC_PROFILE\0", "binary"),
  Buffer.from([0x01, 0x01]),
  Buffer.from("fake-icc-profile-bytes", "ascii"),
]);
const DQT = jpegSegment(0xdb, Buffer.concat([Buffer.from([0x00]), Buffer.alloc(64, 0x10)]));
const APP0_JFIF = jpegSegment(
  0xe0,
  Buffer.concat([Buffer.from("JFIF\0", "binary"), Buffer.from([1, 1, 0, 0, 1, 0, 1, 0, 0])]),
);

function richJpeg(orientation = 6): Buffer {
  return jpegFile([
    APP0_JFIF,
    jpegSegment(
      0xe1,
      Buffer.concat([Buffer.from("Exif\0\0", "binary"), richExifTiff(orientation)]),
    ),
    jpegSegment(
      0xe1,
      Buffer.concat([
        Buffer.from("http://ns.adobe.com/xap/1.0/\0", "binary"),
        Buffer.from(XMP_XML),
      ]),
    ),
    jpegSegment(
      0xed,
      Buffer.concat([Buffer.from("Photoshop 3.0\0", "binary"), photoshopPayload()]),
    ),
    jpegSegment(0xe2, ICC_PAYLOAD),
    jpegSegment(0xee, Buffer.concat([Buffer.from("Adobe", "ascii"), Buffer.alloc(7)])),
    jpegSegment(0xe3, Buffer.from("Meta\0\0vendor-junk", "binary")),
    jpegSegment(0xfe, Buffer.from("shot at home", "ascii")),
    DQT,
  ]);
}

/* PNG — an independent, table-free CRC-32 so the tool's table is not its own judge. */
function crc32Slow(bytes: Buffer): number {
  let c = 0xffffffff;
  for (const b of bytes) {
    c ^= b;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunkOf(type: string, data: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32Slow(Buffer.concat([Buffer.from(type, "ascii"), data])), 0);
  return Buffer.concat([head, data, crc]);
}

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const IHDR = pngChunkOf("IHDR", Buffer.from([0, 0, 0, 2, 0, 0, 0, 2, 8, 6, 0, 0, 0]));
const IDAT = pngChunkOf("IDAT", Buffer.from([0x78, 0x9c, 0x01, 0x02, 0x03, 0x04]));
const IEND = pngChunkOf("IEND", Buffer.alloc(0));

function pngFile(middle: Buffer[]): Buffer {
  return Buffer.concat([PNG_SIG, IHDR, ...middle, IDAT, IEND]);
}

function itxtXmp(): Buffer {
  return Buffer.concat([
    Buffer.from("XML:com.adobe.xmp\0", "binary"),
    Buffer.from([0x00, 0x00]),
    Buffer.from("\0\0", "binary"),
    Buffer.from(XMP_XML),
  ]);
}

function richPng(orientation = 8): Buffer {
  const exifTiff = tiffLE({
    ifd0: [{ tag: 0x0112, type: 3, count: 1, value: orientation }],
    gps: [
      { tag: 0x0002, type: 5, count: 3, value: 0 },
      { tag: 0x0004, type: 5, count: 3, value: 0 },
    ],
  });
  return pngFile([
    pngChunkOf("iCCP", Buffer.from("p\0\0icc", "binary")),
    pngChunkOf("eXIf", exifTiff),
    pngChunkOf("tEXt", Buffer.from("parameters\0a cat, seed 42", "binary")),
    pngChunkOf("iTXt", itxtXmp()),
    pngChunkOf("tIME", Buffer.from([0x07, 0xe6, 0x07, 0x1e, 0x0c, 0x00, 0x00])),
  ]);
}

/* WebP */
function riffChunkOf(fourcc: string, data: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.write(fourcc, 0, "ascii");
  head.writeUInt32LE(data.length, 4);
  const pad = data.length % 2 === 1 ? Buffer.from([0]) : Buffer.alloc(0);
  return Buffer.concat([head, data, pad]);
}

function webpFile(chunks: Buffer[]): Buffer {
  const body = Buffer.concat(chunks);
  const head = Buffer.alloc(12);
  head.write("RIFF", 0, "ascii");
  head.writeUInt32LE(4 + body.length, 4);
  head.write("WEBP", 8, "ascii");
  return Buffer.concat([head, body]);
}

function vp8x(flags: number): Buffer {
  const data = Buffer.alloc(10);
  data.writeUInt8(flags, 0);
  data.writeUIntLE(15, 4, 3);
  data.writeUIntLE(9, 7, 3);
  return riffChunkOf("VP8X", data);
}

const VP8_DATA = riffChunkOf("VP8 ", Buffer.from([0x10, 0x20, 0x30, 0x40, 0x50]));

function richWebp(orientation = 3): Buffer {
  const exifTiff = tiffLE({
    ifd0: [{ tag: 0x0112, type: 3, count: 1, value: orientation }],
    gps: [
      { tag: 0x0002, type: 5, count: 3, value: 0 },
      { tag: 0x0004, type: 5, count: 3, value: 0 },
    ],
  });
  return webpFile([
    vp8x(0x20 | 0x08 | 0x04),
    riffChunkOf("ICCP", Buffer.from("icc-bytes", "ascii")),
    VP8_DATA,
    riffChunkOf("EXIF", exifTiff),
    riffChunkOf("XMP ", Buffer.from(XMP_XML)),
  ]);
}

/* ── helpers ───────────────────────────────────────────────────────────── */

function run(input: unknown): ExifStripResult {
  const parsed = exifStripTool.inputSchema.parse(input);
  return exifStripTool.execute(parsed) as ExifStripResult;
}

function strip(bytes: Buffer, keepThumbnail = false): ExifStripResult {
  return run({ imageBase64: bytes.toString("base64"), keepThumbnail });
}

function outBytes(result: ExifStripResult): Buffer {
  return Buffer.from(result.imageBase64, "base64");
}

function failure(fn: () => unknown): { code: string; message: string } {
  try {
    fn();
  } catch (err) {
    const e = err as { code?: string; message: string };
    return { code: e.code ?? "", message: e.message };
  }
  throw new Error("expected the call to fail, but it returned a result");
}

/* ── declaration ───────────────────────────────────────────────────────── */

describe("exif-strip · declaration", () => {
  it("declares the Editor-root contract the brief fixes", () => {
    expect(exifStripTool.id).toBe("image/exif-strip");
    expect(exifStripTool.slug).toBe("exif-strip");
    expect(exifStripTool.category).toBe("image");
    expect(exifStripTool.id).toBe(`${exifStripTool.category}/${exifStripTool.slug}`);
    expect(exifStripTool.meterId).toBe("forge.image.exif_strip");
    expect(exifStripTool.sideEffect).toBe("pure");
    expect(exifStripTool.tier).toBe("core");
    expect(exifStripTool.roots).toContain("editor");
    expect(exifStripTool.title.zh).not.toBe(exifStripTool.title.en);
    expect(exifStripTool.description.zh).not.toBe(exifStripTool.description.en);
    expect(exifStripTool.seoKeywords.zh.length).toBeGreaterThan(0);
    expect(exifStripTool.seoKeywords.en).toContain("remove exif data from photo online");
    expect(w3ExifStripTools).toEqual([exifStripTool]);
  });

  it("names the specs implemented, not an imaginary library", () => {
    const upstream = exifStripTool.engine.upstream;
    expect(upstream).toContain("Exif 2.32");
    expect(upstream).toContain("TIFF 6.0");
    expect(upstream).toContain("10918-1");
    expect(upstream).toContain("15948");
    expect(upstream).toContain("RFC 9649");
  });

  it("is deterministic: the same bytes yield a byte-identical result", () => {
    const bytes = richJpeg();
    expect(JSON.stringify(strip(bytes))).toBe(JSON.stringify(strip(bytes)));
  });
});

/* ── schema ────────────────────────────────────────────────────────────── */

describe("exif-strip · schema", () => {
  it("rejects a missing, empty or non-string image", () => {
    expect(exifStripTool.inputSchema.safeParse({}).success).toBe(false);
    expect(exifStripTool.inputSchema.safeParse({ imageBase64: "" }).success).toBe(false);
    expect(exifStripTool.inputSchema.safeParse({ imageBase64: 42 }).success).toBe(false);
  });

  it("rejects a non-boolean keepThumbnail rather than coercing it", () => {
    expect(
      exifStripTool.inputSchema.safeParse({ imageBase64: "aGk=", keepThumbnail: "yes" }).success,
    ).toBe(false);
  });

  it("defaults keepThumbnail to false — the thumbnail is a leak, not a feature", () => {
    const parsed = exifStripTool.inputSchema.parse({ imageBase64: "aGk=" }) as {
      keepThumbnail: boolean;
    };
    expect(parsed.keepThumbnail).toBe(false);
  });

  it("caps the transported payload well above the 10 MB decoded ceiling", () => {
    expect(MAX_BASE64_CHARS).toBeGreaterThan((MAX_INPUT_BYTES * 4) / 3);
    const tooBig = "A".repeat(MAX_BASE64_CHARS + 1);
    expect(exifStripTool.inputSchema.safeParse({ imageBase64: tooBig }).success).toBe(false);
  });
});

/* ── rejections (§9.6 error codes) ─────────────────────────────────────── */

describe("exif-strip · rejections", () => {
  it("rejects a format outside JPEG/PNG/WebP with unsupported_format", () => {
    const gif = Buffer.concat([Buffer.from("GIF89a", "ascii"), Buffer.alloc(32)]);
    expect(failure(() => strip(gif)).code).toBe("unsupported_format");
  });

  it("rejects a file over the stated ceiling with file_too_large, before parsing", () => {
    const huge = Buffer.alloc(MAX_INPUT_BYTES + 1);
    huge.writeUInt8(0xff, 0);
    huge.writeUInt8(0xd8, 1);
    huge.writeUInt8(0xff, 2);
    expect(failure(() => strip(huge)).code).toBe("file_too_large");
  });

  it("rejects a JPEG with an impossible segment length as decode_failed", () => {
    const broken = Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff, 0x00]);
    expect(failure(() => strip(broken)).code).toBe("decode_failed");
  });

  it("rejects a JPEG with no start-of-scan as decode_failed", () => {
    const noScan = Buffer.concat([Buffer.from([0xff, 0xd8]), APP0_JFIF]);
    expect(failure(() => strip(noScan)).code).toBe("decode_failed");
  });

  it("rejects a truncated PNG chunk and a PNG with no IEND as decode_failed", () => {
    const truncated = Buffer.concat([PNG_SIG, IHDR.subarray(0, 10)]);
    expect(failure(() => strip(truncated)).code).toBe("decode_failed");
    const noEnd = Buffer.concat([PNG_SIG, IHDR, IDAT]);
    expect(failure(() => strip(noEnd)).code).toBe("decode_failed");
  });

  it("rejects a PNG that does not open with IHDR", () => {
    const wrongFirst = Buffer.concat([PNG_SIG, IDAT, IHDR, IEND]);
    expect(failure(() => strip(wrongFirst)).code).toBe("decode_failed");
  });

  it("rejects a truncated WebP chunk as decode_failed", () => {
    const body = riffChunkOf("VP8 ", Buffer.from([1, 2, 3, 4]));
    body.writeUInt32LE(0x0000ffff, 4);
    expect(failure(() => strip(webpFile([body]))).code).toBe("decode_failed");
  });

  it("rejects zero decoded bytes", () => {
    expect(failure(() => run({ imageBase64: "   " })).code).toBe("decode_failed");
  });
});

/* ── know-how #5: no_metadata_found is a verdict, not an error ─────────── */

describe("exif-strip · no_metadata_found (know-how #5)", () => {
  it("returns a clean JPEG byte-identical and says nothing was found", () => {
    const clean = jpegFile([APP0_JFIF, DQT]);
    const result = strip(clean);
    expect(result.verdict).toBe("no_metadata_found");
    expect(result.fieldsRemoved).toBe(0);
    expect(result.removedSegments).toEqual([]);
    expect(result.bytesRemoved).toBe(0);
    expect(outBytes(result).equals(clean)).toBe(true);
  });

  it("returns a clean PNG byte-identical", () => {
    const clean = pngFile([]);
    const result = strip(clean);
    expect(result.verdict).toBe("no_metadata_found");
    expect(outBytes(result).equals(clean)).toBe(true);
  });

  it("returns a clean WebP byte-identical", () => {
    const clean = webpFile([VP8_DATA]);
    const result = strip(clean);
    expect(result.verdict).toBe("no_metadata_found");
    expect(result.format).toBe("webp");
    expect(outBytes(result).equals(clean)).toBe(true);
  });
});

/* ── know-how #3: metadata is not one segment ──────────────────────────── */

describe("exif-strip · JPEG families (know-how #3)", () => {
  const result = strip(richJpeg());
  const out = outBytes(result);

  it("names every family it actually removed", () => {
    expect(result.verdict).toBe("stripped");
    expect(result.removedSegments).toEqual(["exif", "iptc", "xmp", "comment", "vendor"]);
  });

  it("counts fields per family from the real structures, not per segment", () => {
    const by = Object.fromEntries(result.removedDetail.map((d) => [d.container, d.fields]));
    // IFD0(Make, Orientation, GPS-pointer) + GPS(2) + IFD1(4) = 9, minus the
    // one orientation entry carried across.
    expect(by["APP1/Exif"]).toBe(8);
    expect(by["APP1/XMP"]).toBe(3); // dc:creator, dc:title, photoshop:City
    expect(by["APP13/Photoshop"]).toBe(2); // two IIM datasets, not one 8BIM block
    expect(by.COM).toBe(1);
    expect(by.APP3).toBe(1);
    expect(result.fieldsRemoved).toBe(15);
  });

  it("leaves no XMP, IPTC, vendor or comment marker in the output", () => {
    expect(out.includes(Buffer.from("http://ns.adobe.com/xap/1.0/", "binary"))).toBe(false);
    expect(out.includes(Buffer.from("Photoshop 3.0", "binary"))).toBe(false);
    expect(out.includes(Buffer.from("vendor-junk", "binary"))).toBe(false);
    expect(out.includes(Buffer.from("shot at home", "ascii"))).toBe(false);
  });

  it("shrinks the file and reports the shrink honestly", () => {
    expect(result.bytesOut).toBeLessThan(result.bytesIn);
    expect(result.bytesRemoved).toBe(result.bytesIn - result.bytesOut);
  });
});

/* ── know-how #1: the removed/preserved split ──────────────────────────── */

describe("exif-strip · preserved span (know-how #1)", () => {
  it("carries a non-normal orientation across in a minimal Exif block", () => {
    const result = strip(richJpeg(6));
    expect(result.orientationTag).toBe(6);
    expect(result.preserved.orientation).toBe(true);
    const out = outBytes(result);
    const exifAt = out.indexOf(Buffer.from("Exif\0\0", "binary"));
    expect(exifAt).toBeGreaterThan(0);
    const tiff = out.subarray(exifAt + 6);
    expect(tiff.toString("ascii", 0, 2)).toBe("MM");
    expect(tiff.readUInt16BE(2)).toBe(42);
    expect(tiff.readUInt16BE(8)).toBe(1); // exactly one IFD0 entry survives
    expect(tiff.readUInt16BE(10)).toBe(0x0112);
    expect(tiff.readUInt16BE(18)).toBe(6);
  });

  it("drops the Exif block entirely when orientation is already normal", () => {
    const result = strip(richJpeg(1));
    expect(result.orientationTag).toBe(1);
    expect(result.preserved.orientation).toBe(true);
    expect(outBytes(result).includes(Buffer.from("Exif\0\0", "binary"))).toBe(false);
  });

  it("never removes the ICC profile or the Adobe colour-transform marker", () => {
    const result = strip(richJpeg());
    const out = outBytes(result);
    expect(result.colorProfileFound).toBe(true);
    expect(result.preserved.colorProfile).toBe(true);
    expect(out.includes(ICC_PAYLOAD)).toBe(true);
    expect(out.includes(Buffer.from([0xff, 0xee]))).toBe(true);
  });

  it("keeps JFIF density and the quantisation table", () => {
    const out = outBytes(strip(richJpeg()));
    expect(out.includes(APP0_JFIF)).toBe(true);
    expect(out.includes(DQT)).toBe(true);
    // JFIF's APP0 still leads, with the rebuilt Exif APP1 next.
    expect(out.indexOf(APP0_JFIF)).toBe(2);
  });
});

/* ── know-how #2: a crop does not remove the thumbnail ─────────────────── */

describe("exif-strip · embedded thumbnail (know-how #2)", () => {
  it("removes the IFD1 thumbnail by default", () => {
    const result = strip(richJpeg());
    expect(result.thumbnailFound).toBe(true);
    expect(result.thumbnailKept).toBe(false);
    expect(outBytes(result).includes(THUMBNAIL)).toBe(false);
  });

  it("keeps it — and only its three essential IFD1 entries — on request", () => {
    const result = strip(richJpeg(), true);
    expect(result.thumbnailKept).toBe(true);
    expect(outBytes(result).includes(THUMBNAIL)).toBe(true);
    // 9 entries in, 1 orientation + 3 thumbnail entries kept.
    const exif = result.removedDetail.find((d) => d.container === "APP1/Exif");
    expect(exif?.fields).toBe(5);
  });

  it("still removes GPS when the thumbnail is kept", () => {
    const result = strip(richJpeg(), true);
    expect(result.removedSegments).toContain("exif");
    expect(result.verdict).toBe("stripped");
  });
});

/* ── know-how #6: same image, minus one class of bytes ─────────────────── */

describe("exif-strip · no re-encode (know-how #6)", () => {
  it("copies the entropy-coded scan byte for byte", () => {
    const input = richJpeg();
    const out = outBytes(strip(input));
    const sosIn = input.indexOf(Buffer.from([0xff, 0xda]));
    const sosOut = out.indexOf(Buffer.from([0xff, 0xda]));
    expect(sosIn).toBeGreaterThan(0);
    expect(out.subarray(sosOut).equals(input.subarray(sosIn))).toBe(true);
    expect(out.subarray(sosOut).includes(SCAN_BYTES)).toBe(true);
  });

  it("keeps PNG image data and header untouched", () => {
    const out = outBytes(strip(richPng()));
    expect(out.includes(IHDR)).toBe(true);
    expect(out.includes(IDAT)).toBe(true);
    expect(out.subarray(0, 8).equals(PNG_SIG)).toBe(true);
  });

  it("keeps the WebP bitstream chunk untouched", () => {
    const out = outBytes(strip(richWebp()));
    expect(out.includes(VP8_DATA)).toBe(true);
  });
});

/* ── know-how #4: PNG and WebP are different containers ────────────────── */

describe("exif-strip · PNG chunks (know-how #4)", () => {
  const result = strip(richPng(8));
  const out = outBytes(result);

  it("removes eXIf, text and tIME chunks and names each family", () => {
    expect(result.format).toBe("png");
    expect(result.removedSegments).toEqual(["exif", "xmp", "text", "time"]);
    expect(out.includes(Buffer.from("parameters", "ascii"))).toBe(false);
    expect(out.includes(Buffer.from("tIME", "ascii"))).toBe(false);
    expect(out.includes(Buffer.from("XML:com.adobe.xmp", "ascii"))).toBe(false);
  });

  it("keeps the iCCP colour profile", () => {
    expect(result.colorProfileFound).toBe(true);
    expect(out.includes(Buffer.from("iCCP", "ascii"))).toBe(true);
  });

  it("rebuilds a valid eXIf chunk carrying only the orientation", () => {
    expect(result.orientationTag).toBe(8);
    expect(result.preserved.orientation).toBe(true);
    const at = out.indexOf(Buffer.from("eXIf", "ascii"));
    expect(at).toBeGreaterThan(0);
    const length = out.readUInt32BE(at - 4);
    const data = out.subarray(at + 4, at + 4 + length);
    const crc = out.readUInt32BE(at + 4 + length);
    // The CRC is checked against an independent, table-free implementation.
    expect(crc).toBe(crc32Slow(Buffer.concat([Buffer.from("eXIf", "ascii"), data])));
    expect(data.toString("ascii", 0, 2)).toBe("MM");
    expect(data.readUInt16BE(10)).toBe(0x0112);
    expect(data.readUInt16BE(18)).toBe(8);
  });

  it("counts eXIf IFD entries, not chunks", () => {
    // IFD0(Orientation, GPS-pointer) + GPS(2) = 4, minus the kept orientation.
    const exif = result.removedDetail.find((d) => d.container === "eXIf");
    expect(exif?.fields).toBe(3);
  });
});

describe("exif-strip · WebP chunks (know-how #4)", () => {
  const result = strip(richWebp(3));
  const out = outBytes(result);

  it("removes the EXIF and XMP chunks", () => {
    expect(result.format).toBe("webp");
    expect(result.removedSegments).toEqual(["exif", "xmp"]);
    expect(out.includes(Buffer.from(XMP_XML))).toBe(false);
    expect(out.includes(Buffer.from("ICCP", "ascii"))).toBe(true);
  });

  it("clears the VP8X XMP flag and keeps the EXIF flag only for the rebuilt chunk", () => {
    const at = out.indexOf(Buffer.from("VP8X", "ascii"));
    const flags = out.readUInt8(at + 8);
    expect(flags & 0x04).toBe(0); // XMP gone
    expect(flags & 0x08).toBe(0x08); // rebuilt orientation-only EXIF stays advertised
    expect(flags & 0x20).toBe(0x20); // ICC untouched
  });

  it("clears the EXIF flag when nothing survives the strip", () => {
    const noOrientation = webpFile([
      vp8x(0x08 | 0x04),
      VP8_DATA,
      riffChunkOf("EXIF", tiffLE({ ifd0: [{ tag: 0x010f, type: 2, count: 4, value: 1 }] })),
      riffChunkOf("XMP ", Buffer.from(XMP_XML)),
    ]);
    const out2 = outBytes(strip(noOrientation));
    const flags = out2.readUInt8(out2.indexOf(Buffer.from("VP8X", "ascii")) + 8);
    expect(flags & 0x0c).toBe(0);
    expect(out2.includes(Buffer.from("EXIF", "ascii"))).toBe(false);
  });

  it("rewrites the RIFF size to match the shortened body", () => {
    expect(out.readUInt32LE(4)).toBe(out.length - 8);
  });

  it("refuses to write an EXIF chunk into a simple WebP with no VP8X header", () => {
    const simple = webpFile([
      VP8_DATA,
      riffChunkOf("EXIF", tiffLE({ ifd0: [{ tag: 0x0112, type: 3, count: 1, value: 6 }] })),
    ]);
    const result2 = strip(simple);
    expect(result2.orientationTag).toBe(6);
    // Honest: an EXIF chunk is only legal under VP8X, so it is not carried.
    expect(result2.preserved.orientation).toBe(false);
    expect(outBytes(result2).includes(Buffer.from("EXIF", "ascii"))).toBe(false);
  });
});

/* ── unit-level checks on the counters ─────────────────────────────────── */

describe("exif-strip · counters", () => {
  it("counts XMP properties by distinct name, skipping structural prefixes", () => {
    expect(countXmpProperties(XMP_XML)).toBe(3);
    expect(countXmpProperties("<rdf:RDF></rdf:RDF>")).toBe(0);
  });

  it("counts IIM datasets inside the IPTC-NAA 8BIM block", () => {
    expect(countPhotoshopFields(photoshopPayload())).toBe(2);
  });

  it("detects the three supported containers and nothing else", () => {
    expect(detectFormat(richJpeg())).toBe("jpeg");
    expect(detectFormat(richPng())).toBe("png");
    expect(detectFormat(richWebp())).toBe("webp");
    expect(detectFormat(Buffer.from("GIF89a", "ascii"))).toBe(null);
  });

  it("exposes the same engine through the exported pure function", () => {
    const bytes = richJpeg();
    const direct = stripImageMetadata({ imageBase64: bytes.toString("base64") });
    expect(direct.fieldsRemoved).toBe(strip(bytes).fieldsRemoved);
  });

  it("accepts a data URL as well as raw base64", () => {
    const bytes = richJpeg();
    const viaDataUrl = run({ imageBase64: `data:image/jpeg;base64,${bytes.toString("base64")}` });
    expect(viaDataUrl.imageBase64).toBe(strip(bytes).imageBase64);
    expect(viaDataUrl.contentType).toBe("image/jpeg");
  });
});
