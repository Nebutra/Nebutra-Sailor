import { describe, expect, it } from "vitest";
import {
  detectEncoding,
  type EncodingDetectResult,
  encodingDetectTool,
} from "./w3-encoding-detect";

/* ── fixtures ──────────────────────────────────────────────────────────── */

const u8 = (...bytes: number[]) => new Uint8Array(bytes);
const utf8 = (s: string) => new TextEncoder().encode(s);

/** Repeat a byte pattern until the sample clears the 50-byte evidence floor. */
function rep(pattern: number[], times: number): Uint8Array {
  const out = new Uint8Array(pattern.length * times);
  for (let i = 0; i < times; i += 1) out.set(pattern, i * pattern.length);
  return out;
}

function run(input: Record<string, unknown>): EncodingDetectResult {
  const parsed = encodingDetectTool.inputSchema.parse(input);
  return encodingDetectTool.execute(parsed) as EncodingDetectResult;
}

const confidenceOf = (r: EncodingDetectResult, encoding: string) =>
  r.candidates.find((c) => c.encoding === encoding)?.confidence;

/* ── BOM: know-how #1 — first, unambiguous, short-circuiting ───────────── */

describe("BOM detection", () => {
  it("reports a UTF-8 BOM at 100 with its exact bytes and flags the parser hazard", () => {
    // EF BB BF is U+FEFF encoded in UTF-8; "hi" follows.
    const r = detectEncoding(u8(0xef, 0xbb, 0xbf, 0x68, 0x69));
    expect(r.primary.encoding).toBe("UTF-8");
    expect(r.primary.bomDetected).toBe(true);
    expect(r.primary.bomBytes).toBe("EF BB BF");
    expect(r.primary.confidence).toBe(100);
    expect(r.candidates).toEqual([{ encoding: "UTF-8", confidence: 100 }]);
    expect(r.warning).toMatch(/BOM/);
  });

  it("does not cap BOM confidence on a short input", () => {
    // 5 bytes is far under the 50-byte floor, but a BOM is not statistics.
    const r = detectEncoding(u8(0xef, 0xbb, 0xbf, 0x68, 0x69));
    expect(r.primary.confidence).toBe(100);
  });

  it("reads FF FE 00 00 as UTF-32LE, not UTF-16LE", () => {
    // The UTF-16LE BOM FF FE is a prefix of the UTF-32LE BOM FF FE 00 00, so
    // the longer signature has to be tested first.
    const r = detectEncoding(u8(0xff, 0xfe, 0x00, 0x00, 0x68, 0x00, 0x00, 0x00));
    expect(r.primary.encoding).toBe("UTF-32LE");
    expect(r.primary.bomBytes).toBe("FF FE 00 00");
  });

  it("reads 00 00 FE FF as UTF-32BE", () => {
    const r = detectEncoding(u8(0x00, 0x00, 0xfe, 0xff, 0x00, 0x00, 0x00, 0x68));
    expect(r.primary.encoding).toBe("UTF-32BE");
  });

  it("reads FE FF as UTF-16BE and FF FE as UTF-16LE", () => {
    expect(detectEncoding(u8(0xfe, 0xff, 0x00, 0x68)).primary.encoding).toBe("UTF-16BE");
    expect(detectEncoding(u8(0xff, 0xfe, 0x68, 0x00)).primary.encoding).toBe("UTF-16LE");
  });
});

/* ── know-how #2 — valid UTF-8 is not proof of UTF-8 intent ────────────── */

describe("pure ASCII", () => {
  const ascii = utf8("The quick brown fox jumps over the lazy dog, twice over.\n");

  it("names ASCII and lists every superset that fits the same bytes", () => {
    const r = detectEncoding(ascii);
    expect(r.primary.encoding).toBe("ASCII");
    expect(r.primary.confidence).toBe(100);
    expect(confidenceOf(r, "UTF-8")).toBe(100);
    expect(confidenceOf(r, "ISO-8859-1")).toBe(100);
    expect(confidenceOf(r, "windows-1252")).toBe(100);
  });

  it("says out loud that the intended charset is unrecoverable", () => {
    expect(detectEncoding(ascii).warning).toMatch(/not recoverable/i);
  });

  it("does not silently promote ASCII to UTF-8", () => {
    // The naive "is this valid UTF-8?" check would answer UTF-8 here.
    expect(detectEncoding(ascii).primary.encoding).not.toBe("UTF-8");
  });
});

/* ── UTF-8 well-formedness: RFC 3629 / Unicode Table 3-7 ───────────────── */

