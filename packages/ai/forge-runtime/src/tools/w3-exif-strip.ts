/**
 * exif-strip — remove a photo's metadata without touching its pixels
 * (Editor root, drop-and-verdict journey).
 *
 * Brief: docs/plans/tools/exif-strip.md. The job is "I am about to share this
 * photo and I do not want the GPS fix, the camera serial number or the capture
 * timestamp travelling with it" — subtraction only. What the brief demands
 * beyond a naive "delete the APP1 segment" clone (§7):
 *
 *  1. The removed/preserved split is not "delete everything that smells like
 *     metadata". Orientation (Exif tag 0x0112) lives in the same TIFF IFD as
 *     the GPS fix, and the ICC colour profile lives in a *different* marker
 *     segment (JPEG APP2, PNG `iCCP`, WebP `ICCP`) from the Exif block. Drop
 *     the lot and the photo silently rotates or shifts colour on next open.
 *     So: the ICC/colour chunks are never in the removal set, and a non-normal
 *     orientation is carried across by rebuilding a *minimal* Exif block that
 *     contains the orientation tag and nothing else.
 *  2. A crop does not remove the Exif thumbnail. IFD1 holds a second, fully
 *     independent compressed image that can still show the pre-crop framing.
 *     It is therefore removed by default (`keepThumbnail: false`), and kept
 *     only when the caller explicitly asks — the opposite default from the
 *     orientation tag, because the thumbnail is a leak and orientation is not.
 *  3. Metadata is not one segment. A JPEG can carry Exif (APP1 `Exif\0\0`),
 *     XMP (a second APP1, `http://ns.adobe.com/xap/1.0/\0`), IPTC (APP13
 *     Photoshop `8BIM` resource blocks) and free-text comments (COM) in four
 *     independently-positioned places. A tool that only looks for one marker
 *     reports success while leaving the other three in the file.
 *  4. PNG and WebP do not use JPEG marker segments at all — PNG carries
 *     `tEXt`/`zTXt`/`iTXt`/`eXIf`/`tIME` chunks, WebP carries RIFF `EXIF`
 *     and `XMP ` chunks plus a `VP8X` flags byte that *advertises* their
 *     presence and must be cleared when they go. Each container gets its own
 *     walker here rather than one JPEG walker pretending to be general.
 *  5. `no_metadata_found` is a distinct, honest verdict. A file that had
 *     nothing to remove is returned byte-identical and says so, instead of
 *     claiming a strip that did not happen.
 *  6. The output must stay the same image. Nothing here decodes or re-encodes
 *     pixels: every kept byte is copied verbatim, and a JPEG's entropy-coded
 *     scan is copied as one unbroken span. Round-tripping through an image
 *     codec would turn an Editor-class edit into a lossy Optimizer-class one.
 *
 * Specs implemented: CIPA DC-008-2019 (Exif 2.32) §4.6.4 tag 0x0112
 * `Orientation` and §4.6.5 IFD1 thumbnail; TIFF 6.0 IFD structure; ISO/IEC
 * 10918-1 (JPEG) marker segments; Adobe XMP Specification Part 3 (JPEG/PNG
 * packet placement); IPTC IIM 4.2 datasets inside Photoshop `8BIM` blocks;
 * ISO/IEC 15948 (PNG) chunk layout and CRC-32; RFC 9649 (WebP) RIFF chunks
 * and the `VP8X` feature flags.
 *
 * Pure and deterministic: bytes in, bytes out. No network, no filesystem, no
 * subprocess, no clock, no randomness.
 */
import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

/* ── contract ──────────────────────────────────────────────────────────── */

/** Stated up front on the page, and enforced before any parsing starts. */
export const MAX_INPUT_BYTES = 10 * 1024 * 1024;
/**
 * Hard transport guard so a hostile caller cannot make us allocate first and
 * ask questions later. Comfortably above `MAX_INPUT_BYTES` in base64 so a file
 * that is merely *too large* still reaches the `file_too_large` verdict rather
 * than a generic schema rejection.
 */
export const MAX_BASE64_CHARS = 28 * 1024 * 1024;

export type ExifStripFormat = "jpeg" | "png" | "webp";
export type ExifStripVerdict = "stripped" | "no_metadata_found";
export type ExifStripErrorCode = "unsupported_format" | "file_too_large" | "decode_failed";

/**
 * Metadata families. The brief's §9.6 sketch names the three classic ones;
 * the extra four exist because a real file carries them and folding a JPEG
 * COM comment or a Stable-Diffusion `tEXt` block into "exif" would be a lie
 * about what was removed.
 */
export const REMOVED_SEGMENTS = [
  "exif",
  "iptc",
  "xmp",
  "comment",
  "text",
  "time",
  "vendor",
] as const;
export type RemovedSegment = (typeof REMOVED_SEGMENTS)[number];

