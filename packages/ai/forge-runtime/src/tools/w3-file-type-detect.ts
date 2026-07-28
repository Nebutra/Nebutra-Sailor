/**
 * file-type-detect — true file type from leading bytes (root: detector).
 *
 * Brief: docs/plans/tools/file-type-detect.md. The domain rules that separate
 * this from a naive "switch on the first four bytes" implementation, and where
 * each is enforced:
 *
 *  1. Signatures are not all at offset 0 — ISO-BMFF `ftyp` sits at byte 4, TAR
 *     `ustar` at 257, ISO 9660 `CD001` at 32769, EOT at 34, MOBI at 60.
 *     Every entry carries its own offset (§7.1).
 *  2. The read is bounded and the bound is stated, never hidden: `maxBytesRead`
 *     defaults to 8 KiB — enough for TAR's offset-257 marker and for a ZIP
 *     central-directory-free walk of the leading local file headers (§7.2).
 * 2b. Signatures are patterns, not literals: `??` is a wildcard byte, so
 *     JPEG's `FF D8 FF ??` family matches JFIF, Exif and raw alike (§7.2b).
 *  3. The ZIP-family collision is resolved by actually reading the archive's
 *     leading local file headers and their member names — `[Content_Types].xml`
 *     for OOXML, `META-INF/MANIFEST.MF` for JAR, `AndroidManifest.xml` for APK,
 *     a first *stored* `mimetype` member for ODF/EPUB. When the sampled head
 *     does not contain a distinguishing member we report `container-only` and
 *     say so, instead of inferring the subtype from the filename (§7.3).
 *  4. Polyglots are surfaced, not swallowed: every matching signature is
 *     returned, and an embedded ZIP found past offset 0 (GIFAR, PDF+ZIP) is
 *     reported explicitly (§7.4).
 *  5. Container ≠ codec: an `ftyp` brand names the container/brand only; we
 *     never claim to know the streams inside it (§7.5).
 *  6. A mismatch is tiered, not alarmed: `benign` (same media family),
 *     `mismatch`, `high-risk` (executable or script wearing a passive
 *     extension) (§7.6).
 *  7. Text-based formats have no byte signature — we answer "text, format
 *     ambiguous" with structural hints rather than guessing confidently (§7.7).
 *  8. Detected type, caller-reported MIME and filename extension are three
 *     separate signals and are reported separately (§7.8).
 *  9. Shannon entropy of the sample is reported so "high entropy, no header"
 *     reads as encrypted/compressed rather than as a failure (§7.9).
 * 10. Raw hex is a first-class input, not only a file — an agent that already
 *     holds the first bytes of a stream never has to materialise a file (§7.10).
 *
 * Pure: no network, no fs, no clock, no randomness. Same engine for the human
 * page and the agent surface.
 */

import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

/* ── signature table ──────────────────────────────────────────────────── */

export type SignatureCategory =
  | "image"
  | "audio"
  | "video"
  | "document"
  | "archive"
  | "executable"
  | "font"
  | "crypto"
  | "disk"
  | "database"
  | "text"
  | "misc";

export type ContainerKind = "zip" | "iso-bmff" | "ebml" | "cfbf";

export interface FileSignature {
  readonly id: string;
  readonly name: string;
  readonly mime: string;
  readonly ext: string;
  readonly aliases?: readonly string[];
  readonly offset: number;
  /** Uppercase hex, two chars per byte; `??` is a wildcard byte. */
  readonly hex: string;
  /** Extra anchored fragments that must also match (RIFF/AIFF subtypes, …). */
  readonly also?: readonly { readonly offset: number; readonly hex: string }[];
  readonly category: SignatureCategory;
  /** Needs a second, deeper read before the real format can be named. */
  readonly container?: ContainerKind;
  /** `executable` / `script` drive the high-risk mismatch tier (§7.6). */
  readonly risk?: "executable" | "script";
  /** Too short or too common to stand alone — downgrades confidence (§7.7). */
  readonly weak?: true;
}

function sig(s: FileSignature): FileSignature {
  return s;
}

/**
 * 180 signatures. The count is asserted by the test suite, not rounded up for
 * marketing (brief §9.3 asks for a real, countable ≥130).
 */