describe("UTF-8 validation", () => {
  it("accepts multi-byte UTF-8 and ranks it first", () => {
    const r = detectEncoding(utf8("你好世界，这是一个用于编码检测的测试文件。\n"));
    expect(r.primary.encoding).toBe("UTF-8");
    expect(r.primary.confidence).toBeGreaterThanOrEqual(90);
  });

  it("rejects the overlong encoding C0 AF (/ encoded in two bytes)", () => {
    // U+002F must be 2F. C0 AF is the classic overlong; leads C0/C1 are illegal.
    const r = detectEncoding(rep([0x41, 0xc0, 0xaf], 20));
    expect(confidenceOf(r, "UTF-8")).toBeUndefined();
  });

  it("rejects surrogates encoded as ED A0 80 (CESU-8 style)", () => {
    // ED may only be followed by 80..9F; A0 would decode to U+D800.
    const r = detectEncoding(rep([0x41, 0xed, 0xa0, 0x80], 16));
    expect(confidenceOf(r, "UTF-8")).toBeUndefined();
  });

  it("rejects F4 90 80 80, which would decode above U+10FFFF", () => {
    const r = detectEncoding(rep([0x41, 0xf4, 0x90, 0x80, 0x80], 12));
    expect(confidenceOf(r, "UTF-8")).toBeUndefined();
  });

  it("accepts F4 8F BF BF, the last legal code point U+10FFFF", () => {
    const r = detectEncoding(rep([0x41, 0xf4, 0x8f, 0xbf, 0xbf], 12));
    expect(confidenceOf(r, "UTF-8")).toBeGreaterThan(0);
  });

  it("rejects a bare continuation byte", () => {
    const r = detectEncoding(rep([0x41, 0x80], 30));
    expect(confidenceOf(r, "UTF-8")).toBeUndefined();
  });

  it("rejects a truncated three-byte sequence at end of sample", () => {
    const r = detectEncoding(u8(...utf8("padding padding padding padding "), 0xe4, 0xbd));
    expect(confidenceOf(r, "UTF-8")).toBeUndefined();
  });
});

/* ── know-how #3 — CJK legacy charsets ─────────────────────────────────── */

describe("CJK legacy charsets", () => {
  it("picks GB18030 for GB2312 level-1 hanzi (中文测试 = D6D0 CEC4 B2E2 CAD4)", () => {
    // Leads D6/CE/B2/CA all sit in the frequent B0..D7 block with A1..FE trails.
    const r = detectEncoding(rep([0xd6, 0xd0, 0xce, 0xc4, 0xb2, 0xe2, 0xca, 0xd4], 8));
    expect(r.primary.encoding).toBe("GB18030");
    expect(r.languageGuess?.language).toBe("zh");
  });

  it("picks Big5 for level-1 leads with low-half trails (A440 = 一)", () => {
    // Trail 0x40 is legal in Big5 and in GBK, but GBK's hanzi block needs an
    // A1..FE trail — so only Big5 sees frequent characters here.
    const r = detectEncoding(rep([0xa4, 0x40, 0xa4, 0x41, 0xa4, 0x42, 0xa4, 0x43], 8));
    expect(r.primary.encoding).toBe("Big5");
    expect(r.languageGuess?.language).toBe("zh");
  });

  it("picks Shift_JIS for the kana rows (あいうえ = 82A0 82A1 82A2 82A3)", () => {
    // Trail A0 is illegal in Big5 (needs 40..7E or A1..FE) and lead 82 is below
    // EUC's A1 floor, so only Shift_JIS survives structurally.
    const r = detectEncoding(rep([0x82, 0xa0, 0x82, 0xa1, 0x82, 0xa2, 0x82, 0xa3], 8));
    expect(r.primary.encoding).toBe("Shift_JIS");
    expect(r.languageGuess?.language).toBe("ja");
    expect(confidenceOf(r, "Big5")).toBeUndefined();
    expect(confidenceOf(r, "EUC-JP")).toBeUndefined();
  });

  it("picks EUC-JP over the structurally identical Big5 reading (A4A2 = あ)", () => {
    // A4xx is legal Big5 too; the kana row is the script-exclusive tiebreak.
    const r = detectEncoding(rep([0xa4, 0xa2, 0xa4, 0xa4, 0xa4, 0xa6, 0xa4, 0xa8], 8));
    expect(r.primary.encoding).toBe("EUC-JP");
    expect(r.languageGuess?.language).toBe("ja");
    expect(confidenceOf(r, "Big5")).toBeLessThan(r.primary.confidence);
  });

  it("picks EUC-KR for precomposed hangul rows (B0A1 = 가)", () => {
    const r = detectEncoding(rep([0xb0, 0xa1, 0xb0, 0xa2, 0xb0, 0xa3, 0xb0, 0xa4], 8));
    expect(r.primary.encoding).toBe("EUC-KR");
    expect(r.languageGuess?.language).toBe("ko");
  });

  it("treats the GB18030 four-byte form as a decisive GB tell", () => {
    // 81 30 81 30 is a well-formed four-byte GB18030 unit; no other charset
    // in the ranking can produce that shape.
    const r = detectEncoding(rep([0x81, 0x30, 0x81, 0x30], 16));
    expect(r.primary.encoding).toBe("GB18030");
  });

  it("rejects Big5 when a trail byte lands in its forbidden 0x80..0xA0 gap", () => {
    const r = detectEncoding(rep([0xa4, 0x90, 0xa5, 0x91], 16));
    expect(confidenceOf(r, "Big5")).toBeUndefined();
  });

  it("rejects EUC-KR when a lead byte falls below its A1 floor", () => {
    const r = detectEncoding(rep([0x82, 0xa0, 0x82, 0xa1], 16));
    expect(confidenceOf(r, "EUC-KR")).toBeUndefined();
  });
});