const SEGMENT_ORDER = new Map<RemovedSegment, number>(REMOVED_SEGMENTS.map((s, i) => [s, i]));

export interface RemovedDetail {
  /** Which metadata family this block belonged to. */
  readonly segment: RemovedSegment;
  /** The concrete container that held it — `APP1/Exif`, `tEXt:parameters`, `XMP `. */
  readonly container: string;
  /** Individually-identifiable entries inside it (IFD entries, IIM datasets, …). */
  readonly fields: number;
  /** Bytes the block occupied in the input, header included. */
  readonly bytes: number;
}

export interface ExifStripResult {
  /** Raw base64 (no data-URL prefix) of the cleaned file, same container format. */
  readonly imageBase64: string;
  readonly contentType: string;
  readonly format: ExifStripFormat;
  readonly bytesIn: number;
  readonly bytesOut: number;
  readonly bytesRemoved: number;
  readonly fieldsRemoved: number;
  readonly removedSegments: RemovedSegment[];
  readonly removedDetail: RemovedDetail[];
  readonly preserved: {
    /** The image still displays the same way up. */
    readonly orientation: boolean;
    /** No colour-profile data was removed. */
    readonly colorProfile: boolean;
  };
  /** The Exif orientation value found in the input, if any (1–8). */
  readonly orientationTag: number | null;
  /** Whether the input actually carried an ICC/colour-profile block. */
  readonly colorProfileFound: boolean;
  /** Whether an embedded Exif thumbnail was found, and whether it survived. */
  readonly thumbnailFound: boolean;
  readonly thumbnailKept: boolean;
  readonly verdict: ExifStripVerdict;
}

export class ExifStripError extends Error {
  readonly code: ExifStripErrorCode;
  constructor(code: ExifStripErrorCode, message: string) {
    super(`${code}: ${message}`);
    this.name = "ExifStripError";
    this.code = code;
  }
}

const CONTENT_TYPE: Record<ExifStripFormat, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/* ── shared accumulator ────────────────────────────────────────────────── */

interface StripOutcome {
  bytes: Buffer;
  removals: RemovedDetail[];
  orientationTag: number | null;
  orientationPreserved: boolean;
  thumbnailFound: boolean;
  thumbnailKept: boolean;
  colorProfileFound: boolean;
}

/* ── TIFF / Exif (know-how #1, #2) ─────────────────────────────────────── */

const TAG_ORIENTATION = 0x0112;
const TAG_COMPRESSION = 0x0103;
const TAG_THUMB_OFFSET = 0x0201;
const TAG_THUMB_LENGTH = 0x0202;
const TAG_EXIF_IFD = 0x8769;
const TAG_GPS_IFD = 0x8825;
const TAG_INTEROP_IFD = 0xa005;
const TYPE_SHORT = 3;
const TYPE_LONG = 4;
/** A real IFD holds tens of entries; anything past this is a malformed file. */
const MAX_IFD_ENTRIES = 4096;

interface TiffScan {
  /** Every IFD entry across IFD0, the Exif/GPS/Interop sub-IFDs and IFD1. */
  entryCount: number;
  ifd1EntryCount: number;
  orientation: number | null;
  thumbnail: Buffer | null;
}

/**
 * Read the TIFF block an Exif payload wraps. Returns `null` when the bytes are
 * not a TIFF header at all — the caller then treats the block as opaque
 * metadata worth exactly one field, rather than guessing at its contents.
 */