export const FILE_SIGNATURES: readonly FileSignature[] = [
  // ── images ──────────────────────────────────────────────────────────
  sig({
    id: "png",
    name: "PNG image",
    mime: "image/png",
    ext: "png",
    offset: 0,
    hex: "89504E470D0A1A0A",
    category: "image",
  }),
  sig({
    id: "jpeg",
    name: "JPEG image",
    mime: "image/jpeg",
    ext: "jpg",
    aliases: ["jpeg", "jpe", "jfif"],
    offset: 0,
    hex: "FFD8FF??",
    category: "image",
  }),
  sig({
    id: "gif87a",
    name: "GIF image (87a)",
    mime: "image/gif",
    ext: "gif",
    offset: 0,
    hex: "474946383761",
    category: "image",
  }),
  sig({
    id: "gif89a",
    name: "GIF image (89a)",
    mime: "image/gif",
    ext: "gif",
    offset: 0,
    hex: "474946383961",
    category: "image",
  }),
  sig({
    id: "bmp",
    name: "BMP image",
    mime: "image/bmp",
    ext: "bmp",
    aliases: ["dib"],
    offset: 0,
    hex: "424D",
    category: "image",
    weak: true,
  }),
  sig({
    id: "tiff-le",
    name: "TIFF image (little-endian)",
    mime: "image/tiff",
    ext: "tif",
    aliases: ["tiff"],
    offset: 0,
    hex: "49492A00",
    category: "image",
  }),
  sig({
    id: "tiff-be",
    name: "TIFF image (big-endian)",
    mime: "image/tiff",
    ext: "tif",
    aliases: ["tiff"],
    offset: 0,
    hex: "4D4D002A",
    category: "image",
  }),
  sig({
    id: "bigtiff-le",
    name: "BigTIFF image (little-endian)",
    mime: "image/tiff",
    ext: "tif",
    aliases: ["tiff", "btf"],
    offset: 0,
    hex: "49492B00",
    category: "image",
  }),
  sig({
    id: "bigtiff-be",
    name: "BigTIFF image (big-endian)",
    mime: "image/tiff",
    ext: "tif",
    aliases: ["tiff", "btf"],
    offset: 0,
    hex: "4D4D002B",
    category: "image",
  }),
  sig({
    id: "webp",
    name: "WebP image",
    mime: "image/webp",
    ext: "webp",
    offset: 0,
    hex: "52494646",
    also: [{ offset: 8, hex: "57454250" }],
    category: "image",
  }),
  sig({
    id: "ico",
    name: "Windows icon",
    mime: "image/x-icon",
    ext: "ico",
    offset: 0,
    hex: "00000100",
    category: "image",
  }),
  sig({
    id: "cur",
    name: "Windows cursor",
    mime: "image/x-icon",
    ext: "cur",
    offset: 0,
    hex: "00000200",
    category: "image",
  }),
  sig({
    id: "psd",
    name: "Photoshop document",
    mime: "image/vnd.adobe.photoshop",
    ext: "psd",
    offset: 0,
    hex: "38425053",
    category: "image",
  }),
  sig({
    id: "jp2",
    name: "JPEG 2000 (JP2 container)",
    mime: "image/jp2",
    ext: "jp2",
    offset: 0,
    hex: "0000000C6A5020200D0A870A",
    category: "image",
  }),
  sig({
    id: "j2c",
    name: "JPEG 2000 codestream",
    mime: "image/j2c",
    ext: "j2k",
    aliases: ["j2c", "jpc"],
    offset: 0,
    hex: "FF4FFF51",
    category: "image",
  }),
  sig({
    id: "xcf",
    name: "GIMP image",
    mime: "image/x-xcf",
    ext: "xcf",
    offset: 0,
    hex: "67696D7020786366",
    category: "image",
  }),
  sig({
    id: "exr",
    name: "OpenEXR image",
    mime: "image/x-exr",
    ext: "exr",
    offset: 0,
    hex: "762F3101",
    category: "image",
  }),
  sig({
    id: "dds",
    name: "DirectDraw surface",
    mime: "image/vnd-ms.dds",
    ext: "dds",
    offset: 0,
    hex: "44445320",
    category: "image",
  }),
  sig({
    id: "pbm",
    name: "Netpbm bitmap (P4)",
    mime: "image/x-portable-bitmap",
    ext: "pbm",
    offset: 0,
    hex: "5034",
    category: "image",
    weak: true,
  }),
  sig({
    id: "pgm",
    name: "Netpbm graymap (P5)",
    mime: "image/x-portable-graymap",
    ext: "pgm",
    offset: 0,
    hex: "5035",
    category: "image",
    weak: true,
  }),
  sig({
    id: "ppm",
    name: "Netpbm pixmap (P6)",
    mime: "image/x-portable-pixmap",
    ext: "ppm",
    offset: 0,
    hex: "5036",
    category: "image",
    weak: true,
  }),
  sig({
    id: "flif",
    name: "FLIF image",
    mime: "image/flif",
    ext: "flif",
    offset: 0,
    hex: "464C4946",
    category: "image",
  }),
  sig({
    id: "qoi",
    name: "QOI image",
    mime: "image/qoi",
    ext: "qoi",
    offset: 0,
    hex: "716F6966",
    category: "image",
  }),
  sig({
    id: "jxl-codestream",
    name: "JPEG XL codestream",
    mime: "image/jxl",
    ext: "jxl",
    offset: 0,
    hex: "FF0A",
    category: "image",
    weak: true,
  }),
  sig({
    id: "jxl-container",
    name: "JPEG XL (ISO container)",
    mime: "image/jxl",
    ext: "jxl",
    offset: 0,
    hex: "0000000C4A584C200D0A870A",
    category: "image",
  }),
  sig({
    id: "wmf",
    name: "Windows metafile",
    mime: "image/wmf",
    ext: "wmf",
    offset: 0,
    hex: "D7CDC69A",
    category: "image",
  }),
  sig({
    id: "emf",
    name: "Enhanced metafile",
    mime: "image/emf",
    ext: "emf",
    offset: 0,
    hex: "01000000",
    also: [{ offset: 40, hex: "20454D46" }],
    category: "image",
  }),
  sig({
    id: "cr2",
    name: "Canon RAW 2 image",
    mime: "image/x-canon-cr2",
    ext: "cr2",
    offset: 0,
    hex: "49492A00",
    also: [{ offset: 8, hex: "43520200" }],
    category: "image",
  }),
  sig({
    id: "hdr",
    name: "Radiance HDR image",
    mime: "image/vnd.radiance",
    ext: "hdr",
    offset: 0,
    hex: "233F52414449414E4345",
    category: "image",
  }),
  sig({
    id: "icns",
    name: "Apple icon image",
    mime: "image/icns",
    ext: "icns",
    offset: 0,
    hex: "69636E73",
    category: "image",
  }),
  sig({
    id: "mng",
    name: "MNG animation",
    mime: "video/x-mng",
    ext: "mng",
    offset: 0,
    hex: "8A4D4E470D0A1A0A",
    category: "image",
  }),
  sig({
    id: "jng",
    name: "JNG image",
    mime: "image/x-jng",
    ext: "jng",
    offset: 0,
    hex: "8B4A4E470D0A1A0A",
    category: "image",
  }),
  sig({
    id: "pcx",
    name: "PCX image",
    mime: "image/vnd.zbrush.pcx",
    ext: "pcx",
    offset: 0,
    hex: "0A??01",
    category: "image",
    weak: true,
  }),

  // ── audio ───────────────────────────────────────────────────────────
  sig({
    id: "mp3-id3",
    name: "MP3 audio (ID3 tag)",
    mime: "audio/mpeg",
    ext: "mp3",
    offset: 0,
    hex: "494433",
    category: "audio",
  }),
  sig({
    id: "mp3-fb",
    name: "MP3 audio (MPEG-1 Layer III frame)",
    mime: "audio/mpeg",
    ext: "mp3",
    offset: 0,
    hex: "FFFB",
    category: "audio",
    weak: true,
  }),
  sig({
    id: "mp3-f3",
    name: "MP3 audio (MPEG-2 Layer III frame)",
    mime: "audio/mpeg",
    ext: "mp3",
    offset: 0,
    hex: "FFF3",
    category: "audio",
    weak: true,
  }),
  sig({
    id: "mp3-f2",
    name: "MP3 audio (MPEG-2.5 Layer III frame)",
    mime: "audio/mpeg",
    ext: "mp3",
    offset: 0,
    hex: "FFF2",
    category: "audio",
    weak: true,
  }),
  sig({
    id: "wav",
    name: "WAV audio",
    mime: "audio/wav",
    ext: "wav",
    offset: 0,
    hex: "52494646",
    also: [{ offset: 8, hex: "57415645" }],
    category: "audio",
  }),
  sig({
    id: "flac",
    name: "FLAC audio",
    mime: "audio/flac",
    ext: "flac",
    offset: 0,
    hex: "664C6143",
    category: "audio",
  }),
  sig({
    id: "ogg",
    name: "Ogg container",
    mime: "audio/ogg",
    ext: "ogg",
    aliases: ["oga", "ogv", "opus", "spx"],
    offset: 0,
    hex: "4F676753",
    category: "audio",
  }),
  sig({
    id: "midi",
    name: "MIDI sequence",
    mime: "audio/midi",
    ext: "mid",
    aliases: ["midi"],
    offset: 0,
    hex: "4D546864",
    category: "audio",
  }),
  sig({
    id: "aiff",
    name: "AIFF audio",
    mime: "audio/aiff",
    ext: "aiff",
    aliases: ["aif"],
    offset: 0,
    hex: "464F524D",
    also: [{ offset: 8, hex: "41494646" }],
    category: "audio",
  }),
  sig({
    id: "au",
    name: "Sun/NeXT AU audio",
    mime: "audio/basic",
    ext: "au",
    aliases: ["snd"],
    offset: 0,
    hex: "2E736E64",
    category: "audio",
  }),
  sig({
    id: "asf",
    name: "ASF container (WMA/WMV)",
    mime: "video/x-ms-asf",
    ext: "asf",
    aliases: ["wma", "wmv"],
    offset: 0,
    hex: "3026B2758E66CF11",
    category: "audio",
  }),
  sig({
    id: "amr",
    name: "AMR audio",
    mime: "audio/amr",
    ext: "amr",
    offset: 0,
    hex: "2321414D52",
    category: "audio",
  }),
  sig({
    id: "ape",
    name: "Monkey's Audio",
    mime: "audio/x-ape",
    ext: "ape",
    offset: 0,
    hex: "4D414320",
    category: "audio",
  }),
  sig({
    id: "mpc",
    name: "Musepack audio (SV8)",
    mime: "audio/x-musepack",
    ext: "mpc",
    offset: 0,
    hex: "4D50434B",
    category: "audio",
  }),
  sig({
    id: "voc",
    name: "Creative Voice audio",
    mime: "audio/x-voc",
    ext: "voc",
    offset: 0,
    hex: "437265617469766520566F6963652046696C65",
    category: "audio",
  }),
  sig({
    id: "it",
    name: "Impulse Tracker module",
    mime: "audio/x-it",
    ext: "it",
    offset: 0,
    hex: "494D504D",
    category: "audio",
  }),
  sig({
    id: "xm",
    name: "FastTracker II module",
    mime: "audio/x-xm",
    ext: "xm",
    offset: 0,
    hex: "457874656E646564204D6F64756C653A",
    category: "audio",
  }),
  sig({
    id: "s3m",
    name: "Scream Tracker 3 module",
    mime: "audio/x-s3m",
    ext: "s3m",
    offset: 44,
    hex: "5343524D",
    category: "audio",
  }),
  sig({
    id: "rmi",
    name: "RIFF MIDI",
    mime: "audio/midi",
    ext: "rmi",
    offset: 0,
    hex: "52494646",
    also: [{ offset: 8, hex: "524D4944" }],
    category: "audio",
  }),
  sig({
    id: "caf",
    name: "Core Audio Format",
    mime: "audio/x-caf",
    ext: "caf",
    offset: 0,
    hex: "63616666",
    category: "audio",
  }),
  sig({
    id: "dsf",
    name: "DSD stream file",
    mime: "audio/x-dsf",
    ext: "dsf",
    offset: 0,
    hex: "44534420",
    category: "audio",
  }),
  sig({
    id: "wavpack",
    name: "WavPack audio",
    mime: "audio/x-wavpack",
    ext: "wv",
    offset: 0,
    hex: "7776706B",
    category: "audio",
  }),
  sig({
    id: "tta",
    name: "True Audio",
    mime: "audio/x-tta",
    ext: "tta",
    offset: 0,
    hex: "54544131",
    category: "audio",
  }),

  // ── video / A-V containers ──────────────────────────────────────────
  sig({
    id: "iso-bmff",
    name: "ISO base media container (ftyp)",
    mime: "video/mp4",
    ext: "mp4",
    aliases: ["m4a", "m4v", "mov", "heic", "heif", "avif", "3gp"],
    offset: 4,
    hex: "66747970",
    category: "video",
    container: "iso-bmff",
  }),
  sig({
    id: "matroska",
    name: "Matroska/EBML container",
    mime: "video/x-matroska",
    ext: "mkv",
    aliases: ["webm", "mka", "mks"],
    offset: 0,
    hex: "1A45DFA3",
    category: "video",
    container: "ebml",
  }),
  sig({
    id: "avi",
    name: "AVI video",
    mime: "video/x-msvideo",
    ext: "avi",
    offset: 0,
    hex: "52494646",
    also: [{ offset: 8, hex: "41564920" }],
    category: "video",
  }),
  sig({
    id: "flv",
    name: "Flash video",
    mime: "video/x-flv",
    ext: "flv",
    offset: 0,
    hex: "464C5601",
    category: "video",
  }),
  sig({
    id: "mpeg-ps",
    name: "MPEG program stream",
    mime: "video/mpeg",
    ext: "mpg",
    aliases: ["mpeg", "vob"],
    offset: 0,
    hex: "000001BA",
    category: "video",
  }),
  sig({
    id: "mpeg-es",
    name: "MPEG video elementary stream",
    mime: "video/mpeg",
    ext: "mpv",
    offset: 0,
    hex: "000001B3",
    category: "video",
  }),
  sig({
    // ISO/IEC 13818-1: a transport stream is a chain of 188-byte packets, each
    // opening with the 0x47 sync byte. Two anchors are not a signature — 0x47
    // is ASCII "G", so `G…G` at the wrong two offsets turned an access log into
    // a video file. Four consecutive sync positions are what the standard's own
    // synchronisation procedure looks for.
    id: "mpeg-ts",
    name: "MPEG transport stream",
    mime: "video/mp2t",
    ext: "ts",
    aliases: ["m2ts", "mts"],
    offset: 0,
    hex: "47",
    also: [
      { offset: 188, hex: "47" },
      { offset: 376, hex: "47" },
      { offset: 564, hex: "47" },
    ],
    category: "video",
  }),
  sig({
    id: "realmedia",
    name: "RealMedia container",
    mime: "application/vnd.rn-realmedia",
    ext: "rm",
    aliases: ["rmvb"],
    offset: 0,
    hex: "2E524D46",
    category: "video",
  }),
  sig({
    id: "swf-fws",
    name: "Flash movie (uncompressed)",
    mime: "application/x-shockwave-flash",
    ext: "swf",
    offset: 0,
    hex: "465753",
    category: "video",
  }),
  sig({
    id: "swf-cws",
    name: "Flash movie (zlib)",
    mime: "application/x-shockwave-flash",
    ext: "swf",
    offset: 0,
    hex: "435753",
    category: "video",
  }),
  sig({
    id: "swf-zws",
    name: "Flash movie (LZMA)",
    mime: "application/x-shockwave-flash",
    ext: "swf",
    offset: 0,
    hex: "5A5753",
    category: "video",
  }),
  sig({
    id: "ivf",
    name: "IVF video",
    mime: "video/x-ivf",
    ext: "ivf",
    offset: 0,
    hex: "444B4946",
    category: "video",
  }),
  sig({
    id: "y4m",
    name: "YUV4MPEG2 stream",
    mime: "video/x-yuv4mpeg2",
    ext: "y4m",
    offset: 0,
    hex: "595556344D50454732",
    category: "video",
  }),
  sig({
    id: "ani",
    name: "Windows animated cursor",
    mime: "application/x-navi-animation",
    ext: "ani",
    offset: 0,
    hex: "52494646",
    also: [{ offset: 8, hex: "41434F4E" }],
    category: "video",
  }),

  // ── documents ───────────────────────────────────────────────────────
  sig({
    id: "pdf",
    name: "PDF document",
    mime: "application/pdf",
    ext: "pdf",
    offset: 0,
    hex: "255044462D",
    category: "document",
  }),
  sig({
    id: "postscript",
    name: "PostScript program",
    mime: "application/postscript",
    ext: "ps",
    offset: 0,
    hex: "25215053",
    category: "document",
  }),
  sig({
    id: "eps-dos",
    name: "Encapsulated PostScript (DOS preview)",
    mime: "application/postscript",
    ext: "eps",
    offset: 0,
    hex: "C5D0D3C6",
    category: "document",
  }),
  sig({
    id: "rtf",
    name: "Rich Text Format",
    mime: "application/rtf",
    ext: "rtf",
    offset: 0,
    hex: "7B5C72746631",
    category: "document",
  }),
  sig({
    id: "cfbf",
    name: "OLE2 compound file (legacy Office/MSI)",
    mime: "application/x-cfb",
    ext: "doc",
    aliases: ["xls", "ppt", "msg", "msi", "vsd"],
    offset: 0,
    hex: "D0CF11E0A1B11AE1",
    category: "document",
    container: "cfbf",
  }),
  sig({
    id: "djvu",
    name: "DjVu document",
    mime: "image/vnd.djvu",
    ext: "djvu",
    offset: 0,
    hex: "41542654464F524D",
    category: "document",
  }),
  sig({
    id: "chm",
    name: "Windows help (CHM)",
    mime: "application/vnd.ms-htmlhelp",
    ext: "chm",
    offset: 0,
    hex: "49545346",
    category: "document",
  }),
  sig({
    id: "mobi",
    name: "Mobipocket e-book",
    mime: "application/x-mobipocket-ebook",
    ext: "mobi",
    aliases: ["prc"],
    offset: 60,
    hex: "424F4F4B4D4F4249",
    category: "document",
  }),
  sig({
    id: "palmdoc",
    name: "PalmDOC e-book",
    mime: "application/vnd.palm",
    ext: "pdb",
    offset: 60,
    hex: "5445587452656164",
    category: "document",
  }),
  sig({
    id: "wpd",
    name: "WordPerfect document",
    mime: "application/vnd.wordperfect",
    ext: "wpd",
    offset: 0,
    hex: "FF575043",
    category: "document",
  }),
  sig({
    id: "onenote",
    name: "OneNote section",
    mime: "application/onenote",
    ext: "one",
    offset: 0,
    hex: "E4525C7B8CD8A74D",
    category: "document",
  }),
  sig({
    id: "dvi",
    name: "TeX DVI document",
    mime: "application/x-dvi",
    ext: "dvi",
    offset: 0,
    hex: "F702",
    category: "document",
    weak: true,
  }),
  sig({
    id: "fits",
    name: "FITS data set",
    mime: "application/fits",
    ext: "fits",
    aliases: ["fit"],
    offset: 0,
    hex: "53494D504C4520",
    category: "document",
  }),
  sig({
    id: "lit",
    name: "Microsoft Reader e-book",
    mime: "application/x-ms-reader",
    ext: "lit",
    offset: 0,
    hex: "49544F4C49544C53",
    category: "document",
  }),
  sig({
    id: "indd",
    name: "InDesign document",
    mime: "application/x-indesign",
    ext: "indd",
    offset: 0,
    hex: "06064EDB",
    category: "document",
  }),

  // ── archives / compression ──────────────────────────────────────────
  sig({
    id: "zip-local",
    name: "ZIP archive",
    mime: "application/zip",
    ext: "zip",
    aliases: [
      "docx",
      "xlsx",
      "pptx",
      "odt",
      "ods",
      "odp",
      "jar",
      "apk",
      "epub",
      "xpi",
      "vsdx",
      "kmz",
    ],
    offset: 0,
    hex: "504B0304",
    category: "archive",
    container: "zip",
  }),
  sig({
    id: "zip-empty",
    name: "ZIP archive (empty)",
    mime: "application/zip",
    ext: "zip",
    offset: 0,
    hex: "504B0506",
    category: "archive",
  }),
  sig({
    id: "zip-spanned",
    name: "ZIP archive (spanned)",
    mime: "application/zip",
    ext: "zip",
    offset: 0,
    hex: "504B0708",
    category: "archive",
  }),
  sig({
    id: "rar4",
    name: "RAR archive (≤4.x)",
    mime: "application/vnd.rar",
    ext: "rar",
    offset: 0,
    hex: "526172211A0700",
    category: "archive",
  }),
  sig({
    id: "rar5",
    name: "RAR archive (5.x)",
    mime: "application/vnd.rar",
    ext: "rar",
    offset: 0,
    hex: "526172211A070100",
    category: "archive",
  }),
  sig({
    id: "sevenzip",
    name: "7-Zip archive",
    mime: "application/x-7z-compressed",
    ext: "7z",
    offset: 0,
    hex: "377ABCAF271C",
    category: "archive",
  }),
  sig({
    id: "gzip",
    name: "gzip stream",
    mime: "application/gzip",
    ext: "gz",
    aliases: ["tgz"],
    offset: 0,
    hex: "1F8B08",
    category: "archive",
  }),
  sig({
    id: "bzip2",
    name: "bzip2 stream",
    mime: "application/x-bzip2",
    ext: "bz2",
    offset: 0,
    hex: "425A68",
    category: "archive",
  }),
  sig({
    id: "xz",
    name: "XZ stream",
    mime: "application/x-xz",
    ext: "xz",
    offset: 0,
    hex: "FD377A585A00",
    category: "archive",
  }),
  sig({
    id: "zstd",
    name: "Zstandard stream",
    mime: "application/zstd",
    ext: "zst",
    offset: 0,
    hex: "28B52FFD",
    category: "archive",
  }),
  sig({
    id: "lz4",
    name: "LZ4 frame",
    mime: "application/x-lz4",
    ext: "lz4",
    offset: 0,
    hex: "04224D18",
    category: "archive",
  }),
  sig({
    id: "lzip",
    name: "lzip stream",
    mime: "application/x-lzip",
    ext: "lz",
    offset: 0,
    hex: "4C5A4950",
    category: "archive",
  }),
  sig({
    id: "zlib-default",
    name: "zlib stream (default compression)",
    mime: "application/zlib",
    ext: "zz",
    offset: 0,
    hex: "789C",
    category: "archive",
    weak: true,
  }),
  sig({
    id: "zlib-none",
    name: "zlib stream (no/low compression)",
    mime: "application/zlib",
    ext: "zz",
    offset: 0,
    hex: "7801",
    category: "archive",
    weak: true,
  }),
  sig({
    id: "zlib-best",
    name: "zlib stream (best compression)",
    mime: "application/zlib",
    ext: "zz",
    offset: 0,
    hex: "78DA",
    category: "archive",
    weak: true,
  }),
  sig({
    id: "compress-z",
    name: "compress(1) stream",
    mime: "application/x-compress",
    ext: "Z",
    offset: 0,
    hex: "1F9D",
    category: "archive",
    weak: true,
  }),
  sig({
    id: "lzh",
    name: "LHA/LZH archive",
    mime: "application/x-lzh-compressed",
    ext: "lzh",
    aliases: ["lha"],
    offset: 2,
    hex: "2D6C68",
    category: "archive",
  }),
  sig({
    id: "arj",
    name: "ARJ archive",
    mime: "application/x-arj",
    ext: "arj",
    offset: 0,
    hex: "60EA",
    category: "archive",
    weak: true,
  }),
  sig({
    id: "cab",
    name: "Microsoft cabinet",
    mime: "application/vnd.ms-cab-compressed",
    ext: "cab",
    offset: 0,
    hex: "4D534346",
    category: "archive",
  }),
  sig({
    id: "tar",
    name: "TAR archive",
    mime: "application/x-tar",
    ext: "tar",
    offset: 257,
    hex: "7573746172",
    category: "archive",
  }),
  sig({
    id: "cpio",
    name: "cpio archive (portable ASCII)",
    mime: "application/x-cpio",
    ext: "cpio",
    offset: 0,
    hex: "303730373037",
    category: "archive",
  }),
  sig({
    id: "ar",
    name: "Unix ar archive (deb/static lib)",
    mime: "application/x-archive",
    ext: "a",
    aliases: ["deb", "lib"],
    offset: 0,
    hex: "213C617263683E",
    category: "archive",
  }),
  sig({
    id: "rpm",
    name: "RPM package",
    mime: "application/x-rpm",
    ext: "rpm",
    offset: 0,
    hex: "EDABEEDB",
    category: "archive",
  }),
  sig({
    id: "iso9660",
    name: "ISO 9660 image",
    mime: "application/x-iso9660-image",
    ext: "iso",
    offset: 32769,
    hex: "4344303031",
    category: "archive",
  }),
  sig({
    id: "stuffit",
    name: "StuffIt archive",
    mime: "application/x-stuffit",
    ext: "sit",
    offset: 0,
    hex: "53495421",
    category: "archive",
  }),
  sig({
    id: "ace",
    name: "ACE archive",
    mime: "application/x-ace-compressed",
    ext: "ace",
    offset: 7,
    hex: "2A2A4143452A2A",
    category: "archive",
  }),
  sig({
    id: "squashfs",
    name: "SquashFS image",
    mime: "application/x-squashfs",
    ext: "squashfs",
    offset: 0,
    hex: "68737173",
    category: "archive",
  }),
  sig({
    id: "wim",
    name: "Windows imaging (WIM)",
    mime: "application/x-ms-wim",
    ext: "wim",
    offset: 0,
    hex: "4D5357494D",
    category: "archive",
  }),
  sig({
    id: "xar",
    name: "XAR archive (macOS pkg)",
    mime: "application/x-xar",
    ext: "xar",
    aliases: ["pkg"],
    offset: 0,
    hex: "78617221",
    category: "archive",
  }),
  sig({
    id: "crx",
    name: "Chrome extension",
    mime: "application/x-chrome-extension",
    ext: "crx",
    offset: 0,
    hex: "43723234",
    category: "archive",
  }),
  sig({
    id: "alz",
    name: "ALZip archive",
    mime: "application/x-alz-compressed",
    ext: "alz",
    offset: 0,
    hex: "414C5A01",
    category: "archive",
  }),
  sig({
    id: "zoo",
    name: "Zoo archive",
    mime: "application/x-zoo",
    ext: "zoo",
    offset: 0,
    hex: "5A4F4F20",
    category: "archive",
  }),

  // ── executables / bytecode (the high-risk family, §7.6) ─────────────
  sig({
    id: "pe-mz",
    name: "DOS/Windows executable (MZ)",
    mime: "application/vnd.microsoft.portable-executable",
    ext: "exe",
    aliases: ["dll", "sys", "scr", "com", "ocx", "efi"],
    offset: 0,
    hex: "4D5A",
    category: "executable",
    risk: "executable",
    weak: true,
  }),
  sig({
    id: "elf",
    name: "ELF executable/shared object",
    mime: "application/x-elf",
    ext: "elf",
    aliases: ["so", "o", "bin", "ko"],
    offset: 0,
    hex: "7F454C46",
    category: "executable",
    risk: "executable",
  }),
  sig({
    id: "macho32",
    name: "Mach-O executable (32-bit)",
    mime: "application/x-mach-binary",
    ext: "macho",
    aliases: ["dylib", "bundle"],
    offset: 0,
    hex: "FEEDFACE",
    category: "executable",
    risk: "executable",
  }),
  sig({
    id: "macho64",
    name: "Mach-O executable (64-bit)",
    mime: "application/x-mach-binary",
    ext: "macho",
    aliases: ["dylib", "bundle"],
    offset: 0,
    hex: "FEEDFACF",
    category: "executable",
    risk: "executable",
  }),
  sig({
    id: "macho32-rev",
    name: "Mach-O executable (32-bit, reverse byte order)",
    mime: "application/x-mach-binary",
    ext: "macho",
    offset: 0,
    hex: "CEFAEDFE",
    category: "executable",
    risk: "executable",
  }),
  sig({
    id: "macho64-rev",
    name: "Mach-O executable (64-bit, reverse byte order)",
    mime: "application/x-mach-binary",
    ext: "macho",
    offset: 0,
    hex: "CFFAEDFE",
    category: "executable",
    risk: "executable",
  }),
  sig({
    id: "cafebabe",
    name: "Java class file or Mach-O universal binary",
    mime: "application/java-vm",
    ext: "class",
    aliases: ["macho"],
    offset: 0,
    hex: "CAFEBABE",
    category: "executable",
    risk: "executable",
  }),
  sig({
    id: "macho-fat-rev",
    name: "Mach-O universal binary (reverse byte order)",
    mime: "application/x-mach-binary",
    ext: "macho",
    offset: 0,
    hex: "BEBAFECA",
    category: "executable",
    risk: "executable",
  }),
  sig({
    id: "wasm",
    name: "WebAssembly module",
    mime: "application/wasm",
    ext: "wasm",
    offset: 0,
    hex: "0061736D",
    category: "executable",
    risk: "executable",
  }),
  sig({
    id: "dex",
    name: "Dalvik executable",
    mime: "application/x-dex",
    ext: "dex",
    offset: 0,
    hex: "6465780A",
    category: "executable",
    risk: "executable",
  }),
  sig({
    id: "llvm-bc",
    name: "LLVM bitcode",
    mime: "application/x-llvm-bitcode",
    ext: "bc",
    offset: 0,
    hex: "4243C0DE",
    category: "executable",
    risk: "executable",
  }),
  sig({
    id: "lua-bytecode",
    name: "Lua bytecode",
    mime: "application/x-lua-bytecode",
    ext: "luac",
    offset: 0,
    hex: "1B4C7561",
    category: "executable",
    risk: "executable",
  }),
  sig({
    id: "java-serialized",
    name: "Java serialized object stream",
    mime: "application/x-java-serialized-object",
    ext: "ser",
    offset: 0,
    hex: "ACED0005",
    category: "executable",
    risk: "executable",
  }),
  sig({
    id: "shebang",
    name: "Script with shebang line",
    mime: "text/x-script",
    ext: "sh",
    aliases: ["bash", "py", "pl", "rb", "zsh"],
    offset: 0,
    hex: "2321",
    category: "executable",
    risk: "script",
    weak: true,
  }),

  // ── fonts ───────────────────────────────────────────────────────────
  sig({
    id: "ttf",
    name: "TrueType font",
    mime: "font/ttf",
    ext: "ttf",
    offset: 0,
    hex: "0001000000",
    category: "font",
  }),
  sig({
    id: "otf",
    name: "OpenType font (CFF)",
    mime: "font/otf",
    ext: "otf",
    offset: 0,
    hex: "4F54544F",
    category: "font",
  }),
  sig({
    id: "ttc",
    name: "TrueType collection",
    mime: "font/collection",
    ext: "ttc",
    offset: 0,
    hex: "74746366",
    category: "font",
  }),
  sig({
    id: "woff",
    name: "WOFF font",
    mime: "font/woff",
    ext: "woff",
    offset: 0,
    hex: "774F4646",
    category: "font",
  }),
  sig({
    id: "woff2",
    name: "WOFF2 font",
    mime: "font/woff2",
    ext: "woff2",
    offset: 0,
    hex: "774F4632",
    category: "font",
  }),
  sig({
    id: "eot",
    name: "Embedded OpenType font",
    mime: "application/vnd.ms-fontobject",
    ext: "eot",
    offset: 34,
    hex: "4C50",
    category: "font",
    weak: true,
  }),
  sig({
    id: "pfb",
    name: "PostScript Type 1 font (PFB)",
    mime: "application/x-font-type1",
    ext: "pfb",
    offset: 0,
    hex: "8001",
    category: "font",
    weak: true,
  }),

  // ── keys / certificates ─────────────────────────────────────────────
  sig({
    id: "pem",
    name: "PEM-encoded key or certificate",
    mime: "application/x-pem-file",
    ext: "pem",
    aliases: ["crt", "cer", "key", "csr", "asc"],
    offset: 0,
    hex: "2D2D2D2D2D424547494E20",
    category: "crypto",
  }),
  sig({
    id: "der",
    name: "DER/ASN.1 structure (certificate, PKCS)",
    mime: "application/pkix-cert",
    ext: "der",
    aliases: ["p12", "pfx", "cer"],
    offset: 0,
    hex: "3082",
    category: "crypto",
    weak: true,
  }),
  sig({
    id: "pgp-public",
    name: "OpenPGP public key ring",
    mime: "application/pgp-keys",
    ext: "gpg",
    offset: 0,
    hex: "9901",
    category: "crypto",
    weak: true,
  }),
  sig({
    id: "pgp-secret",
    name: "OpenPGP secret key ring",
    mime: "application/pgp-keys",
    ext: "gpg",
    offset: 0,
    hex: "9501",
    category: "crypto",
    weak: true,
  }),
  sig({
    id: "jks",
    name: "Java KeyStore",
    mime: "application/x-java-keystore",
    ext: "jks",
    offset: 0,
    hex: "FEEDFEED",
    category: "crypto",
  }),
  sig({
    id: "ppk",
    name: "PuTTY private key",
    mime: "application/x-putty-private-key",
    ext: "ppk",
    offset: 0,
    hex: "50755454592D557365722D4B65792D46696C65",
    category: "crypto",
  }),

  // ── disk / VM images ────────────────────────────────────────────────
  sig({
    id: "vmdk",
    name: "VMware disk image",
    mime: "application/x-vmdk",
    ext: "vmdk",
    offset: 0,
    hex: "4B444D56",
    category: "disk",
  }),
  sig({
    id: "vdi",
    name: "VirtualBox disk image",
    mime: "application/x-virtualbox-vdi",
    ext: "vdi",
    offset: 0,
    hex: "3C3C3C20",
    category: "disk",
    weak: true,
  }),
  sig({
    id: "vhd",
    name: "Virtual hard disk (VHD)",
    mime: "application/x-vhd",
    ext: "vhd",
    offset: 0,
    hex: "636F6E6563746978",
    category: "disk",
  }),
  sig({
    id: "vhdx",
    name: "Virtual hard disk (VHDX)",
    mime: "application/x-vhdx",
    ext: "vhdx",
    offset: 0,
    hex: "7668647866696C65",
    category: "disk",
  }),
  sig({
    id: "qcow",
    name: "QEMU copy-on-write image",
    mime: "application/x-qemu-disk",
    ext: "qcow2",
    aliases: ["qcow"],
    offset: 0,
    hex: "514649FB",
    category: "disk",
  }),
  sig({
    id: "mbr",
    name: "Master boot record / boot sector",
    mime: "application/x-raw-disk-image",
    ext: "img",
    offset: 510,
    hex: "55AA",
    category: "disk",
    weak: true,
  }),
  sig({
    id: "ewf",
    name: "EnCase evidence file (E01)",
    mime: "application/x-ewf",
    ext: "e01",
    offset: 0,
    hex: "4556460D0A",
    category: "disk",
  }),

  // ── databases / columnar data ───────────────────────────────────────
  sig({
    id: "sqlite",
    name: "SQLite 3 database",
    mime: "application/vnd.sqlite3",
    ext: "sqlite",
    aliases: ["db", "sqlite3"],
    offset: 0,
    hex: "53514C69746520666F726D6174203300",
    category: "database",
  }),
  sig({
    id: "mdb",
    name: "Access database (JET)",
    mime: "application/vnd.ms-access",
    ext: "mdb",
    offset: 4,
    hex: "5374616E64617264204A6574204442",
    category: "database",
  }),
  sig({
    id: "accdb",
    name: "Access database (ACE)",
    mime: "application/vnd.ms-access",
    ext: "accdb",
    offset: 4,
    hex: "5374616E6461726420414345204442",
    category: "database",
  }),
  sig({
    id: "parquet",
    name: "Apache Parquet file",
    mime: "application/vnd.apache.parquet",
    ext: "parquet",
    offset: 0,
    hex: "50415231",
    category: "database",
  }),
  sig({
    id: "avro",
    name: "Apache Avro object container",
    mime: "application/avro",
    ext: "avro",
    offset: 0,
    hex: "4F626A01",
    category: "database",
  }),
  sig({
    id: "hdf5",
    name: "HDF5 data set",
    mime: "application/x-hdf5",
    ext: "h5",
    aliases: ["hdf5"],
    offset: 0,
    hex: "894844460D0A1A0A",
    category: "database",
  }),
  sig({
    id: "netcdf",
    name: "NetCDF classic data set",
    mime: "application/x-netcdf",
    ext: "nc",
    offset: 0,
    hex: "43444601",
    category: "database",
  }),

  // ── misc / dev / forensics ──────────────────────────────────────────
  sig({
    id: "torrent",
    name: "BitTorrent metainfo",
    mime: "application/x-bittorrent",
    ext: "torrent",
    offset: 0,
    hex: "64383A616E6E6F756E6365",
    category: "misc",
  }),
  sig({
    id: "pst",
    name: "Outlook data file (PST/OST)",
    mime: "application/vnd.ms-outlook-pst",
    ext: "pst",
    aliases: ["ost"],
    offset: 0,
    hex: "2142444E",
    category: "misc",
  }),
  sig({
    id: "git-pack",
    name: "Git packfile",
    mime: "application/x-git-packfile",
    ext: "pack",
    offset: 0,
    hex: "5041434B",
    category: "misc",
  }),
  sig({
    id: "git-index",
    name: "Git index",
    mime: "application/x-git-index",
    ext: "index",
    offset: 0,
    hex: "44495243",
    category: "misc",
  }),
  sig({
    id: "shapefile",
    name: "ESRI shapefile",
    mime: "application/x-esri-shape",
    ext: "shp",
    offset: 0,
    hex: "0000270A",
    category: "misc",
  }),
  sig({
    id: "pcap-le",
    name: "libpcap capture (little-endian)",
    mime: "application/vnd.tcpdump.pcap",
    ext: "pcap",
    offset: 0,
    hex: "D4C3B2A1",
    category: "misc",
  }),
  sig({
    id: "pcap-be",
    name: "libpcap capture (big-endian)",
    mime: "application/vnd.tcpdump.pcap",
    ext: "pcap",
    offset: 0,
    hex: "A1B2C3D4",
    category: "misc",
  }),
  sig({
    id: "pcapng",
    name: "pcapng capture",
    mime: "application/x-pcapng",
    ext: "pcapng",
    offset: 0,
    hex: "0A0D0D0A",
    category: "misc",
  }),
  sig({
    id: "regf",
    name: "Windows registry hive",
    mime: "application/x-ms-registry",
    ext: "hiv",
    offset: 0,
    hex: "72656766",
    category: "misc",
  }),
  sig({
    id: "lnk",
    name: "Windows shortcut",
    mime: "application/x-ms-shortcut",
    ext: "lnk",
    offset: 0,
    hex: "4C0000000114020000000000C000000000000046",
    category: "misc",
  }),
  sig({
    id: "evtx",
    name: "Windows event log (EVTX)",
    mime: "application/x-ms-evtx",
    ext: "evtx",
    offset: 0,
    hex: "456C6646696C6500",
    category: "misc",
  }),
  sig({
    id: "blender",
    name: "Blender scene",
    mime: "application/x-blender",
    ext: "blend",
    offset: 0,
    hex: "424C454E444552",
    category: "misc",
  }),
  sig({
    id: "dwg",
    name: "AutoCAD drawing",
    mime: "image/vnd.dwg",
    ext: "dwg",
    offset: 0,
    hex: "41433130",
    category: "misc",
  }),
  sig({
    id: "bplist",
    name: "Apple binary property list",
    mime: "application/x-plist",
    ext: "plist",
    offset: 0,
    hex: "62706C69737430",
    category: "misc",
  }),
  sig({
    id: "ds-store",
    name: "macOS .DS_Store",
    mime: "application/x-apple-ds-store",
    ext: "DS_Store",
    offset: 0,
    hex: "0000000142756431",
    category: "misc",
  }),
  sig({
    id: "npy",
    name: "NumPy array",
    mime: "application/x-numpy",
    ext: "npy",
    offset: 0,
    hex: "934E554D5059",
    category: "misc",
  }),
  sig({
    id: "matlab",
    name: "MATLAB MAT-file",
    mime: "application/x-matlab-data",
    ext: "mat",
    offset: 0,
    hex: "4D41544C4142",
    category: "misc",
  }),

  // ── encoding marks: a BOM is a signature, but only of the encoding ──
  sig({
    id: "bom-utf8",
    name: "Text with UTF-8 BOM",
    mime: "text/plain",
    ext: "txt",
    offset: 0,
    hex: "EFBBBF",
    category: "text",
  }),
  sig({
    id: "bom-utf32le",
    name: "Text with UTF-32 LE BOM",
    mime: "text/plain",
    ext: "txt",
    offset: 0,
    hex: "FFFE0000",
    category: "text",
  }),
  sig({
    id: "bom-utf32be",
    name: "Text with UTF-32 BE BOM",
    mime: "text/plain",
    ext: "txt",
    offset: 0,
    hex: "0000FEFF",
    category: "text",
  }),
  sig({
    id: "bom-utf16le",
    name: "Text with UTF-16 LE BOM",
    mime: "text/plain",
    ext: "txt",
    offset: 0,
    hex: "FFFE",
    category: "text",
    weak: true,
  }),
  sig({
    id: "bom-utf16be",
    name: "Text with UTF-16 BE BOM",
    mime: "text/plain",
    ext: "txt",
    offset: 0,
    hex: "FEFF",
    category: "text",
    weak: true,
  }),
];