/* ── know-how #5 — ambiguity stays visible ─────────────────────────────── */

describe("ranked candidates", () => {
  it("keeps the runner-up encodings on the record instead of a single guess", () => {
    const r = detectEncoding(rep([0xb0, 0xa1, 0xb0, 0xa2, 0xb0, 0xa3, 0xb0, 0xa4], 8));
    expect(r.candidates.length).toBeGreaterThan(1);
    expect(r.candidates.map((c) => c.encoding)).toContain("Big5");
  });

  it("returns candidates sorted by descending confidence", () => {
    const r = detectEncoding(rep([0xd6, 0xd0, 0xce, 0xc4, 0xb2, 0xe2, 0xca, 0xd4], 8));
    const scores = r.candidates.map((c) => c.confidence);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    expect(r.primary.encoding).toBe(r.candidates[0]?.encoding);
  });
});

/* ── UTF-16 without a BOM ──────────────────────────────────────────────── */

describe("UTF-16 without a BOM", () => {
  const le = new Uint8Array(
    [...utf8("Hello UTF-16 world, no byte order mark here at all.")].flatMap((b) => [b, 0x00]),
  );
  const be = new Uint8Array(
    [...utf8("Hello UTF-16 world, no byte order mark here at all.")].flatMap((b) => [0x00, b]),
  );

  it("finds UTF-16LE from NULs in the odd byte positions", () => {
    expect(detectEncoding(le).primary.encoding).toBe("UTF-16LE");
  });

  it("finds UTF-16BE from NULs in the even byte positions", () => {
    expect(detectEncoding(be).primary.encoding).toBe("UTF-16BE");
  });

  it("does not call a UTF-16 sample binary just because it is half NUL bytes", () => {
    expect(detectEncoding(le).primary.encoding).not.toBe("binary");
  });
});

/* ── know-how #4 — line endings are a separate axis ────────────────────── */

describe("line endings", () => {
  it("counts CRLF once and never double-counts its CR or LF", () => {
    // "a\r\nb\nc\rd" = 61 0D 0A 62 0A 63 0D 64 → LF total 2, CR total 2,
    // CRLF 1 ⇒ lone LF = 1, lone CR = 1.
    const r = detectEncoding(utf8("a\r\nb\nc\rd"));
    expect(r.lineEndings).toEqual({ lf: 1, cr: 1, crlf: 1, mixed: true });
  });

  it("reports a clean CRLF file as not mixed", () => {
    const r = detectEncoding(utf8("one\r\ntwo\r\nthree\r\n"));
    expect(r.lineEndings).toEqual({ lf: 0, cr: 0, crlf: 3, mixed: false });
  });

  it("reports a clean LF file as not mixed", () => {
    const r = detectEncoding(utf8("one\ntwo\nthree\n"));
    expect(r.lineEndings).toEqual({ lf: 3, cr: 0, crlf: 0, mixed: false });
  });

  it("warns on a mixed file, since that is itself the diagnosis", () => {
    const r = detectEncoding(utf8(`${"padding line\r\n".repeat(4)}stray\nline\n`));
    expect(r.lineEndings.mixed).toBe(true);
    expect(r.warning).toMatch(/Mixed line endings/);
  });

  it("still counts line endings inside UTF-16 bytes", () => {
    const r = detectEncoding(new Uint8Array([...utf8("a\r\nb")].flatMap((b) => [b, 0x00])));
    expect(r.lineEndings.crlf).toBe(1);
  });
});