export function scanTiff(t: Buffer): TiffScan | null {
  if (t.length < 8) return null;
  const order = t.toString("ascii", 0, 2);
  const le = order === "II";
  if (!le && order !== "MM") return null;
  const u16 = (o: number) => (le ? t.readUInt16LE(o) : t.readUInt16BE(o));
  const u32 = (o: number) => (le ? t.readUInt32LE(o) : t.readUInt32BE(o));
  if (u16(2) !== 42) return null;

  let entryCount = 0;
  let ifd1EntryCount = 0;
  let orientation: number | null = null;
  let thumbOffset: number | null = null;
  let thumbLength: number | null = null;
  const visited = new Set<number>();

  function readIfd(offset: number, kind: "ifd0" | "sub" | "ifd1"): number {
    if (offset <= 0 || offset + 2 > t.length || visited.has(offset)) return 0;
    visited.add(offset);
    const n = u16(offset);
    if (n > MAX_IFD_ENTRIES || offset + 2 + n * 12 + 4 > t.length) return 0;
    entryCount += n;
    if (kind === "ifd1") ifd1EntryCount = n;
    for (let k = 0; k < n; k += 1) {
      const e = offset + 2 + k * 12;
      const tag = u16(e);
      const type = u16(e + 2);
      const count = u32(e + 4);
      // A value that fits in four bytes is left-justified in the value field,
      // so a SHORT sits at e+8 under either byte order.
      if (kind === "ifd0" && tag === TAG_ORIENTATION && type === TYPE_SHORT && count === 1) {
        orientation = u16(e + 8);
      }
      if (kind === "ifd1" && tag === TAG_THUMB_OFFSET) thumbOffset = u32(e + 8);
      if (kind === "ifd1" && tag === TAG_THUMB_LENGTH) thumbLength = u32(e + 8);
      const isPointer = tag === TAG_EXIF_IFD || tag === TAG_GPS_IFD || tag === TAG_INTEROP_IFD;
      if (kind !== "ifd1" && isPointer && type === TYPE_LONG && count === 1) {
        readIfd(u32(e + 8), "sub");
      }
    }
    return u32(offset + 2 + n * 12);
  }

  const nextIfd = readIfd(u32(4), "ifd0");
  if (nextIfd) readIfd(nextIfd, "ifd1");

  let thumbnail: Buffer | null = null;
  if (
    thumbOffset !== null &&
    thumbLength !== null &&
    thumbLength > 0 &&
    thumbOffset + thumbLength <= t.length
  ) {
    thumbnail = Buffer.from(t.subarray(thumbOffset, thumbOffset + thumbLength));
  }
  return { entryCount, ifd1EntryCount, orientation, thumbnail };
}

function writeEntry(
  out: Buffer,
  at: number,
  tag: number,
  type: number,
  count: number,
  value: number,
): void {
  out.writeUInt16BE(tag, at);
  out.writeUInt16BE(type, at + 2);
  out.writeUInt32BE(count, at + 4);
  out.writeUInt32BE(value >>> 0, at + 8);
}

/**
 * Build the smallest legal TIFF block that carries only what we deliberately
 * keep: the orientation tag, and (on request) the IFD1 thumbnail. Always
 * big-endian, so the output is byte-stable regardless of the input's order.
 * Returns `null` when there is nothing worth keeping.
 */
export function buildMinimalTiff(
  orientation: number | null,
  thumbnail: Buffer | null,
): Buffer | null {
  if (orientation === null && !thumbnail) return null;
  const n0 = orientation === null ? 0 : 1;
  const ifd0 = 8;
  const ifd1 = ifd0 + 2 + n0 * 12 + 4;
  const ifd1Size = thumbnail ? 2 + 3 * 12 + 4 : 0;
  const thumbAt = ifd1 + ifd1Size;
  const out = Buffer.alloc(thumbAt + (thumbnail ? thumbnail.length : 0));

  out.write("MM", 0, "ascii");
  out.writeUInt16BE(42, 2);
  out.writeUInt32BE(ifd0, 4);
  out.writeUInt16BE(n0, ifd0);
  if (orientation !== null)
    writeEntry(out, ifd0 + 2, TAG_ORIENTATION, TYPE_SHORT, 1, orientation << 16);
  out.writeUInt32BE(thumbnail ? ifd1 : 0, ifd0 + 2 + n0 * 12);

  if (thumbnail) {
    out.writeUInt16BE(3, ifd1);
    writeEntry(out, ifd1 + 2, TAG_COMPRESSION, TYPE_SHORT, 1, 6 << 16);
    writeEntry(out, ifd1 + 14, TAG_THUMB_OFFSET, TYPE_LONG, 1, thumbAt);
    writeEntry(out, ifd1 + 26, TAG_THUMB_LENGTH, TYPE_LONG, 1, thumbnail.length);
    out.writeUInt32BE(0, ifd1 + 38);
    thumbnail.copy(out, thumbAt);
  }
  return out;
}

/** How many IFD entries the rebuilt block accounts for, so they are not double-counted as removed. */
function keptEntryCount(
  orientationKept: boolean,
  thumbKept: boolean,
  ifd1EntryCount: number,
): number {
  return (orientationKept ? 1 : 0) + (thumbKept ? Math.min(3, ifd1EntryCount) : 0);
}

/* ── XMP + IPTC field counting (know-how #3) ───────────────────────────── */

const XMP_RESERVED_PREFIXES = new Set(["rdf", "x", "xmlns", "xml"]);

/**
 * Count the distinct properties an XMP packet carries. XMP writes a property
 * either as an attribute on `rdf:Description` or as a child element, so both
 * shapes are scanned and the reserved structural prefixes are excluded. This
 * is a count of distinct property names, not of array items.
 */