/** ISO-BMFF major brands (`ftyp` box, bytes 8–11) — container/brand only, never codec (§7.5). */
const ISO_BMFF_BRANDS: Readonly<
  Record<string, { readonly name: string; readonly mime: string; readonly ext: string }>
> = {
  isom: { name: "MP4 video", mime: "video/mp4", ext: "mp4" },
  iso2: { name: "MP4 video", mime: "video/mp4", ext: "mp4" },
  iso4: { name: "MP4 video", mime: "video/mp4", ext: "mp4" },
  iso5: { name: "MP4 video", mime: "video/mp4", ext: "mp4" },
  iso6: { name: "MP4 video", mime: "video/mp4", ext: "mp4" },
  mp41: { name: "MP4 video", mime: "video/mp4", ext: "mp4" },
  mp42: { name: "MP4 video", mime: "video/mp4", ext: "mp4" },
  avc1: { name: "MP4 video", mime: "video/mp4", ext: "mp4" },
  dash: { name: "MP4 video (DASH)", mime: "video/mp4", ext: "mp4" },
  mmp4: { name: "MP4 video (mobile)", mime: "video/mp4", ext: "mp4" },
  "qt  ": { name: "QuickTime movie", mime: "video/quicktime", ext: "mov" },
  M4A: { name: "MPEG-4 audio", mime: "audio/mp4", ext: "m4a" },
  M4B: { name: "MPEG-4 audiobook", mime: "audio/mp4", ext: "m4b" },
  M4P: { name: "MPEG-4 protected audio", mime: "audio/mp4", ext: "m4p" },
  M4V: { name: "MPEG-4 video (M4V)", mime: "video/x-m4v", ext: "m4v" },
  heic: { name: "HEIC image", mime: "image/heic", ext: "heic" },
  heix: { name: "HEIC image", mime: "image/heic", ext: "heic" },
  heim: { name: "HEIC image", mime: "image/heic", ext: "heic" },
  heis: { name: "HEIC image sequence", mime: "image/heic-sequence", ext: "heics" },
  hevc: { name: "HEIC image sequence", mime: "image/heic-sequence", ext: "heics" },
  mif1: { name: "HEIF image", mime: "image/heif", ext: "heif" },
  msf1: { name: "HEIF image sequence", mime: "image/heif-sequence", ext: "heifs" },
  avif: { name: "AVIF image", mime: "image/avif", ext: "avif" },
  avis: { name: "AVIF image sequence", mime: "image/avif-sequence", ext: "avifs" },
  crx: { name: "Canon CR3 raw image", mime: "image/x-canon-cr3", ext: "cr3" },
  f4v: { name: "Flash MP4 video", mime: "video/x-f4v", ext: "f4v" },
  "3gp4": { name: "3GPP video", mime: "video/3gpp", ext: "3gp" },
  "3gp5": { name: "3GPP video", mime: "video/3gpp", ext: "3gp" },
  "3g2a": { name: "3GPP2 video", mime: "video/3gpp2", ext: "3g2" },
};

