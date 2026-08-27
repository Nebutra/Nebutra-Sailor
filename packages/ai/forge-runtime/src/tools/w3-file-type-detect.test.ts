import { describe, expect, it } from "vitest";
import { toolInputJsonSchema } from "../json-schema";
import { detectFileType, FILE_SIGNATURES, fileTypeDetectTool } from "./w3-file-type-detect";

/* ── fixtures ─────────────────────────────────────────────────────────── */

function hexOf(bytes: number[] | Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function ascii(text: string): number[] {
  return [...text].map((c) => c.charCodeAt(0) & 0xff);
}

function pad(bytes: number[], length: number, fill = 0x00): number[] {
  const out = bytes.slice(0, length);
  while (out.length < length) out.push(fill);
  return out;
}

/** ZIP local file header per APPNOTE 6.3.x §4.3.7 — 30 fixed bytes + name. */
function zipEntry(name: string, opts?: { stored?: string }): number[] {
  const nameBytes = ascii(name);
  const data = opts?.stored ? ascii(opts.stored) : [];
  const method = opts?.stored ? 0 : 8;
  const size = data.length;
  return [
    0x50,
    0x4b,
    0x03,
    0x04, // signature
    0x14,
    0x00, // version needed
    0x00,
    0x00, // flags
    method & 0xff,
    (method >> 8) & 0xff, // compression method
    0x00,
    0x00, // mod time
    0x00,
    0x00, // mod date
    0x00,
    0x00,
    0x00,
    0x00, // crc32
    size & 0xff,
    (size >> 8) & 0xff,
    0x00,
    0x00, // compressed size
    size & 0xff,
    (size >> 8) & 0xff,
    0x00,
    0x00, // uncompressed size
    nameBytes.length & 0xff,
    (nameBytes.length >> 8) & 0xff, // name length
    0x00,
    0x00, // extra length
    ...nameBytes,
    ...data,
  ];
}

function zipOf(...entries: number[][]): string {
  return hexOf(entries.flat());
}

const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/* ── signature table ──────────────────────────────────────────────────── */

describe("signature table", () => {
  it("ships the countable ≥130 signatures the brief targets (§9.3)", () => {
    expect(FILE_SIGNATURES.length).toBeGreaterThanOrEqual(130);
    // The tool description states a number; it must be the real one.
    expect(fileTypeDetectTool.description.en).toContain(String(FILE_SIGNATURES.length));
    expect(fileTypeDetectTool.description.zh).toContain(String(FILE_SIGNATURES.length));
  });

  it("has unique ids and well-formed patterns", () => {
    const ids = new Set<string>();
    for (const s of FILE_SIGNATURES) {
      expect(ids.has(s.id), `duplicate id ${s.id}`).toBe(false);
      ids.add(s.id);
      expect(s.hex, s.id).toMatch(/^([0-9A-F]{2}|\?\?)+$/);
      expect(s.offset, s.id).toBeGreaterThanOrEqual(0);
      for (const also of s.also ?? []) expect(also.hex, s.id).toMatch(/^([0-9A-F]{2}|\?\?)+$/);
    }
  });

  it("is declared pure, dual-runtime and metered", () => {
    expect(fileTypeDetectTool.sideEffect).toBe("pure");
    expect(fileTypeDetectTool.meterId).toBe("forge.dev.file_type_detect");
    expect(fileTypeDetectTool.roots).toContain("detector");
    expect(fileTypeDetectTool.runtime).toContain("client");
  });
});

/* ── correct answers, justified from the format specs ─────────────────── */

describe("signature matching", () => {
  it("names PNG from its 8-byte signature (ISO/IEC 15948 §5.2)", () => {
    // 89 50 4E 47 0D 0A 1A 0A — high bit, "PNG", CRLF, EOF, LF.
    const out = detectFileType({ hex: hexOf(PNG_HEADER) });
    expect(out.detectedType).toBe("PNG image");
    expect(out.detectedMime).toBe("image/png");
    expect(out.confidence).toBe("match");
    expect(out.matchedSignature?.offset).toBe(0);
  });

  it("matches the whole JPEG family through the wildcard byte (§7.2b)", () => {
    for (const marker of [0xe0, 0xe1, 0xdb, 0xee]) {
      const out = detectFileType({ hex: hexOf([0xff, 0xd8, 0xff, marker, 0x00, 0x10]) });
      expect(out.detectedType, marker.toString(16)).toBe("JPEG image");
      expect(out.detectedMime).toBe("image/jpeg");
    }
  });

  it("finds TAR's ustar marker at offset 257, not at 0 (POSIX ustar header, §7.1)", () => {
    const bytes = pad(ascii("some-file-name.txt"), 257);
    bytes.push(...ascii("ustar"), 0x00, 0x30, 0x30);
    const out = detectFileType({ hex: hexOf(bytes) });
    expect(out.detectedType).toBe("TAR archive");
    expect(out.matchedSignature?.offset).toBe(257);
  });

  it("finds ISO-BMFF ftyp at offset 4 and resolves the brand (ISO/IEC 14496-12, §7.1/§7.5)", () => {
    const mp4 = detectFileType({
      hex: hexOf([0x00, 0x00, 0x00, 0x20, ...ascii("ftypisom"), 0x00, 0x00, 0x02, 0x00]),
    });
    expect(mp4.detectedType).toBe("MP4 video");
    expect(mp4.detectedExtension).toBe("mp4");
    expect(mp4.containerDrillDown?.kind).toBe("iso-bmff");

    const heic = detectFileType({
      hex: hexOf([0x00, 0x00, 0x00, 0x18, ...ascii("ftypheic"), 0x00, 0x00, 0x00, 0x00]),
    });
    expect(heic.detectedType).toBe("HEIC image");
    expect(heic.detectedMime).toBe("image/heic");
  });

  it("reports container-only for an unknown ftyp brand rather than guessing", () => {
    const out = detectFileType({
      hex: hexOf([0x00, 0x00, 0x00, 0x18, ...ascii("ftypzzzz"), 0x00, 0x00, 0x00, 0x00]),
    });
    expect(out.confidence).toBe("container-only");
    expect(out.containerDrillDown?.resolvedType).toBeNull();
  });

  it("prefers the more specific signature when two share a prefix", () => {
    // RAR 5.x extends RAR 4.x's 7 bytes with an eighth (0x01).
    const rar5 = detectFileType({ hex: "526172211A070100" });
    expect(rar5.detectedType).toBe("RAR archive (5.x)");
    const rar4 = detectFileType({ hex: "526172211A070000" });
    expect(rar4.detectedType).toBe("RAR archive (≤4.x)");
    // CR2 is a TIFF plus a "CR" marker at offset 8 — the longer match wins.
    const cr2 = detectFileType({ hex: `49492A00${"00".repeat(4)}43520200` });
    expect(cr2.detectedType).toBe("Canon RAW 2 image");
  });

  it("requires the RIFF subtype at offset 8, not just RIFF", () => {
    const webp = detectFileType({ hex: `52494646${"00".repeat(4)}${hexOf(ascii("WEBP"))}` });
    expect(webp.detectedType).toBe("WebP image");
    const wav = detectFileType({ hex: `52494646${"00".repeat(4)}${hexOf(ascii("WAVE"))}` });
    expect(wav.detectedType).toBe("WAV audio");
  });
});

/* ── ZIP-family disambiguation (know-how §7.3, the brief's differentiator) ─ */

describe("ZIP container drill-down", () => {
  it("names DOCX from [Content_Types].xml + word/ members, not from the filename", () => {
    const out = detectFileType({
      hex: zipOf(zipEntry("[Content_Types].xml"), zipEntry("word/document.xml")),
      filename: "anything.bin",
    });
    expect(out.detectedType).toBe("Word document (DOCX)");
    expect(out.detectedExtension).toBe("docx");
    expect(out.containerDrillDown?.evidence).toContain("[Content_Types].xml");
  });

  it("names XLSX and PPTX from their own part prefixes", () => {
    expect(
      detectFileType({ hex: zipOf(zipEntry("[Content_Types].xml"), zipEntry("xl/workbook.xml")) })
        .detectedExtension,
    ).toBe("xlsx");
    expect(
      detectFileType({
        hex: zipOf(zipEntry("[Content_Types].xml"), zipEntry("ppt/presentation.xml")),
      }).detectedExtension,
    ).toBe("pptx");
  });

  it("reads the first stored `mimetype` member for EPUB/ODF instead of trusting the extension", () => {
    const epub = detectFileType({
      hex: zipOf(
        zipEntry("mimetype", { stored: "application/epub+zip" }),
        zipEntry("META-INF/container.xml"),
      ),
    });
    expect(epub.detectedType).toBe("EPUB e-book");
    expect(epub.detectedExtension).toBe("epub");

    const odt = detectFileType({
      hex: zipOf(zipEntry("mimetype", { stored: "application/vnd.oasis.opendocument.text" })),
    });
    expect(odt.detectedType).toBe("ODF text document");
  });

  it("catches a JAR renamed to .docx — the case extension-context inference misses (§3/§7.3)", () => {
    const out = detectFileType({
      hex: zipOf(zipEntry("META-INF/MANIFEST.MF"), zipEntry("com/example/Main.class")),
      filename: "invoice.docx",
    });
    expect(out.detectedType).toBe("Java archive (JAR)");
    expect(out.mismatch).toBe("mismatch");
  });

  it("clears a genuine DOCX that is actually named .docx", () => {
    const out = detectFileType({
      hex: zipOf(zipEntry("[Content_Types].xml"), zipEntry("word/document.xml")),
      filename: "contract.docx",
      reportedMime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    expect(out.mismatch).toBe("none");
    expect(out.confidence).toBe("match");
  });

  it("names APK from AndroidManifest.xml even though it is also a JAR-shaped zip", () => {
    const out = detectFileType({
      hex: zipOf(zipEntry("AndroidManifest.xml"), zipEntry("META-INF/MANIFEST.MF")),
    });
    expect(out.detectedExtension).toBe("apk");
  });

  it("says container-only — and does not cry mismatch — when the head has no marker", () => {
    const out = detectFileType({
      hex: zipOf(zipEntry("data/readme.txt")),
      filename: "report.docx",
    });
    expect(out.detectedType).toBe("ZIP archive");
    expect(out.confidence).toBe("container-only");
    expect(out.mismatch).toBe("none");
    expect(out.mismatchReason).toMatch(/unverified/i);
  });
});

/* ── other container families ─────────────────────────────────────────── */

describe("EBML, OLE2 and the CAFEBABE collision", () => {
  it("splits WebM from Matroska by DocType string", () => {
    const webm = detectFileType({ hex: `1A45DFA3${"00".repeat(8)}${hexOf(ascii("webm"))}` });
    expect(webm.detectedType).toBe("WebM video");
    const mkv = detectFileType({ hex: `1A45DFA3${"00".repeat(8)}${hexOf(ascii("matroska"))}` });
    expect(mkv.detectedType).toBe("Matroska video");
  });

  it("names legacy DOC from the OLE2 WordDocument stream", () => {
    const utf16 = [...ascii("WordDocument")].flatMap((c) => [c, 0x00]);
    const out = detectFileType({ hex: `D0CF11E0A1B11AE1${"00".repeat(16)}${hexOf(utf16)}` });
    expect(out.detectedType).toBe("Word document (DOC)");
    expect(out.containerDrillDown?.kind).toBe("cfbf");
  });

  it("leaves an OLE2 file unresolved rather than guessing its subtype", () => {
    const out = detectFileType({ hex: `D0CF11E0A1B11AE1${"00".repeat(32)}` });
    expect(out.confidence).toBe("container-only");
    expect(out.containerDrillDown?.resolvedType).toBeNull();
  });

  it("separates a Java class from a Mach-O universal binary (both are CAFEBABE)", () => {
    // JVMS §4.1: bytes 4–5 minor, 6–7 major. 0x34 = 52 = Java SE 8.
    const klass = detectFileType({ hex: "CAFEBABE00000034" });
    expect(klass.detectedType).toBe("Java class file");
    // Mach-O fat header: bytes 4–7 are nfat_arch — 2 architectures here.
    const fat = detectFileType({ hex: "CAFEBABE00000002" });
    expect(fat.detectedType).toBe("Mach-O universal (fat) binary");
  });
});

/* ── polyglots (§7.4) ─────────────────────────────────────────────────── */

describe("polyglot and embedded payloads", () => {
  it("surfaces a ZIP appended behind a GIF header (GIFAR shape)", () => {
    const out = detectFileType({
      hex: `${hexOf(ascii("GIF89a"))}${"00".repeat(16)}${zipOf(zipEntry("evil.class"))}`,
    });
    expect(out.detectedType).toBe("GIF image (89a)");
    expect(out.polyglot.detected).toBe(true);
    expect(out.polyglot.embedded[0]?.format).toBe("ZIP archive");
    expect(out.polyglot.embedded[0]?.offset).toBeGreaterThan(0);
  });

  it("does not call a plain ZIP a polyglot just because PK repeats", () => {
    const out = detectFileType({ hex: zipOf(zipEntry("a.txt"), zipEntry("b.txt")) });
    expect(out.polyglot.detected).toBe(false);
  });
});

/* ── mismatch tiering (§7.6) + three signals (§7.8) ───────────────────── */

describe("extension mismatch tiering", () => {
  it("flags an executable wearing a document extension as high-risk", () => {
    const out = detectFileType({ hex: "4D5A90000300000004000000", filename: "invoice.pdf" });
    expect(out.mismatch).toBe("high-risk");
    const elf = detectFileType({ hex: "7F454C4602010100", filename: "report.docx" });
    expect(elf.mismatch).toBe("high-risk");
    expect(elf.detectedType).toBe("ELF executable/shared object");
  });

  it("flags a shebang script hiding behind an image extension", () => {
    const out = detectFileType({ hex: hexOf(ascii("#!/bin/sh\necho hi\n")), filename: "logo.png" });
    expect(out.mismatch).toBe("high-risk");
  });

  it("calls an image-for-image rename benign, not an attack", () => {
    const out = detectFileType({ hex: hexOf(PNG_HEADER), filename: "photo.jpeg" });
    expect(out.mismatch).toBe("benign");
  });

  it("calls a cross-family disagreement a plain mismatch", () => {
    const out = detectFileType({ hex: hexOf(PNG_HEADER), filename: "bundle.zip" });
    expect(out.mismatch).toBe("mismatch");
  });

  it("says nothing is wrong when the extension agrees", () => {
    const out = detectFileType({ hex: hexOf(PNG_HEADER), filename: "logo.png" });
    expect(out.mismatch).toBe("none");
  });

  it("has nothing to compare without a filename", () => {
    const out = detectFileType({ hex: hexOf(PNG_HEADER) });
    expect(out.mismatch).toBe("none");
    expect(out.filenameExtension).toBeNull();
    expect(out.mismatchReason).toMatch(/No filename/i);
  });

  it("keeps detected type, reported MIME and extension as three separate signals", () => {
    const out = detectFileType({
      hex: hexOf(PNG_HEADER),
      filename: "scan.jpg",
      reportedMime: "image/jpeg",
    });
    expect(out.detectedMime).toBe("image/png");
    expect(out.reportedMime).toBe("image/jpeg");
    expect(out.filenameExtension).toBe("jpg");
  });
});

/* ── text and entropy (§7.7, §7.9) ────────────────────────────────────── */

describe("text and unrecognised binary", () => {
  it("answers 'text, format ambiguous' with structural hints instead of guessing", () => {
    const out = detectFileType({ hex: hexOf(ascii("name,age\r\nada,36\r\nalan,41\r\n")) });
    expect(out.detectedType).toBe("Plain text (format ambiguous)");
    expect(out.confidence).toBe("ambiguous");
    expect(out.textHints).toContain("CSV");
    expect(out.matchedSignature).toBeNull();
  });

  it("hints JSON and XML structurally without claiming a signature match", () => {
    expect(detectFileType({ hex: hexOf(ascii('{"a":1}')) }).textHints).toContain("JSON");
    expect(detectFileType({ hex: hexOf(ascii('<?xml version="1.0"?><a/>')) }).textHints).toContain(
      "XML",
    );
  });

  it("reports high entropy with no header rather than inventing a type", () => {
    const bytes = Array.from({ length: 512 }, (_, i) => (i * 7 + 3) % 256);
    bytes[0] = 0x00;
    bytes[1] = 0x11;
    bytes[2] = 0x22;
    bytes[3] = 0x33;
    const out = detectFileType({ hex: hexOf(bytes) });
    expect(out.detectedType).toBeNull();
    expect(out.confidence).toBe("none");
    expect(out.entropyBitsPerByte).toBeGreaterThan(7);
  });

  it("does not let a two-byte weak pattern turn printable text into a binary format", () => {
    // "BM" opens a BMP and also opens the word "BMW". A file whose every byte is
    // printable has no byte signature (§7.7); the coincidence is reported, not
    // promoted to a verdict.
    const out = detectFileType({
      hex: hexOf(ascii("BMW and Audi are car brands.\nSecond line of notes.\n")),
      filename: "notes.txt",
    });
    expect(out.detectedType).toBe("Plain text (format ambiguous)");
    expect(out.coincidentalSignatures).toContain("bmp");
    expect(out.mismatch).toBe("none");
  });

  it("still names a real BMP, whose header is not printable text", () => {
    const out = detectFileType({
      hex: hexOf([0x42, 0x4d, 0x36, 0x00, 0x0c, 0x00, 0, 0, 0, 0, 0x36, 0, 0, 0, 0x28, 0, 0, 0]),
      filename: "chart.bmp",
    });
    expect(out.detectedType).toBe("BMP image");
    expect(out.mismatch).toBe("none");
  });

  it("needs four MPEG-TS sync bytes, because 0x47 is also the letter G", () => {
    // ISO/IEC 13818-1 packets are 188 bytes and each opens with 0x47. An access
    // log that happened to put a "G" at offsets 0 and 188 used to be reported as
    // a video file, at the strongest confidence tier.
    const log = ascii('GET /a/b/c.html HTTP/1.1 200 512 "-" "Mozilla/5.0"\n'.repeat(20));
    log[0] = 0x47;
    log[188] = 0x47;
    log[376] = 0x47;
    const text = detectFileType({ hex: hexOf(log), filename: "access.log" });
    expect(text.detectedType).toBe("Plain text (format ambiguous)");
    expect(text.mismatch).toBe("none");

    const stream = Array.from({ length: 800 }, () => 0x11);
    for (const at of [0, 188, 376, 564]) stream[at] = 0x47;
    const ts = detectFileType({ hex: hexOf(stream), filename: "clip.ts" });
    expect(ts.detectedType).toBe("MPEG transport stream");
    expect(ts.confidence).toBe("match");
  });

  it("separates 'cannot confirm a text extension' from 'the extension is wrong'", () => {
    // .svg is a text format: nothing contradicts it, so nothing is flagged.
    const svg = detectFileType({
      hex: hexOf(ascii('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"/>')),
      filename: "logo.svg",
    });
    expect(svg.mismatch).toBe("none");

    // .png is binary and would carry a signature — printable text under that
    // name is a real disagreement, not an unverifiable one.
    const fake = detectFileType({
      hex: hexOf(ascii("hello world this is plain text\nsecond line\n")),
      filename: "image.png",
    });
    expect(fake.mismatch).toBe("mismatch");
  });
});

/* ── bounded read, hex input, determinism ─────────────────────────────── */

describe("input handling", () => {
  it("reads only maxBytesRead and says when it truncated (§7.2)", () => {
    const bytes = [...PNG_HEADER, ...Array.from({ length: 600 }, () => 0x41)];
    const out = detectFileType({ hex: hexOf(bytes), maxBytesRead: 264 });
    expect(out.bytesRead).toBe(264);
    expect(out.truncated).toBe(true);
    expect(out.detectedType).toBe("PNG image");
  });

  it("accepts hex with spaces, separators and 0x prefixes (§7.10)", () => {
    const out = detectFileType({ hex: "0x89 50:4E-47 0D 0A 1A 0A" });
    expect(out.detectedType).toBe("PNG image");
    expect(out.source).toBe("hex");
  });

  it("accepts base64 file bytes and a data URL alike", () => {
    const b64 = "iVBORw0KGgo="; // PNG signature
    expect(detectFileType({ fileBase64: b64 }).detectedType).toBe("PNG image");
    expect(detectFileType({ fileBase64: `data:image/png;base64,${b64}` }).source).toBe("file");
  });

  it("renders a hex dump and ASCII preview of the header", () => {
    const out = detectFileType({ hex: hexOf([...ascii("%PDF-1.7"), 0x0a, 0x25]) });
    expect(out.hexDump.split("\n")[0]).toContain("25 50 44 46");
    expect(out.asciiPreview).toContain("%PDF-1.7");
  });

  it("is deterministic — same bytes, same answer", () => {
    const input = { hex: hexOf(PNG_HEADER), filename: "a.png" };
    expect(detectFileType(input)).toEqual(detectFileType(input));
  });
});

/* ── rejections ───────────────────────────────────────────────────────── */

describe("rejections", () => {
  it("reports an empty file as empty, not as 'no signature matched'", () => {
    expect(() => detectFileType({ fileBase64: "" })).toThrow(/provide fileBase64/);
    expect(() => detectFileType({ hex: "0x" })).toThrow(/empty_input/);
  });

  it("refuses both inputs at once and neither", () => {
    expect(() => detectFileType({ hex: "89504E47", fileBase64: "iVBORw==" })).toThrow(/not both/);
    expect(() => detectFileType({})).toThrow(/invalid_input/);
  });

  it("rejects malformed hex instead of silently dropping a nibble", () => {
    expect(() => detectFileType({ hex: "89504E4" })).toThrow(/odd number/);
    expect(() => detectFileType({ hex: "89ZZ4E47" })).toThrow(/non-hexadecimal/);
  });

  it("rejects malformed base64", () => {
    expect(() => detectFileType({ fileBase64: "iVBOR!!!w0KGgo=" })).toThrow(/invalid_base64/);
  });
});

/* ── agent-facing schema (ship gate §6.5 #2/#3) ───────────────────────── */

describe("input schema", () => {
  const schema = fileTypeDetectTool.inputSchema;

  it("defaults the bounded read to 8 KiB and the dump to 128 bytes", () => {
    const parsed = schema.parse({ hex: "89504E47" }) as Record<string, unknown>;
    expect(parsed.maxBytesRead).toBe(8192);
    expect(parsed.hexDumpBytes).toBe(128);
  });

  it("rejects a read bound below TAR's offset-257 marker", () => {
    expect(schema.safeParse({ hex: "89504E47", maxBytesRead: 100 }).success).toBe(false);
    expect(schema.safeParse({ hex: "89504E47", maxBytesRead: 264 }).success).toBe(true);
  });

  it("rejects out-of-range and wrong-typed fields", () => {
    expect(schema.safeParse({ hex: "89504E47", hexDumpBytes: 4096 }).success).toBe(false);
    expect(schema.safeParse({ hex: 12345 }).success).toBe(false);
    expect(schema.safeParse({ hex: "89504E47", filename: "x".repeat(600) }).success).toBe(false);
    expect(schema.safeParse({ hex: "89504E47", maxBytesRead: 8192.5 }).success).toBe(false);
  });

  it("exposes real fields to agents over JSON Schema", () => {
    const json = toolInputJsonSchema(schema) as { properties?: Record<string, unknown> };
    expect(Object.keys(json.properties ?? {})).toEqual(
      expect.arrayContaining(["fileBase64", "hex", "filename", "reportedMime", "maxBytesRead"]),
    );
  });

  it("runs end to end through the tool's execute", async () => {
    const input = schema.parse({ hex: hexOf(PNG_HEADER), filename: "logo.png" });
    const out = (await fileTypeDetectTool.execute(input)) as { detectedType: string };
    expect(out.detectedType).toBe("PNG image");
  });
});