export function countXmpProperties(xml: string): number {
  const names = new Set<string>();
  const element = /<([A-Za-z_][\w.-]*):([A-Za-z_][\w.-]*)[\s/>]/g;
  const attribute = /[\s"']([A-Za-z_][\w.-]*):([A-Za-z_][\w.-]*)\s*=\s*["']/g;
  for (const re of [element, attribute]) {
    re.lastIndex = 0;
    let m = re.exec(xml);
    while (m) {
      const prefix = m[1] ?? "";
      const local = m[2] ?? "";
      if (!XMP_RESERVED_PREFIXES.has(prefix)) names.add(`${prefix}:${local}`);
      m = re.exec(xml);
    }
  }
  return names.size;
}

/** IPTC IIM 4.2 datasets inside a Photoshop 8BIM resource. */
function countIimDatasets(data: Buffer): number {
  let p = 0;
  let n = 0;
  let guard = 0;
  while (p + 5 <= data.length && guard < MAX_IFD_ENTRIES) {
    guard += 1;
    if (data[p] !== 0x1c) break;
    let length = data.readUInt16BE(p + 3);
    let header = 5;
    if (length & 0x8000) {
      const countSize = length & 0x7fff;
      if (countSize !== 4 || p + 9 > data.length) break;
      length = data.readUInt32BE(p + 5);
      header = 9;
    }
    p += header + length;
    n += 1;
  }
  return n;
}

/** Photoshop `8BIM` resource blocks; the IPTC-NAA block (0x0404) is counted per dataset. */
export function countPhotoshopFields(payload: Buffer): number {
  let p = 0;
  let fields = 0;
  let guard = 0;
  while (p + 12 <= payload.length && guard < MAX_IFD_ENTRIES) {
    guard += 1;
    if (payload.toString("ascii", p, p + 4) !== "8BIM") break;
    const id = payload.readUInt16BE(p + 4);
    let q = p + 6;
    const nameLength = payload[q] ?? 0;
    q += 1 + nameLength;
    if ((1 + nameLength) % 2 === 1) q += 1;
    if (q + 4 > payload.length) break;
    const size = payload.readUInt32BE(q);
    q += 4;
    if (q + size > payload.length) break;
    fields += id === 0x0404 ? Math.max(1, countIimDatasets(payload.subarray(q, q + size))) : 1;
    q += size + (size % 2);
    p = q;
  }
  return fields;
}

/* ── format detection ──────────────────────────────────────────────────── */

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function detectFormat(buf: Buffer): ExifStripFormat | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(PNG_SIGNATURE)) return "png";
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

/* ── JPEG (ISO/IEC 10918-1) ────────────────────────────────────────────── */

const EXIF_ID = "Exif\0\0";
const XMP_ID = "http://ns.adobe.com/xap/1.0/\0";
const XMP_EXT_ID = "http://ns.adobe.com/xmp/extension/\0";
const PHOTOSHOP_ID = "Photoshop 3.0\0";
const ICC_ID = "ICC_PROFILE\0";

/** Marker segments that change how the image *displays*, so they are never removed. */
function isDisplayCriticalApp(marker: number, payload: Buffer): boolean {
  if (marker === 0xe0) return true; // APP0 JFIF/JFXX — density and aspect
  if (marker === 0xe2) return payload.toString("ascii", 0, ICC_ID.length) === ICC_ID;
  if (marker === 0xee) return payload.toString("ascii", 0, 5) === "Adobe"; // APP14 colour transform
  return false;
}

function buildExifApp1(tiff: Buffer): Buffer | null {
  const length = 2 + EXIF_ID.length + tiff.length;
  if (length > 0xffff) return null;
  const head = Buffer.alloc(4 + EXIF_ID.length);
  head.writeUInt8(0xff, 0);
  head.writeUInt8(0xe1, 1);
  head.writeUInt16BE(length, 2);
  head.write(EXIF_ID, 4, "binary");
  return Buffer.concat([head, tiff]);
}