/* ── byte helpers (pure, no Buffer so the engine runs in both runtimes) ── */

const B64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function decodeBase64(raw: string): Uint8Array {
  const payload = raw.includes(",") ? raw.slice(raw.indexOf(",") + 1) : raw;
  const cleaned = payload
    .replace(/[\s\r\n]/g, "")
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .replace(/=+$/, "");
  const out = new Uint8Array(Math.floor((cleaned.length * 3) / 4));
  let acc = 0;
  let bits = 0;
  let n = 0;
  for (const ch of cleaned) {
    const v = B64_ALPHABET.indexOf(ch);
    if (v < 0) throw new Error(`invalid_base64: unexpected character ${JSON.stringify(ch)}`);
    acc = (acc << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[n++] = (acc >> bits) & 0xff;
    }
  }
  return out.subarray(0, n);
}

function decodeHexInput(raw: string): Uint8Array {
  const cleaned = raw.replace(/0x/gi, "").replace(/[\s,;:_|-]/g, "");
  if (cleaned.length === 0) throw new Error("empty_input: the hex string contains no bytes");
  if (!/^[0-9a-fA-F]+$/.test(cleaned)) {
    throw new Error("invalid_hex: input contains non-hexadecimal characters");
  }
  if (cleaned.length % 2 !== 0) {
    throw new Error("invalid_hex: odd number of hex digits — a byte needs two");
  }
  const out = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function toHex(bytes: Uint8Array, from: number, length: number): string {
  let out = "";
  const end = Math.min(from + length, bytes.length);
  for (let i = from; i < end; i += 1) out += (bytes[i] ?? 0).toString(16).padStart(2, "0");
  return out.toUpperCase();
}

function matchesAt(bytes: Uint8Array, offset: number, hex: string): boolean {
  const n = hex.length / 2;
  if (offset < 0 || offset + n > bytes.length) return false;
  for (let i = 0; i < n; i += 1) {
    const pair = hex.slice(i * 2, i * 2 + 2);
    if (pair === "??") continue;
    if (bytes[offset + i] !== Number.parseInt(pair, 16)) return false;
  }
  return true;
}

function concreteByteCount(s: FileSignature): number {
  const count = (hex: string) => {
    let n = 0;
    for (let i = 0; i < hex.length; i += 2) if (hex.slice(i, i + 2) !== "??") n += 1;
    return n;
  };
  return count(s.hex) + (s.also ?? []).reduce((sum, a) => sum + count(a.hex), 0);
}

function ascii(bytes: Uint8Array, from: number, length: number): string {
  let out = "";
  const end = Math.min(from + length, bytes.length);
  for (let i = from; i < end; i += 1) {
    const b = bytes[i] ?? 0;
    out += b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : ".";
  }
  return out;
}

/** Byte-for-char decode that preserves whitespace — for structural sniffing. */
function latin1(bytes: Uint8Array, from: number, length: number): string {
  let out = "";
  const end = Math.min(from + length, bytes.length);
  for (let i = from; i < end; i += 1) out += String.fromCharCode(bytes[i] ?? 0);
  return out;
}

function indexOfBytes(haystack: Uint8Array, needle: Uint8Array, from = 0): number {
  outer: for (let i = from; i + needle.length <= haystack.length; i += 1) {
    for (let j = 0; j < needle.length; j += 1) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

function asciiBytes(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) out[i] = text.charCodeAt(i) & 0xff;
  return out;
}

function utf16leBytes(text: string): Uint8Array {
  const out = new Uint8Array(text.length * 2);
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    out[i * 2] = code & 0xff;
    out[i * 2 + 1] = (code >> 8) & 0xff;
  }
  return out;
}

function u16le(bytes: Uint8Array, at: number): number {
  return (bytes[at] ?? 0) | ((bytes[at + 1] ?? 0) << 8);
}

function u32le(bytes: Uint8Array, at: number): number {
  return (
    ((bytes[at] ?? 0) |
      ((bytes[at + 1] ?? 0) << 8) |
      ((bytes[at + 2] ?? 0) << 16) |
      ((bytes[at + 3] ?? 0) << 24)) >>>
    0
  );
}

function shannonEntropy(bytes: Uint8Array): number {
  if (bytes.length === 0) return 0;
  const counts = new Array<number>(256).fill(0);
  for (const b of bytes) counts[b] = (counts[b] ?? 0) + 1;
  let h = 0;
  for (const c of counts) {
    if (c === 0) continue;
    const p = c / bytes.length;
    h -= p * Math.log2(p);
  }
  return Math.round(h * 1000) / 1000;
}

/* ── container drill-downs (the real internal read, §7.3) ─────────────── */

export interface ContainerDrillDown {
  readonly kind: ContainerKind | "cafebabe";
  readonly resolvedType: string | null;
  readonly resolvedMime: string | null;
  readonly resolvedExtension: string | null;
  readonly evidence: readonly string[];
  readonly note?: string;
}

/** ZIP local file header signature: `PK` 0x03 0x04 (APPNOTE 6.3.x, §4.3.7). */
const ZIP_LOCAL_HEADER = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);