/* ── byte statistics ───────────────────────────────────────────────────── */

describe("byte statistics", () => {
  it("splits ASCII from high bytes and counts NULs", () => {
    // "café" in UTF-8 = 63 61 66 C3 A9 → 5 bytes, 3 ASCII, 2 high, 0 NUL.
    const r = detectEncoding(utf8("café"));
    expect(r.byteStats).toEqual({
      totalBytes: 5,
      asciiCount: 3,
      highByteCount: 2,
      nullByteCount: 0,
    });
  });

  it("counts NUL bytes", () => {
    const r = detectEncoding(u8(0x41, 0x00, 0x42, 0x00));
    expect(r.byteStats.nullByteCount).toBe(2);
  });
});

/* ── short input + binary edge states ──────────────────────────────────── */

describe("edge states", () => {
  it("caps confidence and warns under the 50-byte evidence floor", () => {
    const r = detectEncoding(utf8("café"));
    expect(r.primary.confidence).toBeLessThanOrEqual(60);
    expect(r.candidates.every((c) => c.confidence <= 60)).toBe(true);
    expect(r.warning).toMatch(/Short input/);
  });

  it("does not cap a sample at or above the floor", () => {
    const r = detectEncoding(utf8("你好世界，这是一个用于编码检测的测试文件。\n"));
    expect(r.byteStats.totalBytes).toBeGreaterThanOrEqual(50);
    expect(r.primary.confidence).toBeGreaterThan(60);
  });

  it("says 'this does not look like text' instead of guessing a charset", () => {
    const binary = new Uint8Array(64);
    for (let i = 0; i < binary.length; i += 1) {
      binary[i] = i % 5 === 0 ? 0x00 : i % 7 === 0 ? 0x01 : 0x41 + (i % 20);
    }
    const r = detectEncoding(binary);
    expect(r.primary.encoding).toBe("binary");
    expect(r.warning).toMatch(/Binary content suspected/);
  });

  it("treats an empty sample as nothing to detect, not as an error", () => {
    const r = detectEncoding(new Uint8Array(0));
    expect(r.candidates).toEqual([]);
    expect(r.primary.confidence).toBe(0);
    expect(r.warning).toMatch(/Empty input/);
  });
});

/* ── mojibake recovery (the §1 "renders as mojibake" pain) ─────────────── */

describe("mojibake", () => {
  it("recovers UTF-8 text that was pasted after being decoded as Latin-1", () => {
    // 你好 is E4 BD A0 E5 A5 BD in UTF-8; read as Latin-1 those bytes render as
    // U+00E4 U+00BD U+00A0 U+00E5 U+00A5 U+00BD.
    const pasted = String.fromCharCode(0xe4, 0xbd, 0xa0, 0xe5, 0xa5, 0xbd);
    const r = run({ text: pasted });
    expect(r.mojibake?.suspected).toBe(true);
    expect(r.mojibake?.recovered).toBe("你好");
    expect(r.warning).toMatch(/Mojibake/);
  });

  it("does not cry mojibake on ordinary CJK text", () => {
    expect(run({ text: "你好世界，这是一段正常的中文。" }).mojibake).toBeUndefined();
  });

  it("does not cry mojibake on plain ASCII", () => {
    expect(run({ text: "just plain english text, nothing unusual here" }).mojibake).toBeUndefined();
  });
});

/* ── sampling (know-how #5b) ───────────────────────────────────────────── */