function stripJpeg(buf: Buffer, keepThumbnail: boolean): StripOutcome {
  const kept: Buffer[] = [];
  const removals: RemovedDetail[] = [];
  let orientationTag: number | null = null;
  let thumbnail: Buffer | null = null;
  let colorProfileFound = false;
  let exifScanned = false;
  let exifIfd1Entries = 0;
  let exifEntryCount = 0;
  let exifBytes = 0;
  let tail: Buffer | null = null;

  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) {
      throw new ExifStripError("decode_failed", `expected a JPEG marker at byte ${i}.`);
    }
    // Fill bytes: a marker may be preceded by any number of extra 0xFF octets.
    let p = i;
    while (p + 1 < buf.length && buf[p + 1] === 0xff) p += 1;
    if (p + 1 >= buf.length) {
      throw new ExifStripError("decode_failed", "the file ends inside a JPEG marker.");
    }
    const marker = buf[p + 1] as number;

    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      kept.push(Buffer.from([0xff, marker]));
      i = p + 2;
      continue;
    }
    if (marker === 0xda || marker === 0xd9) {
      // Start of scan (or an empty image): everything from here on is entropy
      // coded data plus EOI. Copied as one unbroken span — know-how #6.
      tail = Buffer.from(buf.subarray(p));
      break;
    }
    if (p + 4 > buf.length) {
      throw new ExifStripError("decode_failed", "the file ends inside a JPEG segment header.");
    }
    const length = buf.readUInt16BE(p + 2);
    if (length < 2 || p + 2 + length > buf.length) {
      throw new ExifStripError(
        "decode_failed",
        `JPEG segment at byte ${p} declares an impossible length (${length}).`,
      );
    }
    const segment = buf.subarray(p, p + 2 + length);
    const payload = buf.subarray(p + 4, p + 2 + length);
    i = p + 2 + length;

    if (marker === 0xfe) {
      removals.push({ segment: "comment", container: "COM", fields: 1, bytes: segment.length });
      continue;
    }
    if (marker === 0xe1 && payload.toString("ascii", 0, EXIF_ID.length) === EXIF_ID) {
      const scan = scanTiff(Buffer.from(payload.subarray(EXIF_ID.length)));
      if (!exifScanned && scan) {
        orientationTag = scan.orientation;
        thumbnail = scan.thumbnail;
        exifIfd1Entries = scan.ifd1EntryCount;
        exifScanned = true;
      }
      exifEntryCount += scan ? scan.entryCount : 1;
      exifBytes += segment.length;
      continue;
    }
    if (
      marker === 0xe1 &&
      (payload.toString("ascii", 0, XMP_ID.length) === XMP_ID ||
        payload.toString("ascii", 0, XMP_EXT_ID.length) === XMP_EXT_ID)
    ) {
      const isExtension = payload.toString("ascii", 0, XMP_EXT_ID.length) === XMP_EXT_ID;
      const xml = payload.toString("utf8", isExtension ? XMP_EXT_ID.length : XMP_ID.length);
      removals.push({
        segment: "xmp",
        container: isExtension ? "APP1/XMP-extension" : "APP1/XMP",
        fields: Math.max(1, countXmpProperties(xml)),
        bytes: segment.length,
      });
      continue;
    }
    if (marker === 0xed && payload.toString("ascii", 0, PHOTOSHOP_ID.length) === PHOTOSHOP_ID) {
      const fields = countPhotoshopFields(Buffer.from(payload.subarray(PHOTOSHOP_ID.length)));
      removals.push({
        segment: "iptc",
        container: "APP13/Photoshop",
        fields: Math.max(1, fields),
        bytes: segment.length,
      });
      continue;
    }
    if (marker >= 0xe0 && marker <= 0xef) {
      if (isDisplayCriticalApp(marker, payload)) {
        if (marker === 0xe2) colorProfileFound = true;
        kept.push(Buffer.from(segment));
        continue;
      }
      // Every other APPn marker is by definition application metadata. A
      // privacy tool that keeps vendor maker-note blocks has not done its job.
      removals.push({
        segment: "vendor",
        container: `APP${marker - 0xe0}`,
        fields: 1,
        bytes: segment.length,
      });
      continue;
    }
    kept.push(Buffer.from(segment));
  }

  if (!tail) {
    throw new ExifStripError("decode_failed", "no JPEG start-of-scan marker was found.");
  }

  const orientationToKeep = orientationTag !== null && orientationTag !== 1 ? orientationTag : null;
  const thumbToKeep = keepThumbnail ? thumbnail : null;
  const rebuiltTiff = buildMinimalTiff(orientationToKeep, thumbToKeep);
  const rebuilt = rebuiltTiff ? buildExifApp1(rebuiltTiff) : null;
  const orientationKept = rebuilt !== null && orientationToKeep !== null;
  const thumbnailKept = rebuilt !== null && thumbToKeep !== null;

  if (exifBytes > 0) {
    const fields = Math.max(
      0,
      exifEntryCount - keptEntryCount(orientationKept, thumbnailKept, exifIfd1Entries),
    );
    removals.push({
      segment: "exif",
      container: "APP1/Exif",
      fields,
      bytes: exifBytes,
    });
  }

  const rest = [...kept];
  const head: Buffer[] = [Buffer.from([0xff, 0xd8])];
  if (rebuilt) {
    // JFIF wants its APP0 immediately after SOI; the rebuilt Exif APP1 takes
    // the next slot rather than displacing it.
    const first = rest[0];
    if (first && first[1] === 0xe0) head.push(rest.shift() as Buffer);
    head.push(rebuilt);
  }
  return {
    bytes: Buffer.concat([...head, ...rest, tail]),
    removals,
    orientationTag,
    orientationPreserved: orientationToKeep === null || orientationKept,
    thumbnailFound: thumbnail !== null,
    thumbnailKept,
    colorProfileFound,
  };
}