const ODF_MIMES: Readonly<Record<string, { name: string; ext: string }>> = {
  "application/epub+zip": { name: "EPUB e-book", ext: "epub" },
  "application/vnd.oasis.opendocument.text": { name: "ODF text document", ext: "odt" },
  "application/vnd.oasis.opendocument.spreadsheet": { name: "ODF spreadsheet", ext: "ods" },
  "application/vnd.oasis.opendocument.presentation": { name: "ODF presentation", ext: "odp" },
  "application/vnd.oasis.opendocument.graphics": { name: "ODF drawing", ext: "odg" },
};

/**
 * Walk the ZIP local file headers present in the sampled head and read their
 * member names — the honest way to tell DOCX from JAR from APK. Never infers
 * the subtype from the filename the caller supplied.
 */
function drillZip(bytes: Uint8Array): ContainerDrillDown {
  const names: string[] = [];
  let firstStoredMimetype: string | null = null;
  let at = 0;
  while (names.length < 64) {
    const hit = indexOfBytes(bytes, ZIP_LOCAL_HEADER, at);
    if (hit < 0) break;
    const nameLen = u16le(bytes, hit + 26);
    const extraLen = u16le(bytes, hit + 28);
    const method = u16le(bytes, hit + 8);
    const compressedSize = u32le(bytes, hit + 18);
    const nameStart = hit + 30;
    if (nameStart + nameLen > bytes.length || nameLen === 0) break;
    const name = ascii(bytes, nameStart, nameLen);
    names.push(name);
    // ODF/EPUB put an uncompressed `mimetype` member first; its bytes are the
    // authoritative subtype, so read them rather than guessing.
    if (names.length === 1 && name === "mimetype" && method === 0) {
      const dataStart = nameStart + nameLen + extraLen;
      const size = Math.min(compressedSize, 128);
      if (size > 0 && dataStart + size <= bytes.length) {
        firstStoredMimetype = ascii(bytes, dataStart, size).trim();
      }
    }
    at = nameStart + nameLen;
  }

  const has = (needle: string) => names.some((n) => n === needle);
  const startsWith = (prefix: string) => names.some((n) => n.startsWith(prefix));

  const odfHit = firstStoredMimetype ? ODF_MIMES[firstStoredMimetype] : undefined;
  if (firstStoredMimetype && odfHit) {
    const hit = odfHit;
    return {
      kind: "zip",
      resolvedType: hit.name,
      resolvedMime: firstStoredMimetype,
      resolvedExtension: hit.ext,
      evidence: [`first stored member "mimetype" = ${firstStoredMimetype}`],
    };
  }
  if (has("AndroidManifest.xml") || has("classes.dex")) {
    return {
      kind: "zip",
      resolvedType: "Android package (APK)",
      resolvedMime: "application/vnd.android.package-archive",
      resolvedExtension: "apk",
      evidence: names.filter((n) => n === "AndroidManifest.xml" || n === "classes.dex"),
    };
  }
  if (has("[Content_Types].xml") || startsWith("_rels/")) {
    const evidence = names.filter(
      (n) =>
        n === "[Content_Types].xml" || n.startsWith("_rels/") || /^(word|xl|ppt|visio)\//.test(n),
    );
    if (startsWith("word/")) {
      return {
        kind: "zip",
        resolvedType: "Word document (DOCX)",
        resolvedMime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        resolvedExtension: "docx",
        evidence,
      };
    }
    if (startsWith("xl/")) {
      return {
        kind: "zip",
        resolvedType: "Excel workbook (XLSX)",
        resolvedMime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        resolvedExtension: "xlsx",
        evidence,
      };
    }
    if (startsWith("ppt/")) {
      return {
        kind: "zip",
        resolvedType: "PowerPoint presentation (PPTX)",
        resolvedMime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        resolvedExtension: "pptx",
        evidence,
      };
    }
    return {
      kind: "zip",
      resolvedType: "Office Open XML package",
      resolvedMime: "application/vnd.openxmlformats-officedocument",
      resolvedExtension: null,
      evidence,
      note: "OOXML package confirmed, but no word/ xl/ ppt/ member appeared in the sampled header — raise maxBytesRead to name the subtype.",
    };
  }
  if (has("META-INF/MANIFEST.MF")) {
    return {
      kind: "zip",
      resolvedType: "Java archive (JAR)",
      resolvedMime: "application/java-archive",
      resolvedExtension: "jar",
      evidence: ["META-INF/MANIFEST.MF"],
    };
  }
  return {
    kind: "zip",
    resolvedType: null,
    resolvedMime: null,
    resolvedExtension: null,
    evidence: names.slice(0, 8),
    note:
      names.length === 0
        ? "No readable local file header in the sampled bytes — reporting a plain ZIP container."
        : "ZIP container with no OOXML/ODF/JAR/APK marker in the sampled members — reporting a plain ZIP container rather than guessing from the filename.",
  };
}