describe("sampling", () => {
  it("analyses only the leading window and reports both sizes", () => {
    const r = run({ text: "a".repeat(1_000), sampleBytes: 100 });
    expect(r.byteStats.totalBytes).toBe(100);
    expect(r.sourceBytes).toBe(1_000);
    expect(r.sampled).toBe(true);
  });

  it("reports sampled=false when the whole input fits the window", () => {
    const r = run({ text: "a".repeat(100), sampleBytes: 1_000 });
    expect(r.sampled).toBe(false);
    expect(r.sourceBytes).toBe(100);
  });

  it("does not blame the file when the sample window cuts a sequence in half", () => {
    // Two out of every three cut points land inside a 3-byte CJK sequence. If a
    // truncated tail counts as malformed UTF-8, UTF-8 leaves the candidate list
    // and GB18030 takes the verdict — the tool's headline question, answered
    // backwards, on every UTF-8 Chinese file larger than the window.
    const source = utf8("中文测试内容".repeat(50));
    const cut = source.subarray(0, 100); // 100 % 3 !== 0 → mid-sequence
    const r = detectEncoding(cut, { sourceBytes: source.length });
    expect(r.primary.encoding).toBe("UTF-8");
    expect(confidenceOf(r, "UTF-8")).toBeGreaterThan(confidenceOf(r, "GB18030") ?? 0);
  });

  it("still rejects a truncated sequence when the input is the whole file", () => {
    // Same bytes, no sourceBytes: nothing was cut off, so the file really is
    // malformed and UTF-8 must not be offered.
    const whole = u8(...utf8("padding padding padding padding "), 0xe4, 0xbd);
    expect(confidenceOf(detectEncoding(whole), "UTF-8")).toBeUndefined();
  });

  it("keeps a sampled GBK file on GB18030 — tail tolerance is not a UTF-8 thumb", () => {
    const source = rep([0xd6, 0xd0, 0xce, 0xc4, 0xb2, 0xe2, 0xca, 0xd4], 40);
    const r = detectEncoding(source.subarray(0, 101), { sourceBytes: source.length });
    expect(r.primary.encoding).toBe("GB18030");
  });
});

/* ── schema contract ───────────────────────────────────────────────────── */

describe("input schema", () => {
  const schema = encodingDetectTool.inputSchema;

  it("defaults the detection window to 256 KiB", () => {
    expect(schema.parse({ text: "hi" }).sampleBytes).toBe(262_144);
  });

  it("rejects an input with neither text nor fileBase64", () => {
    expect(schema.safeParse({}).success).toBe(false);
  });

  it("rejects an input with both text and fileBase64", () => {
    expect(schema.safeParse({ text: "hi", fileBase64: "aGk=" }).success).toBe(false);
  });

  it("rejects a sampleBytes below the minimum window", () => {
    expect(schema.safeParse({ text: "hi", sampleBytes: 4 }).success).toBe(false);
  });

  it("rejects a sampleBytes above the maximum window", () => {
    expect(schema.safeParse({ text: "hi", sampleBytes: 99_999_999 }).success).toBe(false);
  });

  it("rejects a non-integer sampleBytes", () => {
    expect(schema.safeParse({ text: "hi", sampleBytes: 1_024.5 }).success).toBe(false);
  });

  it("accepts a base64 file payload, data-URL prefix included", () => {
    const base64 = Buffer.from(u8(0xef, 0xbb, 0xbf, 0x68, 0x69)).toString("base64");
    const r = run({ fileBase64: `data:text/plain;base64,${base64}`, filename: "notes.txt" });
    expect(r.primary.encoding).toBe("UTF-8");
    expect(r.primary.bomDetected).toBe(true);
  });
});

/* ── tool metadata (ship gates 5, 6, 10) ───────────────────────────────── */

describe("tool metadata", () => {
  it("is declared pure, with the detector root and a real meter id", () => {
    expect(encodingDetectTool.sideEffect).toBe("pure");
    expect(encodingDetectTool.id).toBe("text/encoding-detect");
    expect(encodingDetectTool.slug).toBe("encoding-detect");
    expect(encodingDetectTool.meterId).toBe("forge.text.encoding_detect");
    expect(encodingDetectTool.roots).toContain("detector");
  });

  it("names the specifications it implements, not a library it does not use", () => {
    expect(encodingDetectTool.engine.upstream).toMatch(/RFC 3629/);
    expect(encodingDetectTool.engine.upstream).toMatch(/GB 18030-2022/);
  });

  it("is bilingual in title, description and SEO keywords", () => {
    for (const field of ["title", "description", "seoKeywords"] as const) {
      expect(encodingDetectTool[field].zh.length).toBeGreaterThan(0);
      expect(encodingDetectTool[field].en.length).toBeGreaterThan(0);
    }
  });

  it("stays read-only: no converted bytes in the output", () => {
    const r = run({ text: "你好世界，这是一个用于编码检测的测试文件。" });
    expect(Object.keys(r)).not.toContain("converted");
    expect(Object.keys(r)).not.toContain("output");
  });

  it("is deterministic for the same input", () => {
    const input = { text: "你好世界，这是一个用于编码检测的测试文件。\r\n" };
    expect(run(input)).toEqual(run(input));
  });
});