/* ── PNG (ISO/IEC 15948) ───────────────────────────────────────────────── */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Buffer): number {
  let c = 0xffffffff;
  for (const b of bytes) c = (CRC_TABLE[(c ^ b) & 0xff] as number) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function pngChunk(type: string, data: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

/** PNG chunks that hold nothing but metadata. `tIME` is a capture-time leak. */
const PNG_TEXT_CHUNKS = new Set(["tEXt", "zTXt", "iTXt"]);
const XMP_ITXT_KEYWORD = "XML:com.adobe.xmp";

function pngKeyword(data: Buffer): string {
  const end = data.indexOf(0);
  return data.toString("latin1", 0, end === -1 ? Math.min(data.length, 79) : end);
}

function stripPng(buf: Buffer, keepThumbnail: boolean): StripOutcome {
  const out: Buffer[] = [Buffer.from(PNG_SIGNATURE)];
  const removals: RemovedDetail[] = [];
  let orientationTag: number | null = null;
  let orientationPreserved = true;
  let thumbnailFound = false;
  let thumbnailKept = false;
  let colorProfileFound = false;
  let sawIhdr = false;
  let sawIend = false;

  let p = 8;
  while (p + 8 <= buf.length) {
    const length = buf.readUInt32BE(p);
    if (length > 0x7fffffff) {
      throw new ExifStripError(
        "decode_failed",
        `PNG chunk at byte ${p} declares an absurd length.`,
      );
    }
    const type = buf.toString("ascii", p + 4, p + 8);
    const end = p + 12 + length;
    if (end > buf.length) {
      throw new ExifStripError("decode_failed", `PNG chunk "${type}" at byte ${p} is truncated.`);
    }
    const data = buf.subarray(p + 8, p + 8 + length);
    const chunk = buf.subarray(p, end);
    p = end;

    if (!sawIhdr) {
      if (type !== "IHDR") {
        throw new ExifStripError("decode_failed", "the PNG does not start with an IHDR chunk.");
      }
      sawIhdr = true;
    }

    if (type === "eXIf") {
      const scan = scanTiff(Buffer.from(data));
      orientationTag = scan?.orientation ?? null;
      thumbnailFound = Boolean(scan?.thumbnail);
      const orientationToKeep =
        orientationTag !== null && orientationTag !== 1 ? orientationTag : null;
      const thumbToKeep = keepThumbnail ? (scan?.thumbnail ?? null) : null;
      const rebuilt = buildMinimalTiff(orientationToKeep, thumbToKeep);
      if (rebuilt) {
        out.push(pngChunk("eXIf", rebuilt));
        thumbnailKept = thumbToKeep !== null;
      } else if (orientationToKeep !== null) {
        orientationPreserved = false;
      }
      const orientationKept = rebuilt !== null && orientationToKeep !== null;
      removals.push({
        segment: "exif",
        container: "eXIf",
        fields: Math.max(
          0,
          (scan?.entryCount ?? 1) -
            keptEntryCount(orientationKept, thumbnailKept, scan?.ifd1EntryCount ?? 0),
        ),
        bytes: chunk.length,
      });
      continue;
    }
    if (PNG_TEXT_CHUNKS.has(type)) {
      const keyword = pngKeyword(data);
      const isXmp = type === "iTXt" && keyword === XMP_ITXT_KEYWORD;
      removals.push({
        segment: isXmp ? "xmp" : "text",
        container: `${type}:${keyword}`,
        fields: isXmp ? Math.max(1, countXmpProperties(data.toString("utf8"))) : 1,
        bytes: chunk.length,
      });
      continue;
    }
    if (type === "tIME") {
      removals.push({ segment: "time", container: "tIME", fields: 1, bytes: chunk.length });
      continue;
    }
    if (type === "iCCP" || type === "sRGB") colorProfileFound = true;
    out.push(Buffer.from(chunk));
    if (type === "IEND") {
      sawIend = true;
      break;
    }
  }

  if (!sawIend) {
    throw new ExifStripError("decode_failed", "the PNG has no IEND chunk.");
  }
  return {
    bytes: Buffer.concat(out),
    removals,
    orientationTag,
    orientationPreserved,
    thumbnailFound,
    thumbnailKept,
    colorProfileFound,
  };
}

/* ── WebP (RFC 9649) ───────────────────────────────────────────────────── */

/** VP8X feature flags, MSB first: Rsv Rsv ICC Alpha Exif XMP Anim Rsv. */
const VP8X_FLAG_EXIF = 0x08;
const VP8X_FLAG_XMP = 0x04;

function riffChunk(fourcc: string, data: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.write(fourcc, 0, "ascii");
  head.writeUInt32LE(data.length, 4);
  const pad = data.length % 2 === 1 ? Buffer.from([0]) : Buffer.alloc(0);
  return Buffer.concat([head, data, pad]);
}

function stripWebp(buf: Buffer, keepThumbnail: boolean): StripOutcome {
  const chunks: Buffer[] = [];
  const removals: RemovedDetail[] = [];
  let orientationTag: number | null = null;
  let orientationPreserved = true;
  let thumbnailFound = false;
  let thumbnailKept = false;
  let colorProfileFound = false;
  let vp8xIndex = -1;
  let exifIndex = -1;
  let pendingExif: Buffer | null = null;

  let p = 12;
  while (p + 8 <= buf.length) {
    const fourcc = buf.toString("ascii", p, p + 4);
    const size = buf.readUInt32LE(p + 4);
    if (size > 0x7fffffff || p + 8 + size > buf.length) {
      throw new ExifStripError(
        "decode_failed",
        `WebP chunk "${fourcc}" at byte ${p} is truncated.`,
      );
    }
    const data = buf.subarray(p + 8, p + 8 + size);
    const consumed = 8 + size + (size % 2);
    const chunk = buf.subarray(p, Math.min(p + consumed, buf.length));
    p += consumed;

    if (fourcc === "EXIF") {
      const scan = scanTiff(Buffer.from(data));
      orientationTag = scan?.orientation ?? null;
      thumbnailFound = Boolean(scan?.thumbnail);
      const orientationToKeep =
        orientationTag !== null && orientationTag !== 1 ? orientationTag : null;
      const thumbToKeep = keepThumbnail ? (scan?.thumbnail ?? null) : null;
      pendingExif = buildMinimalTiff(orientationToKeep, thumbToKeep);
      exifIndex = chunks.length;
      if (pendingExif) {
        chunks.push(Buffer.alloc(0)); // placeholder — VP8X presence decides below
        thumbnailKept = thumbToKeep !== null;
      } else if (orientationToKeep !== null) {
        orientationPreserved = false;
      }
      const orientationKept = pendingExif !== null && orientationToKeep !== null;
      removals.push({
        segment: "exif",
        container: "EXIF",
        fields: Math.max(
          0,
          (scan?.entryCount ?? 1) -
            keptEntryCount(orientationKept, thumbnailKept, scan?.ifd1EntryCount ?? 0),
        ),
        bytes: chunk.length,
      });
      continue;
    }
    if (fourcc === "XMP ") {
      removals.push({
        segment: "xmp",
        container: "XMP ",
        fields: Math.max(1, countXmpProperties(data.toString("utf8"))),
        bytes: chunk.length,
      });
      continue;
    }
    if (fourcc === "ICCP") colorProfileFound = true;
    if (fourcc === "VP8X") vp8xIndex = chunks.length;
    chunks.push(Buffer.from(chunk));
  }

  // An EXIF chunk is only legal under a VP8X extended header. Without one we
  // cannot carry the orientation forward, and say so rather than writing an
  // out-of-spec chunk that a decoder may drop or reject.
  const canCarryExif = vp8xIndex !== -1 && pendingExif !== null;
  if (exifIndex !== -1 && pendingExif !== null) {
    if (canCarryExif) {
      chunks[exifIndex] = riffChunk("EXIF", pendingExif);
    } else {
      chunks.splice(exifIndex, 1);
      if (vp8xIndex > exifIndex) vp8xIndex -= 1;
      thumbnailKept = false;
      if (orientationTag !== null && orientationTag !== 1) orientationPreserved = false;
    }
  }

  if (vp8xIndex !== -1) {
    const vp8x = Buffer.from(chunks[vp8xIndex] as Buffer);
    if (vp8x.length >= 9) {
      let flags = vp8x.readUInt8(8);
      flags = canCarryExif ? flags | VP8X_FLAG_EXIF : flags & ~VP8X_FLAG_EXIF;
      flags &= ~VP8X_FLAG_XMP;
      vp8x.writeUInt8(flags & 0xff, 8);
      chunks[vp8xIndex] = vp8x;
    }
  }

  const body = Buffer.concat(chunks);
  const header = Buffer.alloc(12);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(4 + body.length, 4);
  header.write("WEBP", 8, "ascii");
  return {
    bytes: Buffer.concat([header, body]),
    removals,
    orientationTag,
    orientationPreserved,
    thumbnailFound,
    thumbnailKept,
    colorProfileFound,
  };
}

/* ── engine ────────────────────────────────────────────────────────────── */

export interface ExifStripInput {
  imageBase64: string;
  keepThumbnail?: boolean;
}

export function decodeImageInput(imageBase64: string): Buffer {
  const cleaned = imageBase64.includes(",")
    ? (imageBase64.split(",").pop() ?? imageBase64)
    : imageBase64;
  const buf = Buffer.from(cleaned.trim(), "base64");
  if (buf.length === 0) {
    throw new ExifStripError("decode_failed", "the input decoded to zero bytes.");
  }
  if (buf.length > MAX_INPUT_BYTES) {
    throw new ExifStripError(
      "file_too_large",
      `the image is ${buf.length} bytes; the ceiling is ${MAX_INPUT_BYTES} bytes (10 MB).`,
    );
  }
  return buf;
}

export function stripImageMetadata(input: ExifStripInput): ExifStripResult {
  const keepThumbnail = input.keepThumbnail ?? false;
  const buf = decodeImageInput(input.imageBase64);
  const format = detectFormat(buf);
  if (!format) {
    throw new ExifStripError(
      "unsupported_format",
      "only JPEG, PNG and WebP still images are supported; video, PDF, HEIC, AVIF and GIF are out of scope.",
    );
  }

  let outcome: StripOutcome;
  if (format === "jpeg") outcome = stripJpeg(buf, keepThumbnail);
  else if (format === "png") outcome = stripPng(buf, keepThumbnail);
  else outcome = stripWebp(buf, keepThumbnail);

  // A block that turned out to carry nothing removable (an Exif segment whose
  // only entry was the orientation we kept) is not a removal.
  const removedDetail = outcome.removals
    .filter((r) => r.fields > 0)
    .slice()
    .sort((a, b) => {
      const bySegment = (SEGMENT_ORDER.get(a.segment) ?? 0) - (SEGMENT_ORDER.get(b.segment) ?? 0);
      return bySegment !== 0 ? bySegment : a.container.localeCompare(b.container);
    });

  const removedSegments = [...new Set(removedDetail.map((r) => r.segment))].sort(
    (a, b) => (SEGMENT_ORDER.get(a) ?? 0) - (SEGMENT_ORDER.get(b) ?? 0),
  );
  const fieldsRemoved = removedDetail.reduce((sum, r) => sum + r.fields, 0);
  const bytesOut = outcome.bytes.length;

  return {
    imageBase64: outcome.bytes.toString("base64"),
    contentType: CONTENT_TYPE[format],
    format,
    bytesIn: buf.length,
    bytesOut,
    bytesRemoved: Math.max(0, buf.length - bytesOut),
    fieldsRemoved,
    removedSegments,
    removedDetail,
    preserved: {
      orientation: outcome.orientationPreserved,
      colorProfile: true,
    },
    orientationTag: outcome.orientationTag,
    colorProfileFound: outcome.colorProfileFound,
    thumbnailFound: outcome.thumbnailFound,
    thumbnailKept: outcome.thumbnailKept,
    verdict: removedDetail.length > 0 ? "stripped" : "no_metadata_found",
  };
}

/* ── tool declaration ──────────────────────────────────────────────────── */

export const exifStripTool = tool({
  id: "image/exif-strip",
  slug: "exif-strip",
  category: "image",
  title: { zh: "EXIF 元数据清除", en: "EXIF Metadata Remover" },
  description: {
    zh: "移除 JPEG/PNG/WebP 的 EXIF、IPTC、XMP 与注释元数据（GPS、拍摄时间、设备序列号、内嵌缩略图），像素不重新编码，方向与色彩配置保留",
    en: "Remove EXIF, IPTC, XMP and comment metadata (GPS, capture time, device serial, embedded thumbnail) from JPEG/PNG/WebP without re-encoding pixels; orientation and colour profile are preserved",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.image.exif_strip",
  roots: ["editor", "optimizer"],
  engine: {
    name: "forge-metadata-splice",
    upstream:
      "CIPA DC-008-2019 (Exif 2.32) + TIFF 6.0 + ISO/IEC 10918-1 (JPEG) + ISO/IEC 15948 (PNG) + RFC 9649 (WebP) + IPTC IIM 4.2 + Adobe XMP Part 3",
    version: "1.0.0",
  },
  seoKeywords: {
    zh: "去除照片EXIF信息,删除图片元数据,清除照片GPS位置,图片元数据清除工具,exif删除在线",
    en: "remove exif data from photo online, exif remover, delete exif data, strip metadata from image, remove gps from photo",
  },
  inputSchema: z.object({
    imageBase64: z
      .string()
      .min(1)
      .max(MAX_BASE64_CHARS)
      .describe(
        "The image, as raw base64 or a data URL. JPEG, PNG or WebP; up to 10 MB decoded (larger fails with file_too_large).",
      ),
    keepThumbnail: z
      .boolean()
      .default(false)
      .describe(
        "Keep the embedded Exif (IFD1) thumbnail. Off by default: a thumbnail survives a crop and can still show the pre-crop frame.",
      ),
  }),
  execute: (input: ExifStripInput): ExifStripResult => stripImageMetadata(input),
});

export const w3ExifStripTools = [exifStripTool];