function drillIsoBmff(bytes: Uint8Array): ContainerDrillDown {
  const brandRaw = ascii(bytes, 8, 4);
  const brand = brandRaw.replace(/\.+$/, "");
  const hit = ISO_BMFF_BRANDS[brandRaw] ?? ISO_BMFF_BRANDS[brand] ?? ISO_BMFF_BRANDS[brand.trim()];
  if (!hit) {
    return {
      kind: "iso-bmff",
      resolvedType: null,
      resolvedMime: null,
      resolvedExtension: null,
      evidence: [`ftyp major brand "${brandRaw}"`],
      note: "Unrecognised ISO-BMFF brand — the container is confirmed, the specific format is not.",
    };
  }
  return {
    kind: "iso-bmff",
    resolvedType: hit.name,
    resolvedMime: hit.mime,
    resolvedExtension: hit.ext,
    evidence: [`ftyp major brand "${brandRaw}"`],
    note: "Brand names the container only; codec streams inside it are not inspected.",
  };
}

function drillEbml(bytes: Uint8Array): ContainerDrillDown {
  if (indexOfBytes(bytes, asciiBytes("webm")) >= 0) {
    return {
      kind: "ebml",
      resolvedType: "WebM video",
      resolvedMime: "video/webm",
      resolvedExtension: "webm",
      evidence: ['EBML DocType string "webm"'],
    };
  }
  if (indexOfBytes(bytes, asciiBytes("matroska")) >= 0) {
    return {
      kind: "ebml",
      resolvedType: "Matroska video",
      resolvedMime: "video/x-matroska",
      resolvedExtension: "mkv",
      evidence: ['EBML DocType string "matroska"'],
    };
  }
  return {
    kind: "ebml",
    resolvedType: null,
    resolvedMime: null,
    resolvedExtension: null,
    evidence: [],
    note: "EBML container confirmed, but no DocType string in the sampled header.",
  };
}

const CFBF_MARKERS: readonly {
  needle: string;
  name: string;
  mime: string;
  ext: string;
}[] = [
  { needle: "WordDocument", name: "Word document (DOC)", mime: "application/msword", ext: "doc" },
  {
    needle: "Workbook",
    name: "Excel workbook (XLS)",
    mime: "application/vnd.ms-excel",
    ext: "xls",
  },
  {
    needle: "PowerPoint Document",
    name: "PowerPoint presentation (PPT)",
    mime: "application/vnd.ms-powerpoint",
    ext: "ppt",
  },
  {
    needle: "__substg1.0_",
    name: "Outlook message (MSG)",
    mime: "application/vnd.ms-outlook",
    ext: "msg",
  },
  {
    needle: "VisioDocument",
    name: "Visio drawing (VSD)",
    mime: "application/vnd.visio",
    ext: "vsd",
  },
];

function drillCfbf(bytes: Uint8Array): ContainerDrillDown {
  for (const marker of CFBF_MARKERS) {
    if (indexOfBytes(bytes, utf16leBytes(marker.needle)) >= 0) {
      return {
        kind: "cfbf",
        resolvedType: marker.name,
        resolvedMime: marker.mime,
        resolvedExtension: marker.ext,
        evidence: [`directory entry "${marker.needle}"`],
      };
    }
  }
  return {
    kind: "cfbf",
    resolvedType: null,
    resolvedMime: null,
    resolvedExtension: null,
    evidence: [],
    note: "OLE2 compound file confirmed; no known stream name in the sampled header, so the subtype (DOC/XLS/PPT/MSG/MSI) is not claimed.",
  };
}

/**
 * `CA FE BA BE` is both a Java class file and a Mach-O universal binary. The
 * next 4 bytes decide: a class file stores minor+major version there (major ≥ 45
 * for Java 1.1 and up), a fat Mach-O stores `nfat_arch`, a small architecture
 * count. Reported as a disambiguation, not silently picked.
 */
function drillCafebabe(bytes: Uint8Array): ContainerDrillDown {
  const major = ((bytes[6] ?? 0) << 8) | (bytes[7] ?? 0);
  if (major >= 45) {
    return {
      kind: "cafebabe",
      resolvedType: "Java class file",
      resolvedMime: "application/java-vm",
      resolvedExtension: "class",
      evidence: [`class file major version ${major}`],
    };
  }
  return {
    kind: "cafebabe",
    resolvedType: "Mach-O universal (fat) binary",
    resolvedMime: "application/x-mach-binary",
    resolvedExtension: "macho",
    evidence: [`nfat_arch = ${major} (below the lowest Java class major version, 45)`],
  };
}

/* ── extension index + mismatch tiering (§7.6, §7.8) ─────────────────── */

interface ExtensionFact {
  readonly category: SignatureCategory;
  readonly risk?: "executable" | "script";
}

const EXTRA_EXTENSIONS: Readonly<Record<string, ExtensionFact>> = {
  // ZIP-family and text extensions that no byte signature of their own produces
  docx: { category: "document" },
  xlsx: { category: "document" },
  pptx: { category: "document" },
  odt: { category: "document" },
  ods: { category: "document" },
  odp: { category: "document" },
  epub: { category: "document" },
  jar: { category: "archive" },
  apk: { category: "archive" },
  xpi: { category: "archive" },
  txt: { category: "text" },
  md: { category: "text" },
  csv: { category: "text" },
  tsv: { category: "text" },
  json: { category: "text" },
  yaml: { category: "text" },
  yml: { category: "text" },
  xml: { category: "text" },
  html: { category: "text" },
  htm: { category: "text" },
  svg: { category: "image" },
  log: { category: "text" },
  ini: { category: "text" },
  bat: { category: "executable", risk: "script" },
  cmd: { category: "executable", risk: "script" },
  ps1: { category: "executable", risk: "script" },
  vbs: { category: "executable", risk: "script" },
  js: { category: "executable", risk: "script" },
  jse: { category: "executable", risk: "script" },
  wsf: { category: "executable", risk: "script" },
  hta: { category: "executable", risk: "script" },
  msi: { category: "executable", risk: "executable" },
  app: { category: "executable", risk: "executable" },
};

function buildExtensionIndex(): Map<string, ExtensionFact> {
  const index = new Map<string, ExtensionFact>();
  for (const s of FILE_SIGNATURES) {
    for (const ext of [s.ext, ...(s.aliases ?? [])]) {
      const key = ext.toLowerCase();
      if (index.get(key)?.risk) continue;
      index.set(key, s.risk ? { category: s.category, risk: s.risk } : { category: s.category });
    }
  }
  // The curated map wins: `.docx` is a document even though it appears in the
  // ZIP signature's alias list, and `.js` stays a script no signature marks.
  for (const [ext, fact] of Object.entries(EXTRA_EXTENSIONS)) index.set(ext, fact);
  return index;
}

const EXTENSION_INDEX = buildExtensionIndex();

/**
 * Extensions whose format *is* text on disk. Byte inspection can never confirm
 * one of these (§7.7), but it can confirm they are not contradicted — which is
 * a different answer from "the extension disagrees", and the two must not share
 * a tier. Anything not listed here is a binary format, so text bytes wearing it
 * are a genuine mismatch.
 */
const TEXT_SERIALISED_EXTENSIONS: ReadonlySet<string> = new Set([
  "txt",
  "md",
  "markdown",
  "csv",
  "tsv",
  "json",
  "jsonc",
  "json5",
  "yaml",
  "yml",
  "toml",
  "xml",
  "svg",
  "html",
  "htm",
  "css",
  "scss",
  "less",
  "log",
  "ini",
  "cfg",
  "conf",
  "env",
  "properties",
  "sql",
  "srt",
  "vtt",
  "ics",
  "pem",
  "asc",
  "csr",
  "diff",
  "patch",
  "sh",
  "bash",
  "zsh",
  "bat",
  "cmd",
  "ps1",
  "vbs",
  "js",
  "mjs",
  "cjs",
  "jsx",
  "ts",
  "tsx",
  "py",
  "rb",
  "pl",
  "php",
  "go",
  "rs",
  "java",
  "kt",
  "c",
  "h",
  "cpp",
  "hpp",
  "cs",
  "swift",
  "lua",
  "r",
  "m",
]);

/** Extensions that carry no execution expectation — the spoof target set. */
const PASSIVE_CATEGORIES: ReadonlySet<SignatureCategory> = new Set<SignatureCategory>([
  "image",
  "audio",
  "video",
  "document",
  "archive",
  "text",
  "font",
  "database",
]);

export type MismatchTier = "none" | "benign" | "mismatch" | "high-risk";

/* ── text sniffing (§7.7) ────────────────────────────────────────────── */

function isValidUtf8(bytes: Uint8Array): boolean {
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i] ?? 0;
    let need = 0;
    if (b <= 0x7f) need = 0;
    else if (b >= 0xc2 && b <= 0xdf) need = 1;
    else if (b >= 0xe0 && b <= 0xef) need = 2;
    else if (b >= 0xf0 && b <= 0xf4) need = 3;
    else return false;
    if (i + need >= bytes.length && need > 0) return true; // truncated tail of a sample
    for (let k = 1; k <= need; k += 1) {
      const c = bytes[i + k] ?? 0;
      if (c < 0x80 || c > 0xbf) return false;
    }
    i += need + 1;
  }
  return true;
}

function looksLikeText(bytes: Uint8Array): boolean {
  if (bytes.length === 0) return false;
  for (const b of bytes) {
    if (b === 0x00) return false;
    if (b < 0x20 && b !== 0x09 && b !== 0x0a && b !== 0x0d && b !== 0x0c && b !== 0x1b)
      return false;
  }
  return isValidUtf8(bytes);
}

/** Structural guesses only. Text formats have no signature, and we say so. */
function textHints(sample: string): string[] {
  const trimmed = sample.replace(/^﻿/, "").trimStart();
  const hints: string[] = [];
  if (/^<\?xml/i.test(trimmed)) hints.push("XML");
  if (/^<svg[\s>]/i.test(trimmed)) hints.push("SVG");
  if (/^<!doctype html/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) hints.push("HTML");
  if (/^[[{]/.test(trimmed)) hints.push("JSON");
  if (/^---\s*(\r?\n|$)/.test(trimmed)) hints.push("YAML");
  if (/^#!/.test(trimmed)) hints.push("script (shebang)");
  if (/^(#{1,6}\s|\s*[-*]\s)/m.test(trimmed) && /\n/.test(trimmed)) hints.push("Markdown");
  const lines = trimmed
    .split(/\r?\n/)
    .filter((l) => l.length > 0)
    .slice(0, 5);
  if (lines.length >= 2) {
    const commas = lines.map((l) => (l.match(/,/g) ?? []).length);
    const tabs = lines.map((l) => (l.match(/\t/g) ?? []).length);
    if (commas[0] !== undefined && commas[0] > 0 && commas.every((c) => c === commas[0])) {
      hints.push("CSV");
    }
    if (tabs[0] !== undefined && tabs[0] > 0 && tabs.every((c) => c === tabs[0])) hints.push("TSV");
  }
  return hints;
}

/* ── the detector ────────────────────────────────────────────────────── */

export interface DetectInput {
  readonly fileBase64?: string;
  readonly hex?: string;
  readonly filename?: string;
  readonly reportedMime?: string;
  readonly maxBytesRead?: number;
  readonly hexDumpBytes?: number;
}

export interface SignatureMatch {
  readonly id: string;
  readonly name: string;
  readonly mime: string;
  readonly extension: string;
  readonly offset: number;
  readonly hex: string;
  readonly category: SignatureCategory;
  readonly weak: boolean;
}

function hexDumpOf(bytes: Uint8Array, limit: number): string {
  const end = Math.min(limit, bytes.length);
  const lines: string[] = [];
  for (let off = 0; off < end; off += 16) {
    const rowLen = Math.min(16, end - off);
    const pairs: string[] = [];
    for (let i = 0; i < 16; i += 1) {
      pairs.push(i < rowLen ? toHex(bytes, off + i, 1).toLowerCase() : "  ");
    }
    const left = pairs.slice(0, 8).join(" ");
    const right = pairs.slice(8).join(" ");
    lines.push(
      `${off.toString(16).padStart(8, "0")}  ${left}  ${right}  |${ascii(bytes, off, rowLen)}|`,
    );
  }
  return lines.join("\n");
}

export function detectFileType(input: DetectInput) {
  const maxBytesRead = input.maxBytesRead ?? 8192;
  const hexDumpBytes = input.hexDumpBytes ?? 128;
  const hasFile = typeof input.fileBase64 === "string" && input.fileBase64.length > 0;
  const hasHex = typeof input.hex === "string" && input.hex.length > 0;
  if (hasFile && hasHex) {
    throw new Error("invalid_input: pass either fileBase64 or hex, not both");
  }
  if (!hasFile && !hasHex) {
    throw new Error("invalid_input: provide fileBase64 (file bytes) or hex (leading bytes)");
  }

  const source: "file" | "hex" = hasFile ? "file" : "hex";
  const decoded = hasFile ? decodeBase64(input.fileBase64 ?? "") : decodeHexInput(input.hex ?? "");
  if (decoded.length === 0) {
    throw new Error("empty_input: 0 bytes — an empty file has no signature to read");
  }
  const bytes = decoded.length > maxBytesRead ? decoded.subarray(0, maxBytesRead) : decoded;
  const truncated = decoded.length > maxBytesRead;

  // §7.7: a file whose every byte is printable text has no byte signature. A
  // short, weak pattern landing on such a head is a coincidence, not evidence —
  // "BM" opens a BMP *and* the word "BMW", "P4" opens a Netpbm bitmap *and* a
  // changelog line. Script markers are exempt: text legitimately carries them,
  // and they are what the high-risk tier is built on.
  const textLike = looksLikeText(bytes);
  const coincidental = (s: FileSignature) =>
    textLike && s.weak === true && s.risk === undefined && concreteByteCount(s) <= 3;

  // Every match, not the first — polyglots depend on seeing all of them (§7.4).
  const matches: SignatureMatch[] = [];
  const coincidences: string[] = [];
  for (const s of FILE_SIGNATURES) {
    if (!matchesAt(bytes, s.offset, s.hex)) continue;
    if ((s.also ?? []).some((a) => !matchesAt(bytes, a.offset, a.hex))) continue;
    if (coincidental(s)) {
      coincidences.push(s.id);
      continue;
    }
    matches.push({
      id: s.id,
      name: s.name,
      mime: s.mime,
      extension: s.ext,
      offset: s.offset,
      hex: s.hex,
      category: s.category,
      weak: s.weak === true,
    });
  }
  matches.sort((a, b) => {
    const sa = FILE_SIGNATURES.find((s) => s.id === a.id) as FileSignature;
    const sb = FILE_SIGNATURES.find((s) => s.id === b.id) as FileSignature;
    const weak = Number(a.weak) - Number(b.weak);
    if (weak !== 0) return weak;
    return concreteByteCount(sb) - concreteByteCount(sa);
  });

  const primary = matches[0] ?? null;
  const primarySig = primary ? FILE_SIGNATURES.find((s) => s.id === primary.id) : undefined;

  let drill: ContainerDrillDown | null = null;
  if (primarySig?.container === "zip") drill = drillZip(bytes);
  else if (primarySig?.container === "iso-bmff") drill = drillIsoBmff(bytes);
  else if (primarySig?.container === "ebml") drill = drillEbml(bytes);
  else if (primarySig?.container === "cfbf") drill = drillCfbf(bytes);
  else if (primary?.id === "cafebabe") drill = drillCafebabe(bytes);

  // Structural hints need real line breaks, so this sample keeps them — unlike
  // `asciiPreview`, which replaces every control byte with a dot for display.
  const textSample = latin1(bytes, 0, Math.min(bytes.length, 4096));
  const isText = !primary && textLike;
  const hints = isText || primary?.category === "text" ? textHints(textSample) : [];

  let detectedType: string | null = primary?.name ?? null;
  let detectedMime: string | null = primary?.mime ?? null;
  let detectedExtension: string | null = primary?.extension ?? null;
  if (drill?.resolvedType) {
    detectedType = drill.resolvedType;
    detectedMime = drill.resolvedMime;
    detectedExtension = drill.resolvedExtension;
  }
  if (!primary && isText) {
    detectedType = "Plain text (format ambiguous)";
    detectedMime = "text/plain";
    detectedExtension = null;
  }

  let confidence: "match" | "container-only" | "ambiguous" | "none";
  if (primary && primarySig?.container && !drill?.resolvedType) confidence = "container-only";
  else if (primary?.id === "cafebabe" && !drill?.resolvedType) confidence = "container-only";
  else if (primary && !primary.weak) confidence = "match";
  else if (primary?.weak) confidence = "ambiguous";
  else if (isText) confidence = "ambiguous";
  else confidence = "none";

  // Embedded ZIP past offset 0 = GIFAR / PDF+ZIP shaped polyglot (§7.4).
  const embedded: { format: string; offset: number }[] = [];
  if (primarySig?.container !== "zip") {
    const at = indexOfBytes(bytes, ZIP_LOCAL_HEADER, 1);
    if (at > 0) embedded.push({ format: "ZIP archive", offset: at });
  }
  const distinctCategories = new Set(matches.map((m) => m.category));
  const polyglot = {
    detected: embedded.length > 0 || distinctCategories.size > 1,
    embedded,
    note:
      embedded.length > 0
        ? "A second container signature appears after the header — the file is valid under more than one format (polyglot or appended payload)."
        : distinctCategories.size > 1
          ? "More than one signature family matched the sampled bytes; review the candidate list before trusting a single verdict."
          : null,
  };

  // Three separate signals; they may legitimately disagree (§7.8).
  const filenameExtension = (() => {
    const name = input.filename?.trim();
    if (!name) return null;
    const dot = name.lastIndexOf(".");
    if (dot <= 0 || dot === name.length - 1) return null;
    return name.slice(dot + 1).toLowerCase();
  })();
  const reportedMime = input.reportedMime?.trim() || null;

  const declared = filenameExtension ? EXTENSION_INDEX.get(filenameExtension) : undefined;
  // After a drill-down the *resolved* format decides the family: a JAR inside a
  // ZIP is an archive, a DOCX inside the same ZIP shape is a document.
  const detectedCategory: SignatureCategory | null = drill?.resolvedExtension
    ? (EXTENSION_INDEX.get(drill.resolvedExtension.toLowerCase())?.category ??
      primary?.category ??
      null)
    : (primary?.category ?? null);
  // A container's alias list ("a zip may be any of these") must never stand in
  // for a verified subtype — that is exactly the shortcut §7.3 rejects. Once we
  // opened the container, only what we actually read counts as agreement.
  const expected = new Set<string>();
  const isContainer = Boolean(primarySig?.container) || primary?.id === "cafebabe";
  if (isContainer) {
    if (drill?.resolvedExtension) expected.add(drill.resolvedExtension.toLowerCase());
  } else if (primarySig) {
    for (const e of [primarySig.ext, ...(primarySig.aliases ?? [])]) expected.add(e.toLowerCase());
  }

  let mismatch: MismatchTier = "none";
  let mismatchReason = "";
  if (!filenameExtension) {
    mismatchReason = "No filename supplied — there is no claimed extension to compare against.";
  } else if (!primary && !isText) {
    mismatchReason =
      "No signature matched, so the claimed extension can be neither confirmed nor contradicted.";
  } else if (expected.has(filenameExtension)) {
    mismatchReason = `The .${filenameExtension} extension agrees with the detected signature.`;
  } else if (confidence === "container-only") {
    mismatchReason = `Container confirmed but its subtype was not resolved from the sampled bytes, so .${filenameExtension} is left unverified rather than called a mismatch.`;
  } else if (isText) {
    if (TEXT_SERIALISED_EXTENSIONS.has(filenameExtension)) {
      mismatch = "none";
      mismatchReason = `The bytes are text with no format signature. .${filenameExtension} is itself a text format, so nothing contradicts it — but a text extension can never be *confirmed* from bytes alone.`;
    } else {
      mismatch = "mismatch";
      mismatchReason = `The bytes are printable text, while .${filenameExtension} names a binary format that would carry a signature. The extension does not describe this content.`;
    }
  } else if (primarySig?.risk && declared && PASSIVE_CATEGORIES.has(declared.category)) {
    mismatch = "high-risk";
    mismatchReason = `Executable or script content is wearing a passive .${filenameExtension} extension — the classic content-type spoof.`;
  } else if (primarySig?.risk && !declared) {
    mismatch = "high-risk";
    mismatchReason = `Executable or script content behind an unrecognised .${filenameExtension} extension.`;
  } else if (declared && detectedCategory && declared.category === detectedCategory) {
    mismatch = "benign";
    mismatchReason = `Both the detected type and .${filenameExtension} are ${detectedCategory} formats — usually a re-encode or a lazy rename, not an attack.`;
  } else {
    mismatch = "mismatch";
    mismatchReason = `The detected type does not match the .${filenameExtension} extension.`;
  }

  const entropyBitsPerByte = shannonEntropy(bytes);

  const summaryLines = [
    `Detected: ${detectedType ?? "unknown"}${detectedMime ? ` (${detectedMime})` : ""}`,
    `Confidence: ${confidence}`,
    `Reported MIME: ${reportedMime ?? "—"}`,
    `Filename extension: ${filenameExtension ? `.${filenameExtension}` : "—"}`,
    `Extension check: ${mismatch}${mismatchReason ? ` — ${mismatchReason}` : ""}`,
    `Bytes read: ${bytes.length}${truncated ? ` of ${decoded.length}+ (header sample)` : ""}`,
    `Entropy: ${entropyBitsPerByte} bits/byte`,
  ];

  return {
    source,
    bytesRead: bytes.length,
    truncated,
    maxBytesRead,
    detectedType,
    detectedMime,
    detectedExtension,
    confidence,
    reportedMime,
    filenameExtension,
    matchedSignature: primary
      ? { id: primary.id, hex: primary.hex, offset: primary.offset, category: primary.category }
      : null,
    candidates: matches,
    /**
     * Signature ids that matched byte-for-byte but were set aside because the
     * sample is printable text and the pattern is too short to mean anything
     * there. Reported rather than dropped silently — a detector that hides a
     * match it made is as dishonest as one that overclaims it.
     */
    coincidentalSignatures: coincidences,
    containerDrillDown: drill,
    mismatch,
    mismatchReason,
    polyglot,
    entropyBitsPerByte,
    textHints: isText || primary?.category === "text" ? hints : [],
    hexDump: hexDumpOf(bytes, hexDumpBytes),
    asciiPreview: ascii(bytes, 0, Math.min(hexDumpBytes, bytes.length)),
    summary: summaryLines.join("\n"),
    signatureCount: FILE_SIGNATURES.length,
    engine: "nebutra-magic-table",
  };
}

export const fileTypeDetectTool = tool({
  id: "dev/file-type-detect",
  slug: "file-type-detect",
  category: "dev",
  title: { zh: "文件类型检测（魔数）", en: "File Type Detector (Magic Bytes)" },
  description: {
    zh: "读取文件头字节，比对 180 条签名，识别文件真实格式；ZIP/ISO-BMFF/OLE2 容器做真实内部读取，扩展名不符按 良性/不符/高风险 分级",
    en: "Match a file's leading bytes against 180 signatures to name its true format; ZIP/ISO-BMFF/OLE2 containers are opened for real, and a lying extension is tiered benign / mismatch / high-risk",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.dev.file_type_detect",
  roots: ["detector", "checker", "analyzer"],
  engine: {
    name: "nebutra-magic-table",
    upstream:
      "File signature table compiled from format specifications (PNG ISO/IEC 15948, ISO/IEC 14496-12 ftyp, ZIP APPNOTE 6.3.x local file header, POSIX 1003.1 ustar at offset 257, ISO 9660 CD001 at 32769, ECMA-376 OOXML, ODF/EPUB stored mimetype member, JVMS §4.1 class file, ELF gABI, Mach-O)",
    version: "1.0.0",
  },
  seoKeywords: {
    zh: "文件类型检测,文件魔数,magic bytes 在线,文件真实格式识别,文件签名对照,扩展名伪造检测",
    en: "file type detector, magic bytes checker, magic number detector, file signature identifier, detect true file type, spoofed extension check",
  },
  inputSchema: z
    .object({
      fileBase64: z
        .string()
        .max(4_000_000)
        .optional()
        .describe(
          "Base64 (or data URL) of the file's leading bytes. Only the first maxBytesRead bytes are inspected — never send the whole file.",
        ),
      hex: z
        .string()
        .max(1_000_000)
        .optional()
        .describe(
          'Raw leading bytes as hex, e.g. "89504E470D0A1A0A". Spaces, 0x prefixes and separators are tolerated. Use this instead of fileBase64 when you already hold a buffer.',
        ),
      filename: z
        .string()
        .max(512)
        .optional()
        .describe(
          "Claimed filename; only its extension is used, as one of three compared signals.",
        ),
      reportedMime: z
        .string()
        .max(255)
        .optional()
        .describe("MIME type the browser/OS/upload claims, reported back beside the detected one."),
      maxBytesRead: z.coerce
        .number()
        .int()
        .min(264)
        .max(65_536)
        .default(8192)
        .describe(
          "Header bytes to inspect. 264 is the floor because TAR's ustar marker sits at offset 257; ISO 9660 needs ≥ 32774.",
        ),
      hexDumpBytes: z.coerce
        .number()
        .int()
        .min(16)
        .max(1024)
        .default(128)
        .describe("Bytes rendered in the hex dump / ASCII preview."),
    })
    .describe(
      "Provide exactly one of fileBase64 or hex. Detection is pure byte matching — no upload, no network, no filename trust.",
    ),
  execute: (input: DetectInput) => detectFileType(input),
});

export const w3FileTypeDetectTools: readonly AnyForgeToolDefinition[] = [fileTypeDetectTool];
